import json
from typing import List, Union
from pydantic import field_validator
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

    BACKEND_CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    TELEGRAM_BOT_TOKEN: str = ""
    ENABLE_DOCS: bool = True

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_clean = v.strip()
            if not v_clean:
                return ["*"]
            if v_clean.startswith("[") and v_clean.endswith("]"):
                try:
                    parsed = json.loads(v_clean)
                    if isinstance(parsed, list):
                        return [str(i).strip() for i in parsed if str(i).strip()]
                except Exception:
                    pass
                inner = v_clean.strip("[]")
                return [i.strip().strip("\"'") for i in inner.split(",") if i.strip()]
            return [i.strip() for i in v_clean.split(",") if i.strip()]
        elif isinstance(v, (list, tuple, set)):
            return [str(i).strip() for i in v if str(i).strip()]
        return ["*"]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
