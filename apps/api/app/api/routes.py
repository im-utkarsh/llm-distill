# apps/api/app/api/routes.py
import asyncio
import json
from fastapi import APIRouter, Request, HTTPException
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional

# Define the API router for chat-related endpoints.
router = APIRouter(prefix="/api/v1", tags=["Chat"])

class ChatRequest(BaseModel):
    """Defines the data model for an incoming chat request."""
    prompt: str
    context: Optional[str] = None
    client_id: str

@router.post("/chat/submit", status_code=202)
async def submit_chat_job(request: Request, chat_request: ChatRequest) -> Dict[str, str]:
    """
    Accepts a user prompt and context, validates the client connection,
    and queues the job for the background inference worker.

    Args:
        request: The incoming FastAPI request object.
        chat_request: The Pydantic model containing the prompt, context, and client ID.

    Returns:
        A confirmation message indicating the request has been received.
    
    Raises:
        HTTPException: If the provided client_id is not actively connected.
    """
    app_state = request.app.state
    client_id = chat_request.client_id

    # Ensure the client has an active SSE connection before queueing the job.
    if client_id not in app_state.connection_manager.get_active_connections():
        raise HTTPException(status_code=404, detail=f"Client '{client_id}' not connected.")

    # Retrieve the client-specific queue for streaming responses.
    response_queue = app_state.connection_manager.get_queue(client_id)
    
    # Prepare the job dictionary to be sent to the inference worker.
    job = chat_request.model_dump()
    job["response_queue"] = response_queue

    # If there was a pending cancellation for this client, clear it.
    app_state.cancellation_requests.discard(client_id)
    
    # Place the job in the global inference queue.
    await app_state.inference_queue.put(job)

    return {"message": "Chat request received and queued for processing."}

@router.get("/chat/stream/{client_id}")
async def stream_chat_responses(request: Request, client_id: str) -> EventSourceResponse:
    """
    Establishes a long-lived Server-Sent Events (SSE) connection.
    A client connects to this endpoint first to receive streamed model responses.

    Args:
        request: The incoming FastAPI request object.
        client_id: A unique identifier for the client establishing the connection.

    Returns:
        An EventSourceResponse that streams data to the connected client.
    """
    connection_manager = request.app.state.connection_manager
    # Register the new client and get their dedicated response queue.
    response_queue = await connection_manager.connect(client_id)

    async def event_generator():
        """
        An async generator that yields messages from the client's queue.
        This function runs until the stream is closed or the client disconnects.
        """
        try:
            while True:
                # Check if the client has closed the connection.
                if await request.is_disconnected():
                    break

                # Wait for a message from the inference worker.
                message = await response_queue.get()

                # The 'end' event signals the completion of the stream.
                if message.get("event") == "end":
                    yield {"event": "end", "data": json.dumps({"message": "Stream finished"})}
                    break
                
                # Stream individual tokens as they are generated.
                if "token" in message:
                    yield {"data": json.dumps(message)}

        finally:
            # Clean up the connection when the client disconnects or the stream ends.
            connection_manager.disconnect(client_id)

    return EventSourceResponse(event_generator())