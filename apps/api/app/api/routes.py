# apps/api/app/api/routes.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/", tags=["Health Check"])
async def health_check():
    """Provides a simple health check endpoint."""
    return {"status": "healthy"}