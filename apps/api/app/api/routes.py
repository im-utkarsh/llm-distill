# apps/api/app/api/routes.py
import asyncio
import json
from fastapi import APIRouter, Request, HTTPException
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str
    context: str | None = None
    client_id: str

@router.post("/chat/submit")
async def submit_chat_job(request: Request, chat_request: ChatRequest) -> Dict[str, str]:
    """Accepts a prompt and queues it for the inference worker."""
    app_state = request.app.state
    client_id = chat_request.client_id

    if client_id not in app_state.connection_manager.get_active_connections():
        raise HTTPException(status_code=404, detail=f"Client '{client_id}' not connected.")

    response_queue = app_state.connection_manager.get_queue(client_id)
    job = chat_request.model_dump()
    job["response_queue"] = response_queue

    app_state.cancellation_requests.discard(client_id)
    await app_state.inference_queue.put(job)

    return {"message": "Chat request received."}

@router.get("/chat/stream/{client_id}")
async def stream_chat_responses(request: Request, client_id: str) -> EventSourceResponse:
    """Establishes a long-lived SSE connection to stream model responses."""
    connection_manager = request.app.state.connection_manager
    response_queue = await connection_manager.connect(client_id)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break

                message = await response_queue.get()

                if message.get("event") == "end":
                    yield {"event": "end", "data": json.dumps({"message": "Stream finished"})}
                    break

                if "token" in message:
                    yield {"data": json.dumps(message)}

        finally:
            connection_manager.disconnect(client_id)

    return EventSourceResponse(event_generator())