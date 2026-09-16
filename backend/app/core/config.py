import os
from typing import List, Union
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "BOB Telegram Bot & SaaS Exam System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super-secret-key-change-in-production-min32chars!!"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5432/bob_tg_exam"
    
    DEFAULT_ADMIN_EMAIL: str = "admin@bobexam.com"
    DEFAULT_ADMIN_PASSWORD: str = "Admin@123456"
    DEFAULT_ADMIN_NAME: str = "System Administration"

    SESSION_EXPIRE_DAYS: int = 7
    SESSION_INACTIVITY_HOURS: int = 24
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    TELEGRAM_BOT_TOKEN: str = ""
    ENABLE_DOCS: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
