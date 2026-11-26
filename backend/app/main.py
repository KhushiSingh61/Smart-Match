from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import (
    applications,
    auth,
    dashboard,
    jobs,
    matching,
    notifications,
    profiles,
    resumes,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.APP_TITLE,
    description=(
        "SMARTMATCH is an AI-assisted recruitment and job-matching decision-support platform "
        "powered by TF-IDF vectorization, Cosine Similarity, and rule-based skill extraction."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(jobs.router)
app.include_router(resumes.router)
app.include_router(applications.router)
app.include_router(matching.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
