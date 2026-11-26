from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    Application,
    ApplicationStatus,
    CandidateProfile,
    Job,
    JobStatus,
    Resume,
    User,
)
from app.schemas.schemas import (
    ApplicationCreate,
    ApplicationOut,
    ApplicationStatusUpdate,
)
from app.security import require_candidate, require_recruiter
from app.services.matching_engine import matcher_service
from app.services.notification_service import create_notification

router = APIRouter(tags=["Applications"])


def _serialize_application(app_obj: Application, db: Session, include_candidate: bool = True) -> dict:
    job = app_obj.job
    resume = app_obj.resume
    cand = app_obj.candidate

    job_summary = None
    if job:
        job_summary = {
            "id": job.id,
            "title": job.title,
            "company_name": job.company_name,
            "location": job.location,
            "employment_type": job.employment_type,
            "experience_required": job.experience_required,
            "required_skills": job.required_skills or [],
            "preferred_skills": job.preferred_skills or [],
            "status": job.status.value,
        }

    resume_summary = None
    if resume:
        resume_summary = {
            "id": resume.id,
            "original_filename": resume.original_filename,
            "file_type": resume.file_type,
            "extracted_skills": resume.extracted_skills or [],
            "extracted_education": resume.extracted_education or [],
            "extracted_experience": resume.extracted_experience or [],
            "extracted_certifications": resume.extracted_certifications or [],
            "extracted_name": resume.extracted_name,
            "extracted_email": resume.extracted_email,
            "extracted_phone": resume.extracted_phone,
            "raw_text": resume.raw_text,
            "masked_text": resume.masked_text,
            "extraction_notes": resume.extraction_notes or [],
        }

    cand_summary = None
    if include_candidate and cand:
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == cand.id).first()
        cand_summary = {
            "id": cand.id,
            "full_name": cand.full_name,
            "email": cand.email,
            "reference_code": f"CAND-{cand.id:04d}",
            "headline": profile.headline if profile else "",
            "location": profile.location if profile else "",
            "phone": profile.phone if profile else "",
            "skills": profile.skills if profile else [],
            "education": profile.education if profile else [],
            "experience": profile.experience if profile else [],
            "certifications": profile.certifications if profile else [],
            "portfolio_url": profile.portfolio_url if profile else "",
            "linkedin_url": profile.linkedin_url if profile else "",
        }

    return {
        "id": app_obj.id,
        "job_id": app_obj.job_id,
        "candidate_id": app_obj.candidate_id,
        "resume_id": app_obj.resume_id,
        "status": app_obj.status,
        "cover_note": app_obj.cover_note,
        "recruiter_notes": app_obj.recruiter_notes,
        "match_score": app_obj.match_score,
        "match_details": app_obj.match_details or {},
        "applied_at": app_obj.applied_at,
        "updated_at": app_obj.updated_at,
        "job": job_summary,
        "candidate": cand_summary,
        "resume": resume_summary,
    }


