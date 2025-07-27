# apps/api/app/main.py
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Updated local imports
from app.api.routes import router as api_router
from app.llm.connection_manager import ConnectionManager
from app.llm.services import fifo_inference_worker
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application startup and shutdown events."""
    logging.info("✅ Application startup...")
    app.state.cancellation_requests = set()
    app.state.inference_queue = asyncio.Queue()
    app.state.connection_manager = ConnectionManager(cancellation_requests=app.state.cancellation_requests)
    app.state.worker_task = asyncio.create_task(fifo_inference_worker(app))
    yield
    logging.info("❌ Application shutdown...")
    app.state.worker_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Update the health check to be more informative
@app.get("/", tags=["Health Check"])
async def health_check():
    """Provides a detailed health check endpoint."""
    return {
        "status": "healthy",
        "inference_queue_size": app.state.inference_queue.qsize(),
        "active_connections": len(app.state.connection_manager.get_active_connections()),
    }

app.include_router(api_router, prefix=settings.API_V1_STR)