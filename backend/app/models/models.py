import enum
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    RECRUITER = "recruiter"
    CANDIDATE = "candidate"


class JobStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class ApplicationStatus(str, enum.Enum):
    APPLIED = "Applied"
    UNDER_REVIEW = "Under Review"
    SHORTLISTED = "Shortlisted"
    INTERVIEW = "Interview"
    SELECTED = "Selected"
    REJECTED = "Rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    recruiter_profile = relationship(
        "RecruiterProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    candidate_profile = relationship(
        "CandidateProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    jobs = relationship("Job", back_populates="recruiter", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="candidate", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class RecruiterProfile(Base):
    __tablename__ = "recruiter_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String(255), default="", nullable=False)
    company_website = Column(String(500), default="", nullable=False)
    job_title = Column(String(255), default="", nullable=False)
    location = Column(String(255), default="", nullable=False)
    phone = Column(String(50), default="", nullable=False)
    bio = Column(Text, default="", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="recruiter_profile")


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String(255), default="", nullable=False)
    phone = Column(String(50), default="", nullable=False)
    location = Column(String(255), default="", nullable=False)
    headline = Column(String(255), default="", nullable=False)
    education = Column(JSON, default=list, nullable=False)
    experience = Column(JSON, default=list, nullable=False)
    skills = Column(JSON, default=list, nullable=False)
    certifications = Column(JSON, default=list, nullable=False)
    portfolio_url = Column(String(500), default="", nullable=False)
    linkedin_url = Column(String(500), default="", nullable=False)
    bio = Column(Text, default="", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="candidate_profile")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False, index=True)
    employment_type = Column(String(100), default="Full-time", nullable=False)
    experience_required = Column(String(100), default="", nullable=False)
    min_experience_years = Column(Float, default=0.0, nullable=False)
    salary_range = Column(String(150), default="", nullable=True)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list, nullable=False)
    preferred_skills = Column(JSON, default=list, nullable=False)
    educational_requirements = Column(String(500), default="", nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.ACTIVE, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    recruiter = relationship("User", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), unique=True, nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    extracted_name = Column(String(255), nullable=True)
    extracted_email = Column(String(255), nullable=True)
    extracted_phone = Column(String(100), nullable=True)
    extracted_education = Column(JSON, default=list, nullable=False)
    extracted_experience = Column(JSON, default=list, nullable=False)
    extracted_skills = Column(JSON, default=list, nullable=False)
    extracted_certifications = Column(JSON, default=list, nullable=False)
    raw_text = Column(Text, default="", nullable=False)
    masked_text = Column(Text, default="", nullable=False)
    extraction_notes = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    candidate = relationship("User", back_populates="resumes")
    applications = relationship("Application", back_populates="resume")


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("job_id", "candidate_id", name="uq_job_candidate_application"),
    )

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.APPLIED, nullable=False, index=True)
    cover_note = Column(Text, default="", nullable=False)
    recruiter_notes = Column(Text, default="", nullable=False)
    match_score = Column(Float, nullable=True)
    match_details = Column(JSON, default=dict, nullable=False)
    applied_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    job = relationship("Job", back_populates="applications")
    candidate = relationship("User", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")


class MatchAnalysis(Base):
    __tablename__ = "match_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    overall_score = Column(Float, nullable=False)
    skills_score = Column(Float, nullable=False)
    experience_score = Column(Float, nullable=False)
    description_score = Column(Float, nullable=False)
    education_score = Column(Float, nullable=False)
    weights_used = Column(JSON, default=dict, nullable=False)
    matched_skills = Column(JSON, default=list, nullable=False)
    missing_skills = Column(JSON, default=list, nullable=False)
    preferred_matched_skills = Column(JSON, default=list, nullable=False)
    relevant_sections = Column(JSON, default=list, nullable=False)
    skill_gap_suggestions = Column(JSON, default=list, nullable=False)
    explanation = Column(JSON, default=dict, nullable=False)
    bias_check = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(100), default="system", nullable=False)
    related_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")
