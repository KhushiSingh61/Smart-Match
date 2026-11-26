# SMARTMATCH – AI-Powered Recruitment & Job Matching Platform

> **"Smarter Hiring. Better Matching."**

SMARTMATCH is a full-stack, decision-support recruitment and job-matching web application that connects **Recruiters** and **Candidates** through resume parsing, rule-based skill extraction, and explainable TF-IDF + Cosine Similarity matching.

> **Decision-Support Principle:** SMARTMATCH never automatically hires, selects, or rejects any candidate based on an algorithmic score. Final hiring decisions always remain with human recruiters.

---

## Features

### Authentication & Role-Based Access Control
- JWT-based authentication (`PyJWT`) and `bcrypt` password hashing
- Role selection during registration (`Recruiter` or `Candidate`)
- Separate protected portals and API permissions per role
- Persistent browser session with automatic token validation

### Recruiter Portal
- **Database-Driven Dashboard:** Live metrics for active jobs, total applications, resumes received, candidates under review, shortlisted candidates, status distribution, and match score distribution (with clean empty states when no records exist)
- **Job Management:** Create, edit, delete, activate/deactivate, search, and filter job profiles
- **Candidate Management:** View applicants for recruiter's jobs, inspect extracted resume details and skills, compare up to 3 candidates side by side, download original resumes securely, and open detailed inspection reports
- **Candidate Ranking:** Order applicants per job by explainable match scores as a human review aid
- **Application Management:** Update statuses (`Applied`, `Under Review`, `Shortlisted`, `Interview`, `Selected`, `Rejected`) with recruiter notes
- **Bias & Fairness Review:** Inspect PII-masked resumes (`[EMAIL MASKED]`, `[PHONE MASKED]`, `[CANDIDATE NAME MASKED]`, `[PROTECTED ATTRIBUTE MASKED]`), view excluded protected characteristics, review missing-information warnings, and read system limitations

### Candidate Portal
- **Database-Driven Dashboard:** Live profile completion percentage, uploaded resume count, active jobs count, application pipeline counts, and dynamically computed job match recommendations
- **Candidate Profile:** Manage contact details, headline, summary, education entries, work experience entries, technical skills, certifications, portfolio URL, and LinkedIn URL
- **Resume Upload & Parsing:** Upload PDF (`.pdf`) and Word (`.docx`) resumes (up to 5 MB) with file-type/signature validation, upload progress indicator, replacement upload, primary resume selection, secure download, deletion, and extracted-text preview
- **Browse & Apply:** Search and filter active jobs by title, location, skill, and experience; apply with a selected resume; duplicate application prevention; withdraw applications
- **Match Insights:** Inspect overall similarity score, component score breakdown, matched/missing skills, relevant resume sections, and actionable skill-gap suggestions

### Notifications
- In-app notification bell with unread counts and read/mark-all-read support
- Candidates notified on application submission and recruiter status changes
- Recruiters notified on new candidate applications and withdrawals

---

## Technology Stack

- **Frontend:** React.js, Vite, Tailwind CSS, JavaScript, Lucide React, Axios, React Router
- **Backend:** Python 3.13, FastAPI, SQLAlchemy, Pydantic, PyJWT, bcrypt
- **Database:** SQLite for local development (`DATABASE_URL` configurable for PostgreSQL)
- **AI/ML & Document Processing:** Scikit-learn (`TfidfVectorizer`, `cosine_similarity`), PyMuPDF (`fitz`) for PDF extraction, `python-docx` for DOCX extraction, and an extensible rule-based skill dictionary (`backend/app/services/skills_dictionary.py`)

> **Transparency Note:** SMARTMATCH uses Scikit-learn TF-IDF vectorization, Cosine Similarity, and rule-based skill extraction—not transformer models or LLMs. The matcher interface (`BaseMatcher` -> `TfidfMatcher`) is designed to support future semantic embedding models cleanly.

---

## Project Architecture & Folder Structure

