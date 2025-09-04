# apps/api/app/llm/connection_manager.py
import asyncio
from typing import Dict, List, Optional, Set

class ConnectionManager:
    """
    Manages active client connections for Server-Sent Events (SSE).

    This class maintains a dictionary of active clients, each with a dedicated
    asyncio.Queue for receiving inference results. It also handles connection
    and disconnection logic, including signaling for task cancellation.
    """
    def __init__(self, cancellation_requests: Set[str]):
        """
        Initializes the ConnectionManager.

        Args:
            cancellation_requests: A shared set used to signal that an inference
                                   task for a disconnected client should be cancelled.
        """
        self.active_connections: Dict[str, asyncio.Queue] = {}
        self.cancellation_requests = cancellation_requests

    async def connect(self, client_id: str) -> asyncio.Queue:
        """
        Registers a new client and creates a dedicated message queue for them.

        Args:
            client_id: The unique identifier for the connecting client.

        Returns:
            The asyncio.Queue object for the new client.
        """
        # Create a queue with a buffer size to handle backpressure.
        queue = asyncio.Queue(maxsize=100)
        self.active_connections[client_id] = queue
        print(f"Client {client_id} connected. Total: {len(self.active_connections)}")
        return queue

    def disconnect(self, client_id: str):
        """
        Removes a client's connection and signals for their task to be cancelled.

        Args:
            client_id: The unique identifier for the disconnecting client.
        """
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            # Add the client_id to the shared cancellation set. The inference
            # worker checks this set to stop processing for disconnected clients.
            self.cancellation_requests.add(client_id)
            print(f"Client {client_id} disconnected. Signalled for cancellation.")

    def get_queue(self, client_id: str) -> Optional[asyncio.Queue]:
        """
        Retrieves the message queue for a given client ID.

        Args:
            client_id: The client's unique identifier.

        Returns:
            The asyncio.Queue for the client, or None if the client is not connected.
        """
        return self.active_connections.get(client_id)

    def get_active_connections(self) -> List[str]:
        """Returns a list of all active client IDs."""
        return list(self.active_connections.keys())