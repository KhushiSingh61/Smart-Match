import io
import os
import sys
from pathlib import Path

import docx
import fitz
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Use a dedicated test database and upload folder so dev DB stays untouched
TEST_DB_PATH = Path(__file__).resolve().parent / "test_smartmatch.db"
TEST_UPLOAD_DIR = Path(__file__).resolve().parent / "test_uploads"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["UPLOAD_DIR"] = str(TEST_UPLOAD_DIR)

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    TEST_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    for f in TEST_UPLOAD_DIR.glob("*"):
        f.unlink(missing_ok=True)
    if TEST_UPLOAD_DIR.exists():
        TEST_UPLOAD_DIR.rmdir()


client = TestClient(app)


def _make_sample_pdf_bytes() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    text = (
        "Ananya Mehta\n"
        "ananya.mehta@example.com | +91 9876543210\n"
        "Summary\n"
        "Data Engineer with 3+ years of experience building ETL pipelines and analytics platforms.\n"
        "Skills\n"
        "Python, SQL, ETL, Apache Airflow, Pandas, Scikit-learn, Docker, PostgreSQL\n"
        "Experience\n"
        "Senior Data Analyst at TechNova (2022 - Present)\n"
        "Built automated ETL pipelines in Python and SQL for warehouse ingestion.\n"
        "Education\n"
        "B.Tech in Computer Science, National Institute of Technology (2017 - 2021)\n"
        "Certifications\n"
        "AWS Certified Cloud Practitioner\n"
    )
    page.insert_text((50, 50), text, fontsize=11)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def _make_sample_docx_bytes() -> bytes:
    d = docx.Document()
    d.add_paragraph("Rohan Verma")
    d.add_paragraph("rohan.verma@example.com | +1 555-234-5678")
    d.add_paragraph("Skills")
    d.add_paragraph("JavaScript, React, Tailwind CSS, Node.js, FastAPI, Python, Git")
    d.add_paragraph("Experience")
    d.add_paragraph("Frontend Developer at WebCraft (2021 - 2024)")
    d.add_paragraph("Education")
    d.add_paragraph("Bachelor of Engineering in Information Technology")
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