```text
SMARTMATCH/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   └── models.py              # SQLAlchemy ORM tables & relationships
│   │   ├── routers/
│   │   │   ├── auth.py                # Register, login, current user
│   │   │   ├── profiles.py            # Recruiter & candidate profile management
│   │   │   ├── jobs.py                # Job CRUD & filtering
│   │   │   ├── resumes.py             # Secure upload, parsing, download, delete
│   │   │   ├── applications.py        # Apply, withdraw, status updates, recruiter views
│   │   │   ├── matching.py            # TF-IDF analysis, results, candidate ranking
│   │   │   ├── notifications.py       # Notification listing & read states
│   │   │   └── dashboard.py           # Database-driven portal aggregations
│   │   ├── schemas/
│   │   │   └── schemas.py             # Pydantic request/response contracts
│   │   ├── services/
│   │   │   ├── skills_dictionary.py   # Extensible canonical skill dictionary
│   │   │   ├── resume_parser.py       # PDF/DOCX extraction & PII masking
│   │   │   ├── matching_engine.py     # Weighted TF-IDF & explainable scoring
│   │   │   └── notification_service.py
│   │   ├── config.py                  # Environment settings
│   │   ├── database.py                # Engine, SessionLocal, init_db
│   │   ├── security.py                # bcrypt hashing, JWT, RBAC dependencies
│   │   └── main.py                    # FastAPI app & CORS setup
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/                # Logo, ProtectedRoute, StatusBadge, MatchScoreRing, etc.
│   │   ├── context/                   # AuthContext for JWT session persistence
│   │   ├── layouts/                   # PortalLayout (sidebar + header)
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── AuthPage.jsx
│   │   │   ├── recruiter/             # Dashboard, Jobs, Candidates, Ranking, Bias Check, Profile
│   │   │   └── candidate/             # Dashboard, Profile, Resumes, Jobs, Applications, Insights
│   │   ├── services/api.js            # Axios client & API methods
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── style.css
│   ├── package.json
│   └── vite.config.js
├── uploads/                           # Private uploaded resume storage (gitignored)
├── tests/
│   └── test_smartmatch.py             # End-to-end FastAPI + ML + RBAC test suite
├── .gitignore
└── README.md
```

---

## Database Schema

Relational tables defined in `backend/app/models/models.py`:
- `users` (`id`, `email`, `password_hash`, `full_name`, `role`, `is_active`, timestamps)
- `recruiter_profiles` (`user_id` FK -> `users.id`, company details)
- `candidate_profiles` (`user_id` FK -> `users.id`, contact, education, experience, skills, certifications, links)
- `jobs` (`recruiter_id` FK -> `users.id`, title, company, location, employment_type, requirements, skills, status)
- `resumes` (`candidate_id` FK -> `users.id`, file metadata, extracted fields, `raw_text`, `masked_text`, `extraction_notes`)
- `applications` (`job_id` FK -> `jobs.id`, `candidate_id` FK -> `users.id`, `resume_id` FK -> `resumes.id`, unique `(job_id, candidate_id)` constraint, status, `match_score`, `match_details`)
- `match_analyses` (persisted explainable match breakdowns)
- `notifications` (`user_id` FK -> `users.id`, title, message, type, `is_read`)

---

## Local Setup & Running on Windows

Run the backend and frontend in **two separate terminals** from the `SMARTMATCH` root directory.

### 1. Backend Setup (Terminal 1)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

> **Note:** Update `SECRET_KEY` in `backend/.env` before deploying outside local development. To use PostgreSQL instead of SQLite, set `DATABASE_URL=postgresql+psycopg://user:password@host:5432/smartmatch` (and install `psycopg`).

### 2. Frontend Setup (Terminal 2)

```powershell
cd frontend
npm install
npm run dev
```

### Local URLs
- **Frontend Application (Chrome):** http://localhost:5173
- **Backend API:** http://127.0.0.1:8000
- **FastAPI Swagger Documentation:** http://127.0.0.1:8000/docs

---

## API Endpoints Summary

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Profiles:** `GET /api/profiles/me`, `PUT /api/profiles/me`
- **Jobs:** `POST /api/jobs`, `GET /api/jobs`, `GET /api/jobs/{id}`, `PUT /api/jobs/{id}`, `DELETE /api/jobs/{id}`
- **Resumes:** `POST /api/resumes/upload`, `GET /api/resumes/my`, `GET /api/resumes/{id}`, `GET /api/resumes/{id}/download`, `PATCH /api/resumes/{id}/primary`, `DELETE /api/resumes/{id}`
- **Applications:** `POST /api/jobs/{id}/apply`, `GET /api/applications/my`, `DELETE /api/applications/{id}`, `GET /api/jobs/{id}/applications`, `GET /api/applications/recruiter`, `PATCH /api/applications/{id}/status`
- **Matching:** `POST /api/matching/analyze`, `GET /api/matching/results/{id}`, `GET /api/matching/job/{id}/rank`, `GET /api/matching/skills`
- **Notifications:** `GET /api/notifications`, `PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/read-all`
- **Dashboards:** `GET /api/dashboard/recruiter`, `GET /api/dashboard/candidate`

---

## Running Tests

```powershell
.\backend\.venv\Scripts\pytest.exe tests/test_smartmatch.py -v
```

---

## Current Limitations & Future Scope

### Current Limitations
- TF-IDF measures lexical and n-gram overlap rather than deep semantic meaning for synonyms outside the skill dictionary.
- Scanned/image-only PDFs without embedded selectable text cannot be parsed without OCR.
- Experience and education relevance scores are provisional text-based indicators when structured resume sections are inconsistently formatted.

### Future Scope
- Pluggable semantic embeddings (e.g., Sentence Transformers) via the `BaseMatcher` interface.
- OCR fallback (e.g., Tesseract) for scanned PDF resumes.
- Alembic database migrations and PostgreSQL production deployment.
- Interview scheduling and calendar integration.
