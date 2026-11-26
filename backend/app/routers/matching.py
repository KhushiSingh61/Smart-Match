from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    Application,
    Job,
    JobStatus,
    MatchAnalysis,
    Resume,
    User,
    UserRole,
)
from app.schemas.schemas import MatchAnalyzeRequest
from app.security import get_current_user, require_recruiter
from app.services.matching_engine import matcher_service
from app.services.skills_dictionary import get_skill_categories

router = APIRouter(prefix="/api/matching", tags=["Matching Engine"])


@router.get("/skills")
def list_skill_dictionary():
    """Return the extensible skill dictionary grouped by category."""
    return {"categories": get_skill_categories()}


@router.post("/analyze")
def analyze_match(
    payload: MatchAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Run an explainable TF-IDF + skill-dictionary match analysis between a job and a resume.
    Persists the MatchAnalysis result for retrieval via /api/matching/results/{id}.
    """
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if current_user.role == UserRole.CANDIDATE and job.status != JobStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="This job posting is not active.")

    resume: Optional[Resume] = None
    application: Optional[Application] = None

    if payload.application_id is not None:
        application = db.query(Application).filter(Application.id == payload.application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found.")
        if current_user.role == UserRole.CANDIDATE and application.candidate_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied.")
        if current_user.role == UserRole.RECRUITER and job.recruiter_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied.")
        if application.resume_id:
            resume = db.query(Resume).filter(Resume.id == application.resume_id).first()

    if resume is None:
        if payload.resume_id is not None:
            resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
            if not resume:
                raise HTTPException(status_code=404, detail="Resume not found.")
            if current_user.role == UserRole.CANDIDATE and resume.candidate_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied to this resume.")
            if current_user.role == UserRole.RECRUITER:
                if job.recruiter_id != current_user.id:
                    raise HTTPException(status_code=403, detail="Access denied.")
                linked_app = (
                    db.query(Application)
                    .filter(
                        Application.job_id == job.id,
                        Application.candidate_id == resume.candidate_id,
                    )
                    .first()
                )
                if not linked_app:
                    raise HTTPException(
                        status_code=403,
                        detail="Recruiters can only analyze resumes of candidates who applied to their jobs.",
                    )
        else:
            if current_user.role != UserRole.CANDIDATE:
                raise HTTPException(status_code=400, detail="resume_id or application_id is required.")
            resume = (
                db.query(Resume)
                .filter(Resume.candidate_id == current_user.id)
                .order_by(Resume.is_primary.desc(), Resume.created_at.desc())
                .first()
            )
            if not resume:
                raise HTTPException(
                    status_code=400,
                    detail="Please upload a resume first to view match insights.",
                )

    weights_dict = payload.weights.model_dump() if payload.weights else None
    result = matcher_service.evaluate(
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
        weights=weights_dict,
    )

    analysis = MatchAnalysis(
        user_id=current_user.id,
        job_id=job.id,
        resume_id=resume.id,
        overall_score=result["overall_score"],
        skills_score=result["skills_score"],
        experience_score=result["experience_score"],
        description_score=result["description_score"],
        education_score=result["education_score"],
        weights_used=result["weights_used"],
        matched_skills=result["matched_skills"],
        missing_skills=result["missing_skills"],
        preferred_matched_skills=result["preferred_matched_skills"],
        relevant_sections=result["relevant_sections"],
        skill_gap_suggestions=result["skill_gap_suggestions"],
        explanation=result["explanation"],
        bias_check=result["bias_check"],
    )
    db.add(analysis)

    if application is not None:
        application.match_score = result["overall_score"]
        application.match_details = result

    db.commit()
    db.refresh(analysis)

    return {
        "analysis_id": analysis.id,
        "job_id": job.id,
        "job_title": job.title,
        "company_name": job.company_name,
        "resume_id": resume.id,
        "resume_filename": resume.original_filename,
        "created_at": analysis.created_at,
        **result,
    }


@router.get("/results/{result_id}")
def get_matching_result(
    result_id: int,
    scope: Optional[str] = Query("analysis", description="'analysis' for a single analysis id, or 'job' for ranked candidates of a job id"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a persisted match analysis result or job-level candidate ranking."""
    if scope == "job":
        return rank_candidates_for_job(job_id=result_id, current_user=current_user, db=db)

    analysis = db.query(MatchAnalysis).filter(MatchAnalysis.id == result_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Match analysis result not found.")

    job = db.query(Job).filter(Job.id == analysis.job_id).first()
    resume = db.query(Resume).filter(Resume.id == analysis.resume_id).first()

    if current_user.role == UserRole.CANDIDATE and analysis.user_id != current_user.id and (not resume or resume.candidate_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied to this match analysis.")
    if current_user.role == UserRole.RECRUITER and (not job or job.recruiter_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied to this match analysis.")

    return {
        "analysis_id": analysis.id,
        "job_id": analysis.job_id,
        "job_title": job.title if job else "",
        "company_name": job.company_name if job else "",
        "resume_id": analysis.resume_id,
        "resume_filename": resume.original_filename if resume else "",
        "overall_score": analysis.overall_score,
        "skills_score": analysis.skills_score,
        "experience_score": analysis.experience_score,
        "description_score": analysis.description_score,
        "education_score": analysis.education_score,
        "weights_used": analysis.weights_used,
        "matched_skills": analysis.matched_skills,
        "missing_skills": analysis.missing_skills,
        "preferred_matched_skills": analysis.preferred_matched_skills,
        "relevant_sections": analysis.relevant_sections,
        "skill_gap_suggestions": analysis.skill_gap_suggestions,
        "explanation": analysis.explanation,
        "bias_check": analysis.bias_check,
        "created_at": analysis.created_at,
    }


@router.get("/job/{job_id}/rank")
def rank_candidates_for_job(
    job_id: int,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """
    Rank candidates who applied for a recruiter's job as a human decision-support aid.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only rank candidates for your own jobs.")

    apps = (
        db.query(Application)
        .filter(Application.job_id == job_id)
        .order_by(Application.match_score.desc(), Application.applied_at.asc())
        .all()
    )

    ranked = []
    for idx, app_obj in enumerate(apps, start=1):
        details = app_obj.match_details or {}
        ranked.append(
            {
                "rank": idx,
                "application_id": app_obj.id,
                "candidate_id": app_obj.candidate_id,
                "candidate_reference": f"CAND-{app_obj.candidate_id:04d}",
                "candidate_name": app_obj.candidate.full_name if app_obj.candidate else f"Candidate #{app_obj.candidate_id}",
                "job_id": job.id,
                "job_title": job.title,
                "resume_id": app_obj.resume_id,
                "resume_filename": app_obj.resume.original_filename if app_obj.resume else None,
                "overall_score": app_obj.match_score if app_obj.match_score is not None else 0.0,
                "skills_score": details.get("skills_score", 0.0),
                "experience_score": details.get("experience_score", 0.0),
                "description_score": details.get("description_score", 0.0),
                "education_score": details.get("education_score", 0.0),
                "matched_skills": details.get("matched_skills", []),
                "missing_skills": details.get("missing_skills", []),
                "status": app_obj.status.value,
                "applied_at": app_obj.applied_at,
                "bias_check": details.get("bias_check", {}),
                "explanation": details.get("explanation", {}),
            }
        )

    return {
        "job_id": job.id,
        "job_title": job.title,
        "company_name": job.company_name,
        "total_candidates": len(ranked),
        "decision_support_disclaimer": (
            "Ranking is ordered by explainable TF-IDF & skill-dictionary alignment to assist recruiter review. "
            "Human evaluation is required for all hiring decisions."
        ),
        "candidates": ranked,
    }
