from fastapi import APIRouter, Depends
from sqlalchemy import func
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
from app.routers.profiles import _compute_candidate_completion
from app.security import require_candidate, require_recruiter
from app.services.matching_engine import matcher_service

router = APIRouter(prefix="/api/dashboard", tags=["Dashboards"])


@router.get("/recruiter")
def get_recruiter_dashboard(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Return 100% database-driven statistics and recent activity for the recruiter."""
    recruiter_jobs = (
        db.query(Job)
        .filter(Job.recruiter_id == current_user.id)
        .order_by(Job.created_at.desc())
        .all()
    )
    job_ids = [j.id for j in recruiter_jobs]
    active_jobs_count = sum(1 for j in recruiter_jobs if j.status == JobStatus.ACTIVE)

    apps = []
    if job_ids:
        apps = (
            db.query(Application)
            .filter(Application.job_id.in_(job_ids))
            .order_by(Application.applied_at.desc())
            .all()
        )

    status_counts = {s.value: 0 for s in ApplicationStatus}
    resume_ids_seen = set()
    scores = []

    for app_obj in apps:
        status_counts[app_obj.status.value] = status_counts.get(app_obj.status.value, 0) + 1
        if app_obj.resume_id:
            resume_ids_seen.add(app_obj.resume_id)
        if app_obj.match_score is not None:
            scores.append(app_obj.match_score)

    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    # Match score distribution buckets (real DB data)
    buckets = {
        "80_100": sum(1 for s in scores if s >= 80),
        "60_79": sum(1 for s in scores if 60 <= s < 80),
        "40_59": sum(1 for s in scores if 40 <= s < 60),
        "0_39": sum(1 for s in scores if s < 40),
    }

    recent_applications = []
    for a in apps[:6]:
        recent_applications.append(
            {
                "id": a.id,
                "job_id": a.job_id,
                "job_title": a.job.title if a.job else "",
                "candidate_id": a.candidate_id,
                "candidate_reference": f"CAND-{a.candidate_id:04d}",
                "candidate_name": a.candidate.full_name if a.candidate else "",
                "match_score": a.match_score,
                "status": a.status.value,
                "applied_at": a.applied_at,
            }
        )

    app_counts_by_job = {}
    for a in apps:
        app_counts_by_job[a.job_id] = app_counts_by_job.get(a.job_id, 0) + 1

    recent_jobs = []
    for j in recruiter_jobs[:5]:
        job_scores = [a.match_score for a in apps if a.job_id == j.id and a.match_score is not None]
        recent_jobs.append(
            {
                "id": j.id,
                "title": j.title,
                "company_name": j.company_name,
                "location": j.location,
                "status": j.status.value,
                "application_count": app_counts_by_job.get(j.id, 0),
                "avg_match_score": round(sum(job_scores) / len(job_scores), 1) if job_scores else None,
                "created_at": j.created_at,
            }
        )

    return {
        "stats": {
            "total_jobs": len(recruiter_jobs),
            "active_jobs": active_jobs_count,
            "total_applications": len(apps),
            "total_resumes_received": len(resume_ids_seen),
            "under_review": status_counts.get(ApplicationStatus.UNDER_REVIEW.value, 0),
            "shortlisted": status_counts.get(ApplicationStatus.SHORTLISTED.value, 0),
            "interview": status_counts.get(ApplicationStatus.INTERVIEW.value, 0),
            "selected": status_counts.get(ApplicationStatus.SELECTED.value, 0),
            "rejected": status_counts.get(ApplicationStatus.REJECTED.value, 0),
            "avg_match_score": avg_score,
        },
        "status_distribution": status_counts,
        "match_distribution": buckets,
        "recent_applications": recent_applications,
        "recent_jobs": recent_jobs,
    }


@router.get("/candidate")
def get_candidate_dashboard(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Return 100% database-driven statistics, activity, and live job matches for the candidate."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    profile_completion = _compute_candidate_completion(profile) if profile else 0

    resumes = (
        db.query(Resume)
        .filter(Resume.candidate_id == current_user.id)
        .order_by(Resume.is_primary.desc(), Resume.created_at.desc())
        .all()
    )
    primary_resume = resumes[0] if resumes else None

    available_jobs = (
        db.query(Job)
        .filter(Job.status == JobStatus.ACTIVE)
        .order_by(Job.created_at.desc())
        .all()
    )

    my_apps = (
        db.query(Application)
        .filter(Application.candidate_id == current_user.id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    applied_job_ids = {a.job_id for a in my_apps}

    under_review = sum(1 for a in my_apps if a.status == ApplicationStatus.UNDER_REVIEW)
    shortlisted = sum(
        1
        for a in my_apps
        if a.status in (ApplicationStatus.SHORTLISTED, ApplicationStatus.INTERVIEW, ApplicationStatus.SELECTED)
    )

    app_scores = [a.match_score for a in my_apps if a.match_score is not None]
    best_match_score = max(app_scores) if app_scores else None

    recommended_jobs = []
    if primary_resume:
        for job in available_jobs[:12]:
            eval_res = matcher_service.evaluate(
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
                    "raw_text": primary_resume.raw_text,
                    "masked_text": primary_resume.masked_text,
                    "extracted_skills": primary_resume.extracted_skills or [],
                    "extracted_education": primary_resume.extracted_education or [],
                    "extracted_experience": primary_resume.extracted_experience or [],
                },
            )
            recommended_jobs.append(
                {
                    "id": job.id,
                    "title": job.title,
                    "company_name": job.company_name,
                    "location": job.location,
                    "employment_type": job.employment_type,
                    "experience_required": job.experience_required,
                    "required_skills": job.required_skills or [],
                    "already_applied": job.id in applied_job_ids,
                    "match_score": eval_res["overall_score"],
                    "matched_skills": eval_res["matched_skills"],
                    "missing_skills": eval_res["missing_skills"],
                    "skills_score": eval_res["skills_score"],
                    "experience_score": eval_res["experience_score"],
                    "description_score": eval_res["description_score"],
                    "education_score": eval_res["education_score"],
                }
            )
        recommended_jobs.sort(key=lambda x: x["match_score"], reverse=True)
        if recommended_jobs and (best_match_score is None or recommended_jobs[0]["match_score"] > best_match_score):
            best_match_score = recommended_jobs[0]["match_score"]
    else:
        for job in available_jobs[:5]:
            recommended_jobs.append(
                {
                    "id": job.id,
                    "title": job.title,
                    "company_name": job.company_name,
                    "location": job.location,
                    "employment_type": job.employment_type,
                    "experience_required": job.experience_required,
                    "required_skills": job.required_skills or [],
                    "already_applied": job.id in applied_job_ids,
                    "match_score": None,
                    "matched_skills": [],
                    "missing_skills": [],
                }
            )

    recent_applications = [
        {
            "id": a.id,
            "job_id": a.job_id,
            "job_title": a.job.title if a.job else "",
            "company_name": a.job.company_name if a.job else "",
            "status": a.status.value,
            "match_score": a.match_score,
            "applied_at": a.applied_at,
            "updated_at": a.updated_at,
        }
        for a in my_apps[:6]
    ]

    return {
        "stats": {
            "profile_completion": profile_completion,
            "uploaded_resumes": len(resumes),
            "available_jobs": len(available_jobs),
            "applications_submitted": len(my_apps),
            "under_review": under_review,
            "shortlisted": shortlisted,
            "best_match_score": best_match_score,
        },
        "primary_resume": {
            "id": primary_resume.id,
            "original_filename": primary_resume.original_filename,
            "extracted_skills": primary_resume.extracted_skills or [],
        }
        if primary_resume
        else None,
        "recommended_jobs": recommended_jobs[:5],
        "recent_applications": recent_applications,
    }