@router.post("/api/jobs/{job_id}/apply", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def apply_for_job(
    job_id: int,
    payload: ApplicationCreate,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Apply to an active job using one of the candidate's uploaded resumes."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status != JobStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Cannot apply to an inactive job posting.")

    existing = (
        db.query(Application)
        .filter(Application.job_id == job_id, Application.candidate_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already applied for this job.",
        )

    if payload.resume_id is not None:
        resume = (
            db.query(Resume)
            .filter(Resume.id == payload.resume_id, Resume.candidate_id == current_user.id)
            .first()
        )
        if not resume:
            raise HTTPException(status_code=404, detail="Selected resume not found.")
    else:
        resume = (
            db.query(Resume)
            .filter(Resume.candidate_id == current_user.id)
            .order_by(Resume.is_primary.desc(), Resume.created_at.desc())
            .first()
        )
        if not resume:
            raise HTTPException(
                status_code=400,
                detail="Please upload a resume (PDF or DOCX) before applying to a job.",
            )

    # Compute explainable match result at submission time
    match_result = matcher_service.evaluate(
        job_data={
            "title": job.title,
            "description": job.description,
            "experience_required": job.experience_required,
            "min_experience_years": job.min_experience_years,
            "required_skills": job.required_skills or [],
            "preferred_skills": job.preferred_skills or [],
            "educational_requirements": job.educational_requirements,
        },
        resume_data={
            "raw_text": resume.raw_text,
            "masked_text": resume.masked_text,
            "extracted_skills": resume.extracted_skills or [],
            "extracted_education": resume.extracted_education or [],
            "extracted_experience": resume.extracted_experience or [],
        },
    )

    application = Application(
        job_id=job.id,
        candidate_id=current_user.id,
        resume_id=resume.id,
        status=ApplicationStatus.APPLIED,
        cover_note=(payload.cover_note or "").strip(),
        match_score=match_result["overall_score"],
        match_details=match_result,
    )
    db.add(application)
    db.flush()

    create_notification(
        db=db,
        user_id=current_user.id,
        title="Application Submitted",
        message=f"Your application for '{job.title}' at {job.company_name} has been submitted.",
        notif_type="application_submitted",
        related_id=application.id,
    )
    create_notification(
        db=db,
        user_id=job.recruiter_id,
        title="New Candidate Application",
        message=f"{current_user.full_name} applied for '{job.title}' (Match Score: {match_result['overall_score']}%).",
        notif_type="new_application",
        related_id=application.id,
    )

    db.commit()
    db.refresh(application)
    return _serialize_application(application, db)


@router.get("/api/applications/my", response_model=List[ApplicationOut])
def get_my_applications(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """List all applications submitted by the authenticated candidate."""
    apps = (
        db.query(Application)
        .filter(Application.candidate_id == current_user.id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    return [_serialize_application(a, db, include_candidate=False) for a in apps]


@router.delete("/api/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def withdraw_application(
    application_id: int,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Allow a candidate to withdraw their own application."""
    app_obj = (
        db.query(Application)
        .filter(Application.id == application_id, Application.candidate_id == current_user.id)
        .first()
    )
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found.")
    if app_obj.status == ApplicationStatus.SELECTED:
        raise HTTPException(status_code=400, detail="Cannot withdraw a selected application.")

    job = app_obj.job
    if job:
        create_notification(
            db=db,
            user_id=job.recruiter_id,
            title="Application Withdrawn",
            message=f"{current_user.full_name} withdrew their application for '{job.title}'.",
            notif_type="system",
            related_id=job.id,
        )

    db.delete(app_obj)
    db.commit()
    return None


@router.get("/api/jobs/{job_id}/applications", response_model=List[ApplicationOut])
def get_job_applications(
    job_id: int,
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    sort_by: str = Query("score_desc"),
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """List and rank applications for a specific job owned by the recruiter."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view applications for your own jobs.")

    query = db.query(Application).filter(Application.job_id == job_id)
    if status_filter:
        query = query.filter(Application.status == status_filter)

    if sort_by == "score_asc":
        query = query.order_by(Application.match_score.asc(), Application.applied_at.desc())
    elif sort_by == "newest":
        query = query.order_by(Application.applied_at.desc())
    else:
        query = query.order_by(Application.match_score.desc(), Application.applied_at.desc())

    apps = query.all()
    return [_serialize_application(a, db) for a in apps]


@router.get("/api/applications/recruiter", response_model=List[ApplicationOut])
def get_recruiter_applications(
    job_id: Optional[int] = Query(None),
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    min_score: Optional[float] = Query(None, ge=0, le=100),
    search: Optional[str] = Query(None),
    sort_by: str = Query("score_desc"),
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """List all applications across the recruiter's jobs with filtering and sorting."""
    query = (
        db.query(Application)
        .join(Job, Application.job_id == Job.id)
        .filter(Job.recruiter_id == current_user.id)
    )
    if job_id is not None:
        query = query.filter(Application.job_id == job_id)
    if status_filter is not None:
        query = query.filter(Application.status == status_filter)
    if min_score is not None:
        query = query.filter(Application.match_score >= min_score)

    if sort_by == "score_asc":
        query = query.order_by(Application.match_score.asc(), Application.applied_at.desc())
    elif sort_by == "newest":
        query = query.order_by(Application.applied_at.desc())
    else:
        query = query.order_by(Application.match_score.desc(), Application.applied_at.desc())

    apps = query.all()
    serialized = [_serialize_application(a, db) for a in apps]

    if search and search.strip():
        term = search.strip().lower()
        serialized = [
            item
            for item in serialized
            if term in (item["candidate"]["full_name"] or "").lower()
            or term in (item["candidate"]["reference_code"] or "").lower()
            or term in (item["job"]["title"] or "").lower()
            or any(term in s.lower() for s in (item["resume"]["extracted_skills"] if item["resume"] else []))
        ]

    return serialized


@router.patch("/api/applications/{application_id}/status", response_model=ApplicationOut)
def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Update an application's status (human recruiter decision) and notify the candidate."""
    app_obj = db.query(Application).filter(Application.id == application_id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found.")

    job = db.query(Job).filter(Job.id == app_obj.job_id).first()
    if not job or job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update applications for your own jobs.")

    old_status = app_obj.status
    app_obj.status = payload.status
    if payload.recruiter_notes is not None:
        app_obj.recruiter_notes = payload.recruiter_notes.strip()

    if old_status != payload.status:
        create_notification(
            db=db,
            user_id=app_obj.candidate_id,
            title="Application Status Updated",
            message=f"Your application for '{job.title}' at {job.company_name} is now '{payload.status.value}'.",
            notif_type="status_updated",
            related_id=app_obj.id,
        )

    db.commit()
    db.refresh(app_obj)
    return _serialize_application(app_obj, db)