def test_full_smartmatch_workflow():
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["app"] == "SMARTMATCH"

    # 2. Register Recruiter & Candidate
    rec_reg = client.post(
        "/api/auth/register",
        json={
            "email": "recruiter@techwave.io",
            "password": "Password123!",
            "full_name": "Rohit Sharma",
            "role": "recruiter",
            "company_name": "TechWave Solutions",
        },
    )
    assert rec_reg.status_code == 201, rec_reg.text
    rec_token = rec_reg.json()["access_token"]
    rec_headers = {"Authorization": f"Bearer {rec_token}"}

    cand_reg = client.post(
        "/api/auth/register",
        json={
            "email": "candidate@devmail.io",
            "password": "Password123!",
            "full_name": "Ananya Mehta",
            "role": "candidate",
        },
    )
    assert cand_reg.status_code == 201, cand_reg.text
    cand_token = cand_reg.json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_token}"}

    # Duplicate email fails
    dup = client.post(
        "/api/auth/register",
        json={
            "email": "candidate@devmail.io",
            "password": "Password123!",
            "full_name": "Duplicate",
            "role": "candidate",
        },
    )
    assert dup.status_code == 400

    # 3. Verify empty dashboards before data is added
    rec_empty = client.get("/api/dashboard/recruiter", headers=rec_headers)
    assert rec_empty.status_code == 200
    assert rec_empty.json()["stats"]["active_jobs"] == 0
    assert rec_empty.json()["stats"]["total_applications"] == 0

    cand_empty = client.get("/api/dashboard/candidate", headers=cand_headers)
    assert cand_empty.status_code == 200
    assert cand_empty.json()["stats"]["uploaded_resumes"] == 0
    assert cand_empty.json()["stats"]["applications_submitted"] == 0

    # 4. Role permission enforcement
    assert client.post("/api/jobs", json={}, headers=cand_headers).status_code == 403
    assert client.get("/api/resumes/my", headers=rec_headers).status_code == 403
    assert client.get("/api/auth/me").status_code == 401

    # 5. Recruiter creates, edits, and filters jobs
    job_res = client.post(
        "/api/jobs",
        headers=rec_headers,
        json={
            "title": "Data Engineer",
            "company_name": "TechWave Solutions",
            "location": "Bengaluru",
            "employment_type": "Full-time",
            "experience_required": "2-4 years",
            "min_experience_years": 2,
            "salary_range": "14-20 LPA",
            "description": "Design and maintain scalable Python and SQL ETL data pipelines using Apache Airflow and Docker.",
            "required_skills": ["Python", "SQL", "ETL", "Apache Airflow", "Docker"],
            "preferred_skills": ["Kubernetes", "Pandas"],
            "educational_requirements": "Bachelor degree in Computer Science or related field",
            "status": "active",
        },
    )
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # Edit job
    upd = client.put(
        f"/api/jobs/{job_id}",
        headers=rec_headers,
        json={"location": "Bengaluru / Hybrid"},
    )
    assert upd.status_code == 200
    assert upd.json()["location"] == "Bengaluru / Hybrid"

    # 6. Candidate rejects invalid upload & uploads valid PDF + DOCX
    bad_upload = client.post(
        "/api/resumes/upload",
        headers=cand_headers,
        files={"file": ("notes.txt", b"hello world", "text/plain")},
    )
    assert bad_upload.status_code == 400

    fake_pdf = client.post(
        "/api/resumes/upload",
        headers=cand_headers,
        files={"file": ("fake.pdf", b"not a real pdf", "application/pdf")},
    )
    assert fake_pdf.status_code == 400

    pdf_bytes = _make_sample_pdf_bytes()
    pdf_upload = client.post(
        "/api/resumes/upload",
        headers=cand_headers,
        files={"file": ("ananya_resume.pdf", pdf_bytes, "application/pdf")},
    )
    assert pdf_upload.status_code == 201
    pdf_data = pdf_upload.json()
    pdf_resume_id = pdf_data["id"]
    assert pdf_data["extracted_email"] == "ananya.mehta@example.com"
    assert "Python" in pdf_data["extracted_skills"]
    assert "ETL" in pdf_data["extracted_skills"]
    assert "[EMAIL MASKED]" in pdf_data["masked_text"]

    docx_bytes = _make_sample_docx_bytes()
    docx_upload = client.post(
        "/api/resumes/upload",
        headers=cand_headers,
        files={
            "file": (
                "rohan_resume.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert docx_upload.status_code == 201
    docx_resume_id = docx_upload.json()["id"]
    assert "React" in docx_upload.json()["extracted_skills"]

    # Recruiter cannot access candidate resume before candidate applies
    assert client.get(f"/api/resumes/{pdf_resume_id}", headers=rec_headers).status_code == 403

    # 7. Candidate runs match analysis
    analyze = client.post(
        "/api/matching/analyze",
        headers=cand_headers,
        json={"job_id": job_id, "resume_id": pdf_resume_id},
    )
    assert analyze.status_code == 200
    a_data = analyze.json()
    assert a_data["overall_score"] > 50
    assert "Python" in a_data["matched_skills"]
    assert "Kubernetes" not in a_data["missing_skills"]  # preferred, not required
    assert a_data["bias_check"]["pii_masked_used_for_scoring"] is True

    saved_analysis = client.get(f"/api/matching/results/{a_data['analysis_id']}", headers=cand_headers)
    assert saved_analysis.status_code == 200
    assert saved_analysis.json()["overall_score"] == a_data["overall_score"]

    # 8. Candidate applies & duplicate is prevented
    apply_res = client.post(
        f"/api/jobs/{job_id}/apply",
        headers=cand_headers,
        json={"resume_id": pdf_resume_id, "cover_note": "Excited to contribute to your data platform."},
    )
    assert apply_res.status_code == 201
    app_id = apply_res.json()["id"]
    assert apply_res.json()["match_score"] is not None

    dup_apply = client.post(
        f"/api/jobs/{job_id}/apply",
        headers=cand_headers,
        json={"resume_id": pdf_resume_id},
    )
    assert dup_apply.status_code == 409

    # Now recruiter CAN view the associated resume & rank candidates
    assert client.get(f"/api/resumes/{pdf_resume_id}", headers=rec_headers).status_code == 200

    rank_res = client.get(f"/api/matching/job/{job_id}/rank", headers=rec_headers)
    assert rank_res.status_code == 200
    assert rank_res.json()["total_candidates"] == 1
    assert rank_res.json()["candidates"][0]["application_id"] == app_id

    # 9. Recruiter updates application status -> candidate gets notification
    status_upd = client.patch(
        f"/api/applications/{app_id}/status",
        headers=rec_headers,
        json={"status": "Shortlisted", "recruiter_notes": "Strong Python/ETL alignment."},
    )
    assert status_upd.status_code == 200
    assert status_upd.json()["status"] == "Shortlisted"

    cand_notifs = client.get("/api/notifications", headers=cand_headers)
    assert cand_notifs.status_code == 200
    assert len(cand_notifs.json()) >= 2

    # 10. Populated recruiter dashboard stats match DB
    rec_dash = client.get("/api/dashboard/recruiter", headers=rec_headers)
    assert rec_dash.status_code == 200
    assert rec_dash.json()["stats"]["active_jobs"] == 1
    assert rec_dash.json()["stats"]["shortlisted"] == 1

    # 11. Delete secondary DOCX resume & verify cleanup
    del_res = client.delete(f"/api/resumes/{docx_resume_id}", headers=cand_headers)
    assert del_res.status_code == 204


def test_login_profiles_empty_resume_and_withdrawal():
    # Login with registered candidate
    login_res = client.post(
        "/api/auth/login",
        json={"email": "candidate@devmail.io", "password": "Password123!"},
    )
    assert login_res.status_code == 200
    cand_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    rec_login = client.post(
        "/api/auth/login",
        json={"email": "recruiter@techwave.io", "password": "Password123!"},
    )
    assert rec_login.status_code == 200
    rec_headers = {"Authorization": f"Bearer {rec_login.json()['access_token']}"}

    # Update candidate profile & verify completion increases
    prof_upd = client.put(
        "/api/profiles/me",
        headers=cand_headers,
        json={
            "headline": "Data Engineer",
            "location": "Bengaluru",
            "skills": ["Python", "SQL", "ETL"],
            "portfolio_url": "https://ananya.dev",
        },
    )
    assert prof_upd.status_code == 200
    assert prof_upd.json()["completion_percentage"] >= 40

    # Upload an empty-text PDF (blank page) and verify graceful handling
    blank_doc = fitz.open()
    blank_doc.new_page()
    blank_pdf = blank_doc.tobytes()
    blank_doc.close()

    blank_up = client.post(
        "/api/resumes/upload",
        headers=cand_headers,
        files={"file": ("blank.pdf", blank_pdf, "application/pdf")},
    )
    assert blank_up.status_code == 201
    blank_data = blank_up.json()
    assert len(blank_data["extraction_notes"]) >= 1

    # Recruiter creates a second job, candidate applies, then withdraws
    job2 = client.post(
        "/api/jobs",
        headers=rec_headers,
        json={
            "title": "ML Engineer",
            "company_name": "TechWave Solutions",
            "location": "Remote",
            "description": "Build Scikit-learn pipelines and data matching workflows.",
            "required_skills": ["Python", "Scikit-learn"],
            "status": "active",
        },
    )
    assert job2.status_code == 201
    job2_id = job2.json()["id"]

    # Analyze against empty-text resume should not crash
    empty_match = client.post(
        "/api/matching/analyze",
        headers=cand_headers,
        json={"job_id": job2_id, "resume_id": blank_data["id"]},
    )
    assert empty_match.status_code == 200
    assert empty_match.json()["overall_score"] == 0.0

    # Apply and withdraw
    app2 = client.post(
        f"/api/jobs/{job2_id}/apply",
        headers=cand_headers,
        json={"resume_id": blank_data["id"]},
    )
    assert app2.status_code == 201
    app2_id = app2.json()["id"]

    withdraw = client.delete(f"/api/applications/{app2_id}", headers=cand_headers)
    assert withdraw.status_code == 204

    # Deactivate job -> hidden from candidate job listing
    deact = client.put(f"/api/jobs/{job2_id}", headers=rec_headers, json={"status": "inactive"})
    assert deact.status_code == 200
    cand_jobs = client.get("/api/jobs", headers=cand_headers)
    assert all(j["id"] != job2_id for j in cand_jobs.json())

    # Delete job
    del_job = client.delete(f"/api/jobs/{job2_id}", headers=rec_headers)
    assert del_job.status_code == 204

