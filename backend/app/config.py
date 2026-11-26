import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "SMARTMATCH"
    APP_TITLE: str = "SMARTMATCH – AI-Powered Recruitment & Job Matching Platform"
    APP_VERSION: str = "1.0.0"
    SECRET_KEY: str = "smartmatch-local-dev-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    DATABASE_URL: str = f"sqlite:///{(BASE_DIR / 'smartmatch.db').as_posix()}"
    UPLOAD_DIR: str = str((BASE_DIR.parent / "uploads").resolve())
    MAX_UPLOAD_SIZE_MB: int = 5
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
