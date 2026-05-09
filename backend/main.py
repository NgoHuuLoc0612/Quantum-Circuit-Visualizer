"""
Quantum Circuit Visualizer - FastAPI Backend
Enterprise-grade quantum circuit simulation and visualization API
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from api.circuits import router as circuits_router
from api.simulation import router as simulation_router
from api.transpiler import router as transpiler_router
from api.noise import router as noise_router
from api.analytics import router as analytics_router
from services.websocket_manager import ConnectionManager
from services.simulation_engine import SimulationEngine
from quantum.circuit_builder import CircuitBuilder

# Global state
manager = ConnectionManager()
engine = SimulationEngine()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    await engine.initialize()
    print("🔬 Quantum Circuit Visualizer Backend started")
    yield
    await engine.shutdown()
    print("🔬 Backend shutdown complete")

app = FastAPI(
    title="Quantum Circuit Visualizer API",
    description="Enterprise quantum circuit simulation, transpilation, and visualization platform",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )

# Mount routers
app.include_router(circuits_router, prefix="/api/v1/circuits", tags=["Circuits"])
app.include_router(simulation_router, prefix="/api/v1/simulation", tags=["Simulation"])
app.include_router(transpiler_router, prefix="/api/v1/transpiler", tags=["Transpiler"])
app.include_router(noise_router, prefix="/api/v1/noise", tags=["Noise Models"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time circuit simulation streaming"""
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            msg_type = message.get("type")
            payload = message.get("payload", {})
            
            if msg_type == "simulate":
                async for update in engine.simulate_stream(payload):
                    await manager.send_to_session(session_id, {
                        "type": "simulation_update",
                        "payload": update
                    })
                    
            elif msg_type == "transpile":
                result = await engine.transpile(payload)
                await manager.send_to_session(session_id, {
                    "type": "transpile_result",
                    "payload": result
                })
                
            elif msg_type == "validate":
                result = engine.validate_circuit(payload)
                await manager.send_to_session(session_id, {
                    "type": "validation_result",
                    "payload": result
                })
                
            elif msg_type == "statevector_evolution":
                async for state in engine.statevector_evolution_stream(payload):
                    await manager.send_to_session(session_id, {
                        "type": "statevector_update",
                        "payload": state
                    })
                    
            elif msg_type == "ping":
                await manager.send_to_session(session_id, {"type": "pong"})
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        await manager.send_to_session(session_id, {
            "type": "error",
            "payload": {"message": str(e)}
        })
        manager.disconnect(session_id)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "engine": await engine.status(),
        "active_sessions": manager.active_connections_count(),
        "version": "2.0.0"
    }


@app.get("/api/v1/gates/catalog")
async def get_gate_catalog():
    """Return the complete gate catalog with metadata"""
    return CircuitBuilder.get_gate_catalog()
