# apps/api/app/llm/connection_manager.py
import asyncio
from typing import Dict, List, Optional, Set

class ConnectionManager:
    """
    Manages active client connections for Server-Sent Events (SSE).
    """
    def __init__(self, cancellation_requests: Set[str]):
        self.active_connections: Dict[str, asyncio.Queue] = {}
        self.cancellation_requests = cancellation_requests

    async def connect(self, client_id: str) -> asyncio.Queue:
        """Registers a new client and creates a dedicated queue for them."""
        queue = asyncio.Queue(maxsize=100)
        self.active_connections[client_id] = queue
        print(f"Client {client_id} connected. Total: {len(self.active_connections)}")
        return queue

    def disconnect(self, client_id: str):
        """Removes a client's connection and signals for task cancellation."""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            self.cancellation_requests.add(client_id)
            print(f"Client {client_id} disconnected. Signalled for cancellation.")

    def get_queue(self, client_id: str) -> Optional[asyncio.Queue]:
        """Retrieves the queue for a given client ID."""
        return self.active_connections.get(client_id)

    def get_active_connections(self) -> List[str]:
        """Returns a list of all active client IDs."""
        return list(self.active_connections.keys())