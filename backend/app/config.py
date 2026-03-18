from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE_PATH = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    app_name: str = "University Chatbot API"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    cors_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    request_timeout_seconds: int = 20
    supabase_timeout_seconds: int = 10
    default_model: str = "llama-3.1-8b-instant"
    admin_api_key: str = "dev-admin-key"
    admin_emails: str = ""
    chat_rate_limit_per_minute: int = 30
    portal_config_path: str = "data/portal_config.json"

    groq_api_key: str = ""
    supabase_url: str = ""
    supabase_key: str = ""
    redis_url: str = ""

    model_config = SettingsConfigDict(env_file=str(ENV_FILE_PATH), case_sensitive=False, extra="ignore")

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def admin_email_list(self) -> List[str]:
        return [email.strip().lower() for email in self.admin_emails.split(",") if email.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
