import os
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import Application, Job, Resume, User, UserRole
from app.schemas.schemas import ResumeOut
from app.security import get_current_user, require_candidate
from app.services.resume_parser import parse_resume_file

router = APIRouter(prefix="/api/resumes", tags=["Resumes"])

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def _validate_file_signature(content: bytes, ext: str) -> bool:
    """Verify file magic bytes match PDF or DOCX (ZIP) format."""
    if ext == ".pdf":
        return content.lstrip().startswith(b"%PDF")
    if ext == ".docx":
        return content.startswith(b"PK\x03\x04") or content.startswith(b"PK\x05\x06")
    return False


def _authorize_resume_access(resume: Resume, user: User, db: Session):
    """Ensure only the owning candidate or an authorized recruiter can access a resume."""
    if user.role == UserRole.CANDIDATE:
        if resume.candidate_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied to this resume.")
        return

    if user.role == UserRole.RECRUITER:
        # Recruiter may access only if the candidate applied to one of this recruiter's jobs
        has_access = (
            db.query(Application)
            .join(Job, Application.job_id == Job.id)
            .filter(
                Job.recruiter_id == user.id,
                Application.candidate_id == resume.candidate_id,
            )
            .first()
        )
        if not has_access:
            raise HTTPException(
                status_code=403,
                detail="Recruiters can only access resumes associated with applications to their jobs.",
            )
        return

    raise HTTPException(status_code=403, detail="Unauthorized access.")


@router.post("/upload", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    replace_resume_id: Optional[int] = Form(None),
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Upload a PDF or DOCX resume, validate it, store securely, and extract fields."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    safe_original_name = Path(file.filename).name
    ext = Path(safe_original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF (.pdf) and Word (.docx) files are supported.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    if not _validate_file_signature(content, ext):
        raise HTTPException(
            status_code=400,
            detail=f"File content does not match a valid {ext.upper().lstrip('.')} document.",
        )

    existing_to_replace = None
    if replace_resume_id is not None:
        existing_to_replace = (
            db.query(Resume)
            .filter(Resume.id == replace_resume_id, Resume.candidate_id == current_user.id)
            .first()
        )
        if not existing_to_replace:
            raise HTTPException(status_code=404, detail="Resume to replace was not found.")

    stored_filename = f"cand_{current_user.id}_{uuid.uuid4().hex}{ext}"
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    target_path = upload_dir / stored_filename

    with open(target_path, "wb") as out_file:
        out_file.write(content)

    try:
        parsed = parse_resume_file(target_path, ext.lstrip("."))
    except Exception as exc:
        if target_path.exists():
            target_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse resume document: {str(exc)}",
        )

    if existing_to_replace:
        old_path = Path(existing_to_replace.file_path)
        if old_path.exists():
            old_path.unlink(missing_ok=True)

        existing_to_replace.original_filename = safe_original_name
        existing_to_replace.stored_filename = stored_filename
        existing_to_replace.file_path = str(target_path)
        existing_to_replace.file_type = ext.lstrip(".")
        existing_to_replace.file_size_bytes = len(content)
        existing_to_replace.extracted_name = parsed["extracted_name"]
        existing_to_replace.extracted_email = parsed["extracted_email"]
        existing_to_replace.extracted_phone = parsed["extracted_phone"]
        existing_to_replace.extracted_education = parsed["extracted_education"]
        existing_to_replace.extracted_experience = parsed["extracted_experience"]
        existing_to_replace.extracted_skills = parsed["extracted_skills"]
        existing_to_replace.extracted_certifications = parsed["extracted_certifications"]
        existing_to_replace.raw_text = parsed["raw_text"]
        existing_to_replace.masked_text = parsed["masked_text"]
        existing_to_replace.extraction_notes = parsed["extraction_notes"]

        db.commit()
        db.refresh(existing_to_replace)
        return existing_to_replace

    existing_count = db.query(Resume).filter(Resume.candidate_id == current_user.id).count()
    resume = Resume(
        candidate_id=current_user.id,
        original_filename=safe_original_name,
        stored_filename=stored_filename,
        file_path=str(target_path),
        file_type=ext.lstrip("."),
        file_size_bytes=len(content),
        is_primary=(existing_count == 0),
        extracted_name=parsed["extracted_name"],
        extracted_email=parsed["extracted_email"],
        extracted_phone=parsed["extracted_phone"],
        extracted_education=parsed["extracted_education"],
        extracted_experience=parsed["extracted_experience"],
        extracted_skills=parsed["extracted_skills"],
        extracted_certifications=parsed["extracted_certifications"],
        raw_text=parsed["raw_text"],
        masked_text=parsed["masked_text"],
        extraction_notes=parsed["extraction_notes"],
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("/my", response_model=List[ResumeOut])
def list_my_resumes(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """List all resumes uploaded by the authenticated candidate."""
    return (
        db.query(Resume)
        .filter(Resume.candidate_id == current_user.id)
        .order_by(Resume.is_primary.desc(), Resume.created_at.desc())
        .all()
    )


@router.get("/{resume_id}", response_model=ResumeOut)
def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get parsed details of a resume (authorized owner or associated recruiter only)."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    _authorize_resume_access(resume, current_user, db)
    return resume


@router.get("/{resume_id}/download")
def download_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Securely download the original resume file."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    _authorize_resume_access(resume, current_user, db)

    file_path = Path(resume.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Stored resume file is missing from storage.")

    media_type = (
        "application/pdf"
        if resume.file_type == "pdf"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    return FileResponse(
        path=str(file_path),
        filename=resume.original_filename,
        media_type=media_type,
    )


@router.patch("/{resume_id}/primary", response_model=ResumeOut)
def set_primary_resume(
    resume_id: int,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Mark one of the candidate's resumes as primary."""
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.candidate_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    db.query(Resume).filter(Resume.candidate_id == current_user.id).update({"is_primary": False})
    resume.is_primary = True
    db.commit()
    db.refresh(resume)
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: int,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Delete an uploaded resume belonging to the authenticated candidate."""
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.candidate_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    was_primary = resume.is_primary
    file_path = Path(resume.file_path)
    if file_path.exists():
        os.remove(file_path)

    db.delete(resume)
    db.flush()

    if was_primary:
        next_resume = (
            db.query(Resume)
            .filter(Resume.candidate_id == current_user.id)
            .order_by(Resume.created_at.desc())
            .first()
        )
        if next_resume:
            next_resume.is_primary = True

    db.commit()
    return None
