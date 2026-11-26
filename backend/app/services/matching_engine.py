"""
Explainable AI-Assisted Resume Matching Engine for SMARTMATCH.

Architecture:
- Uses Scikit-learn TF-IDF vectorization + Cosine Similarity and rule-based
  skill dictionary matching.
- Explicitly DOES NOT claim to use transformer models or LLMs.
- Designed behind a matcher interface (`BaseMatcher` -> `TfidfMatcher`) so
  future semantic embedding models (e.g., Sentence Transformers) can be added cleanly.
- Never uses protected demographic attributes in scoring.
- Never makes automated hire/reject decisions; outputs decision-support metrics only.
"""

import re
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.services.skills_dictionary import extract_skills_from_text, normalize_skill_list


DEFAULT_WEIGHTS = {
    "skills": 0.40,
    "experience": 0.30,
    "description": 0.20,
    "education": 0.10,
}


def _tfidf_cosine(text_a: str, text_b: str) -> float:
    """Compute TF-IDF cosine similarity between two strings in [0.0, 1.0]."""
    clean_a = (text_a or "").strip()
    clean_b = (text_b or "").strip()
    if not clean_a or not clean_b:
        return 0.0
    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            lowercase=True,
        )
        matrix = vectorizer.fit_transform([clean_a, clean_b])
        sim = float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])
        return max(0.0, min(1.0, sim))
    except ValueError:
        # Occurs when both inputs contain only stop words / punctuation
        return 0.0


def _estimate_years_of_experience(text: str) -> Optional[float]:
    """
    Extract an approximate years-of-experience indicator when explicitly stated
    (e.g., '3+ years of experience') or via year spans. Returns None if unavailable.
    """
    if not text:
        return None
    explicit = re.findall(
        r"\b(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience\b",
        text,
        flags=re.IGNORECASE,
    )
    if explicit:
        vals = [float(v) for v in explicit if float(v) <= 50]
        if vals:
            return max(vals)

    # Fallback: span from earliest to latest employment year mentioned
    years = [int(y) for y in re.findall(r"\b(19\d{2}|20[0-3]\d)\b", text)]
    if len(years) >= 2:
        span = max(years) - min(years)
        if 0 < span <= 45:
            return float(span)
    return None


def _extract_relevant_sections(resume_text: str, job_terms: List[str], max_snippets: int = 5) -> List[str]:
    """Identify resume lines that contain key terms or skills from the job."""
    if not resume_text or not job_terms:
        return []
    lines = [line.strip() for line in resume_text.splitlines() if len(line.strip()) > 15]
    lower_terms = [t.lower() for t in job_terms if len(t.strip()) >= 2]
    scored_lines = []
    for line in lines:
        low = line.lower()
        hits = sum(1 for term in lower_terms if term in low)
        if hits > 0:
            scored_lines.append((hits, line))
    scored_lines.sort(key=lambda x: x[0], reverse=True)
    return [line[:260] for _, line in scored_lines[:max_snippets]]


def _build_skill_gap_suggestions(missing_skills: List[str], preferred_missing: List[str]) -> List[Dict[str, str]]:
    """Generate constructive, non-prescriptive skill-gap suggestions."""
    suggestions: List[Dict[str, str]] = []
    for skill in missing_skills[:6]:
        suggestions.append(
            {
                "skill": skill,
                "priority": "Required",
                "suggestion": (
                    f"'{skill}' is listed as a required skill for this role. If you have experience with it, "
                    "make sure it is explicitly named in your resume; otherwise, consider building hands-on "
                    "project experience or completing coursework in it."
                ),
            }
        )
    for skill in preferred_missing[:3]:
        suggestions.append(
            {
                "skill": skill,
                "priority": "Preferred",
                "suggestion": (
                    f"'{skill}' is a preferred skill. Adding relevant project examples or foundational "
                    "familiarity could strengthen your alignment with this role."
                ),
            }
        )
    return suggestions


