# apps/api/app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Distilled LLM Streaming API"
    API_V1_STR: str = "/api/v1"

    # Uvicorn server settings
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # Logging level
    LOG_LEVEL: str = "INFO"

    # CORS settings
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost"]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()