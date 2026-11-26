from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Application, Job, JobStatus, User, UserRole
from app.schemas.schemas import JobCreate, JobOut, JobUpdate
from app.security import get_current_user, require_recruiter
from app.services.skills_dictionary import normalize_skill_list

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


def _to_job_out(job: Job, app_count: int = 0) -> JobOut:
    return JobOut(
        id=job.id,
        recruiter_id=job.recruiter_id,
        title=job.title,
        company_name=job.company_name,
        location=job.location,
        employment_type=job.employment_type,
        experience_required=job.experience_required,
        min_experience_years=job.min_experience_years,
        salary_range=job.salary_range,
        description=job.description,
        required_skills=job.required_skills or [],
        preferred_skills=job.preferred_skills or [],
        educational_requirements=job.educational_requirements,
        status=job.status,
        application_count=app_count,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Create a new job posting (Recruiters only)."""
    job = Job(
        recruiter_id=current_user.id,
        title=payload.title.strip(),
        company_name=payload.company_name.strip(),
        location=payload.location.strip(),
        employment_type=payload.employment_type.strip(),
        experience_required=payload.experience_required.strip(),
        min_experience_years=max(0.0, payload.min_experience_years),
        salary_range=(payload.salary_range or "").strip(),
        description=payload.description.strip(),
        required_skills=normalize_skill_list(payload.required_skills),
        preferred_skills=normalize_skill_list(payload.preferred_skills),
        educational_requirements=payload.educational_requirements.strip(),
        status=payload.status,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return _to_job_out(job, 0)


@router.get("", response_model=List[JobOut])
def list_jobs(
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    experience: Optional[str] = Query(None),
    employment_type: Optional[str] = Query(None),
    status_filter: Optional[JobStatus] = Query(None, alias="status"),
    mine: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List jobs.
    - Candidates see only active jobs.
    - Recruiters with mine=true see all of their own jobs (active and inactive).
    - Recruiters without mine=true see active jobs (plus their own).
    """
    query = db.query(Job)

    if mine:
        if current_user.role != UserRole.RECRUITER:
            raise HTTPException(status_code=403, detail="Only recruiters can filter by their posted jobs.")
        query = query.filter(Job.recruiter_id == current_user.id)
        if status_filter:
            query = query.filter(Job.status == status_filter)
    else:
        if current_user.role == UserRole.CANDIDATE:
            query = query.filter(Job.status == JobStatus.ACTIVE)
        elif status_filter:
            query = query.filter(Job.status == status_filter)
        else:
            query = query.filter(Job.status == JobStatus.ACTIVE)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(Job.title).like(term)
            | func.lower(Job.company_name).like(term)
            | func.lower(Job.description).like(term)
        )

    if location and location.strip():
        loc_term = f"%{location.strip().lower()}%"
        query = query.filter(func.lower(Job.location).like(loc_term))

    if employment_type and employment_type.strip():
        query = query.filter(func.lower(Job.employment_type) == employment_type.strip().lower())

    if experience and experience.strip():
        exp_term = f"%{experience.strip().lower()}%"
        query = query.filter(func.lower(Job.experience_required).like(exp_term))

    jobs = query.order_by(Job.created_at.desc()).all()

    if skill and skill.strip():
        skill_lower = skill.strip().lower()
        jobs = [
            j
            for j in jobs
            if any(skill_lower in s.lower() for s in (j.required_skills or []) + (j.preferred_skills or []))
        ]

    # Attach application counts in a single grouped query
    job_ids = [j.id for j in jobs]
    counts_map = {}
    if job_ids:
        rows = (
            db.query(Application.job_id, func.count(Application.id))
            .filter(Application.job_id.in_(job_ids))
            .group_by(Application.job_id)
            .all()
        )
        counts_map = {jid: cnt for jid, cnt in rows}

    return [_to_job_out(j, counts_map.get(j.id, 0)) for j in jobs]


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch a single job posting."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status != JobStatus.ACTIVE and job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="This job posting is currently inactive.")

    app_count = db.query(func.count(Application.id)).filter(Application.job_id == job.id).scalar() or 0
    return _to_job_out(job, app_count)


@router.put("/{job_id}", response_model=JobOut)
def update_job(
    job_id: int,
    payload: JobUpdate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Update an existing job posting owned by the authenticated recruiter."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own job postings.")

    if payload.title is not None:
        job.title = payload.title.strip()
    if payload.company_name is not None:
        job.company_name = payload.company_name.strip()
    if payload.location is not None:
        job.location = payload.location.strip()
    if payload.employment_type is not None:
        job.employment_type = payload.employment_type.strip()
    if payload.experience_required is not None:
        job.experience_required = payload.experience_required.strip()
    if payload.min_experience_years is not None:
        job.min_experience_years = max(0.0, payload.min_experience_years)
    if payload.salary_range is not None:
        job.salary_range = payload.salary_range.strip()
    if payload.description is not None:
        job.description = payload.description.strip()
    if payload.required_skills is not None:
        job.required_skills = normalize_skill_list(payload.required_skills)
    if payload.preferred_skills is not None:
        job.preferred_skills = normalize_skill_list(payload.preferred_skills)
    if payload.educational_requirements is not None:
        job.educational_requirements = payload.educational_requirements.strip()
    if payload.status is not None:
        job.status = payload.status

    db.commit()
    db.refresh(job)
    app_count = db.query(func.count(Application.id)).filter(Application.job_id == job.id).scalar() or 0
    return _to_job_out(job, app_count)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Delete a job posting owned by the authenticated recruiter."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own job postings.")

    db.delete(job)
    db.commit()
    return None
