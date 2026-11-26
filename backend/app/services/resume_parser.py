"""
Resume extraction & PII-masking service for SMARTMATCH.
Supports PDF (via PyMuPDF) and DOCX (via python-docx).
Explicitly reports fields that could not be extracted rather than fabricating values.
"""

import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import docx
import fitz  # PyMuPDF

from app.services.skills_dictionary import extract_skills_from_text


EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_REGEX = re.compile(
    r"(?:(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4})"
)
URL_REGEX = re.compile(r"https?://\S+|www\.\S+|linkedin\.com/\S+|github\.com/\S+", re.IGNORECASE)

SECTION_HEADERS = {
    "education": ["education", "academic background", "academics", "qualifications", "degree"],
    "experience": [
        "experience",
        "work experience",
        "professional experience",
        "employment",
        "work history",
        "internships",
    ],
    "skills": ["skills", "technical skills", "core competencies", "technologies", "tech stack"],
    "certifications": ["certifications", "certificates", "licenses", "awards", "courses"],
    "projects": ["projects", "key projects", "academic projects"],
    "summary": ["summary", "profile", "objective", "about me"],
}

DEGREE_KEYWORDS = [
    "b.tech",
    "btech",
    "b.e",
    "b.sc",
    "bsc",
    "bachelor",
    "m.tech",
    "mtech",
    "m.sc",
    "msc",
    "master",
    "mba",
    "phd",
    "ph.d",
    "diploma",
    "university",
    "institute",
    "college",
    "associate degree",
    "computer science",
    "engineering",
]

CERT_KEYWORDS = [
    "certified",
    "certification",
    "certificate",
    "aws",
    "azure",
    "google cloud",
    "pmp",
    "scrum",
    "coursera",
    "udemy",
    "oracle",
    "cisco",
    "microsoft",
]


def extract_text_from_pdf(file_path: Path) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    text_parts: List[str] = []
    with fitz.open(str(file_path)) as doc:
        for page in doc:
            page_text = page.get_text("text")
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts).strip()


def extract_text_from_docx(file_path: Path) -> str:
    """Extract text from a DOCX file using python-docx (paragraphs and tables)."""
    document = docx.Document(str(file_path))
    parts: List[str] = []
    for para in document.paragraphs:
        if para.text and para.text.strip():
            parts.append(para.text.strip())
    for table in document.tables:
        for row in table.rows:
            row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_cells:
                parts.append(" | ".join(row_cells))
    return "\n".join(parts).strip()


def extract_raw_text(file_path: Path, file_type: str) -> str:
    """Dispatch text extraction based on validated file extension."""
    ext = file_type.lower().lstrip(".")
    if ext == "pdf":
        return extract_text_from_pdf(file_path)
    if ext == "docx":
        return extract_text_from_docx(file_path)
    raise ValueError(f"Unsupported file type: {file_type}")


def _split_sections(lines: List[str]) -> Dict[str, List[str]]:
    """Group resume lines under detected section headers."""
    sections: Dict[str, List[str]] = {"header": []}
    current_section = "header"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        cleaned_header = re.sub(r"[:\-_|]+", "", stripped).strip().lower()
        matched_section = None
        if len(cleaned_header.split()) <= 4:
            for sec_key, aliases in SECTION_HEADERS.items():
                if cleaned_header in aliases:
                    matched_section = sec_key
                    break
        if matched_section:
            current_section = matched_section
            sections.setdefault(current_section, [])
        else:
            sections.setdefault(current_section, []).append(stripped)

    return sections


def _extract_name(lines: List[str], email: Optional[str]) -> Optional[str]:
    """Heuristically extract candidate name from top non-empty lines."""
    skip_words = {"resume", "curriculum", "vitae", "cv", "profile", "summary", "email", "phone", "address"}
    for line in lines[:6]:
        candidate = line.strip()
        if not candidate or len(candidate) > 60:
            continue
        if EMAIL_REGEX.search(candidate) or URL_REGEX.search(candidate):
            continue
        if any(char.isdigit() for char in candidate):
            continue
        words = candidate.split()
        if 2 <= len(words) <= 4:
            lowered_words = {w.lower().strip(".,:") for w in words}
            if lowered_words & skip_words:
                continue
            if all(re.match(r"^[A-Za-z.'-]+$", w) for w in words):
                return candidate
    if email:
        local = email.split("@")[0]
        if "." in local and local.replace(".", "").isalpha():
            return " ".join(part.capitalize() for part in local.split(".")[:3])
    return None


def _extract_phone(text: str) -> Optional[str]:
    """Extract plausible phone number while avoiding 4-digit year ranges like 2020-2024."""
    for match in PHONE_REGEX.finditer(text):
        digits = re.sub(r"\D", "", match.group(0))
        if 10 <= len(digits) <= 15:
            return match.group(0).strip()
    return None