class BaseMatcher(ABC):
    """Abstract interface allowing future pluggable matchers (e.g., Sentence Transformers)."""

    @abstractmethod
    def evaluate(
        self,
        job_data: Dict[str, Any],
        resume_data: Dict[str, Any],
        weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        raise NotImplementedError


class TfidfMatcher(BaseMatcher):
    """Explainable TF-IDF + Cosine Similarity + Rule-Based Skill Matcher."""

    engine_name = "TF-IDF + Cosine Similarity & Rule-Based Skill Extractor (Scikit-learn)"

    def evaluate(
        self,
        job_data: Dict[str, Any],
        resume_data: Dict[str, Any],
        weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        raw_weights = dict(DEFAULT_WEIGHTS)
        if weights:
            for k in DEFAULT_WEIGHTS:
                if k in weights and weights[k] is not None:
                    raw_weights[k] = max(0.0, float(weights[k]))

        total_weight = sum(raw_weights.values())
        if total_weight <= 0:
            norm_weights = dict(DEFAULT_WEIGHTS)
        else:
            norm_weights = {k: round(v / total_weight, 4) for k, v in raw_weights.items()}

        # Use PII-masked text so names, emails, phones, and demographic markers never enter TF-IDF
        resume_text = (resume_data.get("masked_text") or resume_data.get("raw_text") or "").strip()
        is_empty_resume = len(resume_text) == 0

        job_title = job_data.get("title", "")
        job_desc = job_data.get("description", "")
        job_exp_req = job_data.get("experience_required", "")
        job_min_exp = float(job_data.get("min_experience_years") or 0.0)
        job_edu_req = job_data.get("educational_requirements", "")

        req_skills = normalize_skill_list(job_data.get("required_skills") or [])
        pref_skills = normalize_skill_list(job_data.get("preferred_skills") or [])

        # Also detect any job required/preferred skills in resume text dynamically
        resume_skills = normalize_skill_list(
            list(resume_data.get("extracted_skills") or [])
            + extract_skills_from_text(resume_text, extra_skills=req_skills + pref_skills)
        )
        resume_skills_lower = {s.lower() for s in resume_skills}

        # 1. Skills Similarity (40% default)
        matched_skills = [s for s in req_skills if s.lower() in resume_skills_lower]
        missing_skills = [s for s in req_skills if s.lower() not in resume_skills_lower]
        preferred_matched = [s for s in pref_skills if s.lower() in resume_skills_lower]
        preferred_missing = [s for s in pref_skills if s.lower() not in resume_skills_lower]

        if req_skills:
            req_ratio = len(matched_skills) / len(req_skills)
            pref_bonus = (0.10 * (len(preferred_matched) / len(pref_skills))) if pref_skills else 0.0
            skills_tfidf = _tfidf_cosine(" ".join(req_skills + pref_skills), " ".join(resume_skills) + " " + resume_text)
            skills_score_01 = min(1.0, (0.75 * req_ratio) + (0.15 * skills_tfidf) + pref_bonus)
        else:
            # If recruiter didn't tag explicit required_skills, fall back to TF-IDF over job text & resume skills
            skills_score_01 = _tfidf_cosine(f"{job_title} {job_desc}", " ".join(resume_skills))

        # 2. Experience-Related Relevance (30% default, provisional text-based indicator)
        exp_lines = resume_data.get("extracted_experience") or []
        exp_text = " ".join(exp_lines) if exp_lines else resume_text
        job_exp_context = f"{job_title} {job_exp_req} {job_desc}".strip()
        exp_tfidf = _tfidf_cosine(job_exp_context, exp_text)

        estimated_years = _estimate_years_of_experience(resume_text)
        if job_min_exp > 0 and estimated_years is not None:
            years_ratio = min(1.0, estimated_years / job_min_exp)
            exp_score_01 = (0.60 * exp_tfidf) + (0.40 * years_ratio)
        else:
            exp_score_01 = exp_tfidf

        # 3. Job Description TF-IDF Similarity (20% default)
        full_job_text = f"{job_title} {job_desc} {' '.join(req_skills)} {' '.join(pref_skills)} {job_exp_req}".strip()
        desc_score_01 = _tfidf_cosine(full_job_text, resume_text)

        # 4. Education-Related Relevance (10% default, provisional text-based indicator)
        edu_lines = resume_data.get("extracted_education") or []
        edu_text = " ".join(edu_lines) if edu_lines else ""
        if not job_edu_req.strip():
            # No specific educational requirement specified -> neutral/non-penalizing baseline when text exists
            edu_score_01 = 0.70 if edu_lines else 0.50 if not is_empty_resume else 0.0
            edu_status = "No strict educational requirement specified by job; provisional baseline applied."
        elif not edu_text:
            edu_score_01 = 0.0
            edu_status = (
                "Educational background could not be reliably extracted from the resume. "
                "Missing extraction is not treated as proof of lack of qualification."
            )
        else:
            edu_tfidf = _tfidf_cosine(job_edu_req, edu_text)
            degree_cues = ["bachelor", "b.tech", "b.e", "b.sc", "master", "m.tech", "m.sc", "mba", "phd", "computer science", "engineering"]
            cue_overlap = sum(1 for c in degree_cues if c in job_edu_req.lower() and c in edu_text.lower())
            cue_bonus = min(0.35, cue_overlap * 0.15)
            edu_score_01 = min(1.0, (0.65 * edu_tfidf) + cue_bonus)
            edu_status = "Provisional text-based comparison of extracted education lines against job requirements."

        skills_pct = round(skills_score_01 * 100, 1)
        exp_pct = round(exp_score_01 * 100, 1)
        desc_pct = round(desc_score_01 * 100, 1)
        edu_pct = round(edu_score_01 * 100, 1)

        overall_pct = round(
            (skills_pct * norm_weights["skills"])
            + (exp_pct * norm_weights["experience"])
            + (desc_pct * norm_weights["description"])
            + (edu_pct * norm_weights["education"]),
            1,
        )

        missing_info_warnings: List[str] = []
        if is_empty_resume:
            missing_info_warnings.append("Resume text is empty or unreadable; automated scores cannot reflect candidate suitability.")
        if not exp_lines:
            missing_info_warnings.append("Structured work experience section was not reliably extracted; experience score is a provisional text indicator.")
        if not edu_lines:
            missing_info_warnings.append("Structured education section was not reliably extracted; human review of the original resume is recommended.")
        if not req_skills:
            missing_info_warnings.append("Job posting has no tagged required skills; skills similarity relied on general text overlap.")

        relevant_sections = _extract_relevant_sections(
            resume_text,
            req_skills + pref_skills + [w for w in job_title.split() if len(w) > 3],
        )
        skill_gap_suggestions = _build_skill_gap_suggestions(missing_skills, preferred_missing)

        return {
            "overall_score": overall_pct,
            "skills_score": skills_pct,
            "experience_score": exp_pct,
            "description_score": desc_pct,
            "education_score": edu_pct,
            "weights_used": norm_weights,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "preferred_matched_skills": preferred_matched,
            "resume_skills_detected": resume_skills,
            "estimated_experience_years": estimated_years,
            "relevant_sections": relevant_sections,
            "skill_gap_suggestions": skill_gap_suggestions,
            "explanation": {
                "engine": self.engine_name,
                "summary": (
                    f"Weighted score ({overall_pct}%) derived from Skills ({skills_pct}% × {int(norm_weights['skills']*100)}%), "
                    f"Provisional Experience Relevance ({exp_pct}% × {int(norm_weights['experience']*100)}%), "
                    f"TF-IDF Description Similarity ({desc_pct}% × {int(norm_weights['description']*100)}%), and "
                    f"Provisional Education Relevance ({edu_pct}% × {int(norm_weights['education']*100)}%)."
                ),
                "experience_note": (
                    "Experience relevance is a provisional text-based indicator comparing job context and extracted experience text."
                ),
                "education_note": edu_status,
                "decision_support_notice": (
                    "This score reflects lexical and skill-dictionary alignment only. It does NOT represent a probability "
                    "of getting hired and must never be used to automatically hire, select, or reject any candidate."
                ),
            },
            "bias_check": {
                "pii_masked_used_for_scoring": True,
                "protected_attributes_excluded": [
                    "Candidate Name",
                    "Email & Phone",
                    "Gender",
                    "Age / Date of Birth",
                    "Religion / Caste / Race",
                    "Nationality / Marital Status",
                ],
                "missing_information_flags": missing_info_warnings,
                "human_review_reminder": (
                    "Human-in-the-loop required: Please review the original resume and portfolio context before making "
                    "shortlisting or interview decisions. Unextracted fields are not evidence of missing qualifications."
                ),
                "limitations": [
                    "TF-IDF measures exact and n-gram word overlap, not deep semantic equivalence across synonyms not in the skill dictionary.",
                    "Scanned/image PDFs or unconventional resume formatting can reduce text extraction completeness.",
                    "Automated matching cannot evaluate soft skills, cultural contribution, or career trajectory nuances.",
                ],
            },
        }


matcher_service = TfidfMatcher()
