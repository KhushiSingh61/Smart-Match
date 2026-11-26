from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.models import ApplicationStatus, JobStatus, UserRole


# ---- Auth ----
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole
    company_name: Optional[str] = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- Profiles ----
class RecruiterProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None


class CandidateProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    headline: Optional[str] = None
    education: Optional[List[Any]] = None
    experience: Optional[List[Any]] = None
    skills: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    bio: Optional[str] = None


class ProfileMeOut(BaseModel):
    user: UserOut
    profile: Dict[str, Any]
    completion_percentage: int


# ---- Jobs ----
class JobCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    company_name: str = Field(..., min_length=1, max_length=255)
    location: str = Field(..., min_length=1, max_length=255)
    employment_type: str = "Full-time"
    experience_required: str = ""
    min_experience_years: float = 0.0
    salary_range: Optional[str] = ""
    description: str = Field(..., min_length=10)
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    educational_requirements: str = ""
    status: JobStatus = JobStatus.ACTIVE


class JobUpdate(BaseModel):
    title: Optional[str] = None
    company_name: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    experience_required: Optional[str] = None
    min_experience_years: Optional[float] = None
    salary_range: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    educational_requirements: Optional[str] = None
    status: Optional[JobStatus] = None


class JobOut(BaseModel):
    id: int
    recruiter_id: int
    title: str
    company_name: str
    location: str
    employment_type: str
    experience_required: str
    min_experience_years: float
    salary_range: Optional[str]
    description: str
    required_skills: List[str]
    preferred_skills: List[str]
    educational_requirements: str
    status: JobStatus
    application_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---- Resumes ----
class ResumeOut(BaseModel):
    id: int
    candidate_id: int
    original_filename: str
    file_type: str
    file_size_bytes: int
    is_primary: bool
    extracted_name: Optional[str]
    extracted_email: Optional[str]
    extracted_phone: Optional[str]
    extracted_education: List[str]
    extracted_experience: List[str]
    extracted_skills: List[str]
    extracted_certifications: List[str]
    raw_text: str
    masked_text: str
    extraction_notes: List[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---- Applications ----
class ApplicationCreate(BaseModel):
    resume_id: Optional[int] = None
    cover_note: Optional[str] = ""


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    recruiter_notes: Optional[str] = None


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    resume_id: Optional[int]
    status: ApplicationStatus
    cover_note: str
    recruiter_notes: str
    match_score: Optional[float]
    match_details: Dict[str, Any]
    applied_at: datetime
    updated_at: datetime
    job: Optional[Dict[str, Any]] = None
    candidate: Optional[Dict[str, Any]] = None
    resume: Optional[Dict[str, Any]] = None


# ---- Matching ----
class MatchWeights(BaseModel):
    skills: float = Field(0.40, ge=0.0, le=1.0)
    experience: float = Field(0.30, ge=0.0, le=1.0)
    description: float = Field(0.20, ge=0.0, le=1.0)
    education: float = Field(0.10, ge=0.0, le=1.0)


class MatchAnalyzeRequest(BaseModel):
    job_id: int
    resume_id: Optional[int] = None
    application_id: Optional[int] = None
    weights: Optional[MatchWeights] = None


# ---- Notifications ----
class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    related_id: Optional[int]
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
