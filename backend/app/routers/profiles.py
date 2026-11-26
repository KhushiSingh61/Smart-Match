from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import CandidateProfile, RecruiterProfile, User, UserRole
from app.schemas.schemas import (
    CandidateProfileUpdate,
    ProfileMeOut,
    RecruiterProfileUpdate,
    UserOut,
)
from app.security import get_current_user
from app.services.skills_dictionary import normalize_skill_list

router = APIRouter(prefix="/api/profiles", tags=["Profiles"])


def _compute_candidate_completion(profile: CandidateProfile) -> int:
    checks = [
        bool(profile.full_name and profile.full_name.strip()),
        bool(profile.phone and profile.phone.strip()),
        bool(profile.location and profile.location.strip()),
        bool(profile.headline and profile.headline.strip()),
        bool(profile.education and len(profile.education) > 0),
        bool(profile.experience and len(profile.experience) > 0),
        bool(profile.skills and len(profile.skills) > 0),
        bool(profile.certifications and len(profile.certifications) > 0),
        bool((profile.portfolio_url and profile.portfolio_url.strip()) or (profile.linkedin_url and profile.linkedin_url.strip())),
        bool(profile.bio and profile.bio.strip()),
    ]
    return int(round((sum(checks) / len(checks)) * 100))


def _compute_recruiter_completion(profile: RecruiterProfile, user: User) -> int:
    checks = [
        bool(user.full_name and user.full_name.strip()),
        bool(profile.company_name and profile.company_name.strip()),
        bool(profile.job_title and profile.job_title.strip()),
        bool(profile.location and profile.location.strip()),
        bool(profile.phone and profile.phone.strip()),
        bool(profile.company_website and profile.company_website.strip()),
        bool(profile.bio and profile.bio.strip()),
    ]
    return int(round((sum(checks) / len(checks)) * 100))


def _serialize_candidate_profile(profile: CandidateProfile) -> dict:
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "full_name": profile.full_name,
        "phone": profile.phone,
        "location": profile.location,
        "headline": profile.headline,
        "education": profile.education or [],
        "experience": profile.experience or [],
        "skills": profile.skills or [],
        "certifications": profile.certifications or [],
        "portfolio_url": profile.portfolio_url,
        "linkedin_url": profile.linkedin_url,
        "bio": profile.bio,
        "updated_at": profile.updated_at,
    }


def _serialize_recruiter_profile(profile: RecruiterProfile) -> dict:
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "company_name": profile.company_name,
        "company_website": profile.company_website,
        "job_title": profile.job_title,
        "location": profile.location,
        "phone": profile.phone,
        "bio": profile.bio,
        "updated_at": profile.updated_at,
    }


@router.get("/me", response_model=ProfileMeOut)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch the authenticated user's role-specific profile and completion score."""
    if current_user.role == UserRole.CANDIDATE:
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
        if not profile:
            profile = CandidateProfile(user_id=current_user.id, full_name=current_user.full_name)
            db.add(profile)
            db.commit()
            db.refresh(profile)
        return ProfileMeOut(
            user=UserOut.model_validate(current_user),
            profile=_serialize_candidate_profile(profile),
            completion_percentage=_compute_candidate_completion(profile),
        )

    profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == current_user.id).first()
    if not profile:
        profile = RecruiterProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return ProfileMeOut(
        user=UserOut.model_validate(current_user),
        profile=_serialize_recruiter_profile(profile),
        completion_percentage=_compute_recruiter_completion(profile, current_user),
    )


@router.put("/me", response_model=ProfileMeOut)
def update_my_profile(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's profile."""
    if current_user.role == UserRole.CANDIDATE:
        parsed = CandidateProfileUpdate(**payload)
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
        if not profile:
            profile = CandidateProfile(user_id=current_user.id)
            db.add(profile)

        if parsed.full_name is not None:
            cleaned_name = parsed.full_name.strip()
            if not cleaned_name:
                raise HTTPException(status_code=400, detail="Full name cannot be empty.")
            profile.full_name = cleaned_name
            current_user.full_name = cleaned_name
        if parsed.phone is not None:
            profile.phone = parsed.phone.strip()
        if parsed.location is not None:
            profile.location = parsed.location.strip()
        if parsed.headline is not None:
            profile.headline = parsed.headline.strip()
        if parsed.education is not None:
            profile.education = parsed.education
        if parsed.experience is not None:
            profile.experience = parsed.experience
        if parsed.skills is not None:
            profile.skills = normalize_skill_list(parsed.skills)
        if parsed.certifications is not None:
            profile.certifications = [c.strip() for c in parsed.certifications if str(c).strip()]
        if parsed.portfolio_url is not None:
            profile.portfolio_url = parsed.portfolio_url.strip()
        if parsed.linkedin_url is not None:
            profile.linkedin_url = parsed.linkedin_url.strip()
        if parsed.bio is not None:
            profile.bio = parsed.bio.strip()

        db.commit()
        db.refresh(profile)
        db.refresh(current_user)
        return ProfileMeOut(
            user=UserOut.model_validate(current_user),
            profile=_serialize_candidate_profile(profile),
            completion_percentage=_compute_candidate_completion(profile),
        )

    parsed_rec = RecruiterProfileUpdate(**payload)
    profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == current_user.id).first()
    if not profile:
        profile = RecruiterProfile(user_id=current_user.id)
        db.add(profile)

    if parsed_rec.full_name is not None and parsed_rec.full_name.strip():
        current_user.full_name = parsed_rec.full_name.strip()
    if parsed_rec.company_name is not None:
        profile.company_name = parsed_rec.company_name.strip()
    if parsed_rec.company_website is not None:
        profile.company_website = parsed_rec.company_website.strip()
    if parsed_rec.job_title is not None:
        profile.job_title = parsed_rec.job_title.strip()
    if parsed_rec.location is not None:
        profile.location = parsed_rec.location.strip()
    if parsed_rec.phone is not None:
        profile.phone = parsed_rec.phone.strip()
    if parsed_rec.bio is not None:
        profile.bio = parsed_rec.bio.strip()

    db.commit()
    db.refresh(profile)
    db.refresh(current_user)
    return ProfileMeOut(
        user=UserOut.model_validate(current_user),
        profile=_serialize_recruiter_profile(profile),
        completion_percentage=_compute_recruiter_completion(profile, current_user),
    )
