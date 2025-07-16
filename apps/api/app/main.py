# apps/api/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# A placeholder for settings
class Settings:
    PROJECT_NAME: str = "Distilled LLM Streaming API"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost"]

settings = Settings()

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Health Check"])
async def health_check():
    """Provides a simple health check endpoint."""
    return {"status": "healthy"}