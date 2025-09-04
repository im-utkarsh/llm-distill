# apps/api/app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    """
    Centralized application configuration using Pydantic's BaseSettings.
    Values are loaded from a .env file or environment variables.
    """
    # --- Project Metadata ---
    PROJECT_NAME: str = "Distilled LLM Streaming API"
    API_V1_STR: str = "/api/v1"

    # --- Server Configuration ---
    # Host and port for the Uvicorn server. '0.0.0.0' makes it accessible on the network.
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # --- Logging ---
    # Set the application-wide logging level (e.g., "INFO", "DEBUG").
    LOG_LEVEL: str = "INFO"

    # --- CORS (Cross-Origin Resource Sharing) ---
    # A list of allowed origins for CORS. Essential for frontend-backend communication.
    CORS_ORIGINS: List[str] = ["http://localhost:5174", "http://localhost"]

    # Pydantic settings configuration.
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

# Create a single, importable instance of the settings.
settings = Settings()