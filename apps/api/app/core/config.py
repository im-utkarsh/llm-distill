# apps/api/app/core/config.py
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    """
    Manages application settings using Pydantic.
    It reads environment variables and can also load from a .env file.
    """
    PROJECT_NAME: str = "Distilled LLM Streaming API"
    API_V1_STR: str = "/api/v1"

    # CORS settings
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost"]

    class Config:
        case_sensitive = True

settings = Settings()