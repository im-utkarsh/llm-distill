# apps/api/app/main.py
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Local application imports
from app.api.routes import router as api_router
from app.llm.connection_manager import ConnectionManager
from app.llm.services import fifo_inference_worker
from app.core.config import settings

# Configure basic logging for the application.
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application startup and shutdown events using FastAPI's lifespan context.
    This is the modern replacement for @app.on_event("startup") and "shutdown".
    """
    # --- Startup Logic ---
    logging.info("✅ Application startup...")
    # Initialize shared state objects, accessible via `request.app.state`.
    app.state.cancellation_requests = set()
    app.state.inference_queue = asyncio.Queue()
    app.state.connection_manager = ConnectionManager(cancellation_requests=app.state.cancellation_requests)
    
    # Start the background inference worker task.
    app.state.worker_task = asyncio.create_task(fifo_inference_worker(app))
    
    yield # The application runs while the lifespan context is active.
    
    # --- Shutdown Logic ---
    logging.info("❌ Application shutdown...")
    # Gracefully cancel the background worker task.
    app.state.worker_task.cancel()

# Initialize the FastAPI application.
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for serving a distilled Gemma-2B model via a non-blocking, queued architecture.",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware to allow the frontend to communicate with this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, etc.)
    allow_headers=["*"], # Allow all headers
)

# Include the API router defined in `app/api/routes.py`.
app.include_router(api_router)

@app.get("/", tags=["Health Check"])
async def health_check():
    """
    Provides a simple health check endpoint to verify that the API is running
    and to get basic operational metrics.
    """
    return {
        "status": "healthy",
        "inference_queue_size": app.state.inference_queue.qsize(),
        "active_connections": len(app.state.connection_manager.get_active_connections()),
    }