def _extract_education(sections: Dict[str, List[str]], lines: List[str]) -> List[str]:
    edu_lines = sections.get("education", [])
    if edu_lines:
        return edu_lines[:10]
    fallback = []
    for line in lines:
        low = line.lower()
        if any(kw in low for kw in DEGREE_KEYWORDS):
            fallback.append(line.strip())
    return fallback[:8]


def _extract_experience(sections: Dict[str, List[str]], lines: List[str]) -> List[str]:
    exp_lines = sections.get("experience", [])
    if exp_lines:
        return exp_lines[:15]
    # Fallback: look for lines containing year ranges or role/company cues
    fallback = []
    year_range = re.compile(r"\b(19|20)\d{2}\s*[-–to]+\s*((19|20)\d{2}|present|current)\b", re.IGNORECASE)
    for line in lines:
        if year_range.search(line):
            fallback.append(line.strip())
    return fallback[:10]


def _extract_certifications(sections: Dict[str, List[str]], lines: List[str]) -> List[str]:
    cert_lines = sections.get("certifications", [])
    if cert_lines:
        return cert_lines[:10]
    fallback = []
    for line in lines:
        low = line.lower()
        if any(kw in low for kw in CERT_KEYWORDS) and len(line.strip()) < 140:
            fallback.append(line.strip())
    return fallback[:6]


def mask_pii(text: str, extracted_name: Optional[str] = None) -> str:
    """
    Create a PII-masked version of resume text for bias-aware review.
    Masks emails, phone numbers, URLs, and detected candidate name.
    """
    if not text:
        return ""
    masked = EMAIL_REGEX.sub("[EMAIL MASKED]", text)
    masked = URL_REGEX.sub("[URL MASKED]", masked)

    def _mask_phone(match: re.Match) -> str:
        digits = re.sub(r"\D", "", match.group(0))
        if 10 <= len(digits) <= 15:
            return "[PHONE MASKED]"
        return match.group(0)

    masked = PHONE_REGEX.sub(_mask_phone, masked)

    if extracted_name:
        escaped_name = re.escape(extracted_name)
        masked = re.sub(escaped_name, "[CANDIDATE NAME MASKED]", masked, flags=re.IGNORECASE)

    # Mask common demographic labels if explicitly stated in resume text
    demographic_pattern = re.compile(
        r"(?im)^(gender|sex|age|date of birth|dob|marital status|religion|nationality|caste|race)\s*:\s*.*$"
    )
    masked = demographic_pattern.sub(r"\1: [PROTECTED ATTRIBUTE MASKED]", masked)
    return masked


def parse_resume_file(file_path: Path, file_type: str) -> Dict[str, Any]:
    """
    Extract structured and unstructured fields from a resume file.
    Clearly documents any fields that could not be extracted.
    """
    raw_text = extract_raw_text(file_path, file_type)
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    sections = _split_sections(lines)

    email_match = EMAIL_REGEX.search(raw_text)
    extracted_email = email_match.group(0) if email_match else None
    extracted_phone = _extract_phone(raw_text)
    extracted_name = _extract_name(lines, extracted_email)

    extracted_skills = extract_skills_from_text(raw_text)
    extracted_education = _extract_education(sections, lines)
    extracted_experience = _extract_experience(sections, lines)
    extracted_certifications = _extract_certifications(sections, lines)

    notes: List[str] = []
    if not raw_text.strip():
        notes.append("No selectable text could be extracted from this file (e.g., scanned image-only PDF).")
    if not extracted_name:
        notes.append("Candidate name could not be reliably extracted from the document.")
    if not extracted_email:
        notes.append("Email address could not be extracted.")
    if not extracted_phone:
        notes.append("Phone number could not be extracted.")
    if not extracted_skills:
        notes.append("No skills from the skill dictionary were matched in the resume text.")
    if not extracted_education:
        notes.append("Education section could not be reliably extracted.")
    if not extracted_experience:
        notes.append("Work experience section could not be reliably extracted.")
    if not extracted_certifications:
        notes.append("No certifications were detected.")

    masked_text = mask_pii(raw_text, extracted_name=extracted_name)

    return {
        "raw_text": raw_text,
        "masked_text": masked_text,
        "extracted_name": extracted_name,
        "extracted_email": extracted_email,
        "extracted_phone": extracted_phone,
        "extracted_skills": extracted_skills,
        "extracted_education": extracted_education,
        "extracted_experience": extracted_experience,
        "extracted_certifications": extracted_certifications,
        "extraction_notes": notes,
    }
