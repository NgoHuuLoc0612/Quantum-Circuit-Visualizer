"""
WebSocket Connection Manager
Handles multiple concurrent simulation sessions with pub/sub messaging
"""

from fastapi import WebSocket
from typing import Dict, Set
import json
import asyncio


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_subscriptions: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)
        self.session_subscriptions.pop(session_id, None)

    async def send_to_session(self, session_id: str, data: dict):
        ws = self.active_connections.get(session_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data, default=str))
            except Exception:
                self.disconnect(session_id)

    async def broadcast(self, data: dict):
        dead = []
        for sid, ws in self.active_connections.items():
            try:
                await ws.send_text(json.dumps(data, default=str))
            except Exception:
                dead.append(sid)
        for sid in dead:
            self.disconnect(sid)

    def active_connections_count(self) -> int:
        return len(self.active_connections)
