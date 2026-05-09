"""
Circuits API Router - CRUD and analysis for quantum circuits
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from quantum.circuit_builder import CircuitBuilder
import uuid, json, time

router = APIRouter()

# In-memory circuit store (replace with DB in production)
CIRCUIT_STORE: Dict[str, dict] = {}


class CircuitCreateRequest(BaseModel):
    name: str
    num_qubits: int
    num_clbits: int = 0
    gates: List[Dict[str, Any]] = []
    parameters: List[Dict[str, Any]] = []
    registers: List[Dict[str, Any]] = []
    description: str = ""
    tags: List[str] = []


class CircuitUpdateRequest(BaseModel):
    name: Optional[str] = None
    gates: Optional[List[Dict[str, Any]]] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


@router.post("/")
async def create_circuit(req: CircuitCreateRequest):
    circuit_id = str(uuid.uuid4())
    qc_data = req.dict()
    
    try:
        qc = CircuitBuilder.from_json(qc_data)
        metrics = CircuitBuilder.get_circuit_metrics(qc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid circuit: {e}")
    
    record = {
        "id": circuit_id,
        "created_at": time.time(),
        "updated_at": time.time(),
        **qc_data,
        "metrics": metrics,
    }
    CIRCUIT_STORE[circuit_id] = record
    return record


@router.get("/")
async def list_circuits(skip: int = 0, limit: int = 50, tag: Optional[str] = None):
    circuits = list(CIRCUIT_STORE.values())
    if tag:
        circuits = [c for c in circuits if tag in c.get("tags", [])]
    return {"circuits": circuits[skip:skip+limit], "total": len(circuits)}


@router.get("/templates/list")
async def list_templates():
    templates = [
        {"id": "bell_state", "name": "Bell State", "num_qubits": 2, "description": "Maximally entangled 2-qubit state"},
        {"id": "ghz_3", "name": "GHZ State (3 qubits)", "num_qubits": 3, "description": "Greenberger-Horne-Zeilinger state"},
        {"id": "ghz_4", "name": "GHZ State (4 qubits)", "num_qubits": 4, "description": "4-qubit GHZ"},
        {"id": "qft_3", "name": "QFT (3 qubits)", "num_qubits": 3, "description": "Quantum Fourier Transform"},
        {"id": "qft_4", "name": "QFT (4 qubits)", "num_qubits": 4, "description": "4-qubit QFT"},
        {"id": "grover_2", "name": "Grover Search (2 qubits)", "num_qubits": 2, "description": "Grover's algorithm"},
        {"id": "teleportation", "name": "Quantum Teleportation", "num_qubits": 3, "description": "3-qubit teleportation protocol"},
        {"id": "superdense", "name": "Superdense Coding", "num_qubits": 2, "description": "2 classical bits via 1 qubit"},
        {"id": "random_5", "name": "Random 5-qubit", "num_qubits": 5, "description": "Random circuit benchmark"},
    ]
    return {"templates": templates}


@router.get("/templates/{template_id}")
async def get_template(template_id: str):
    import numpy as np
    
    templates = {
        "bell_state": lambda: CircuitBuilder.create_bell_state(),
        "ghz_3": lambda: CircuitBuilder.create_ghz_state(3),
        "ghz_4": lambda: CircuitBuilder.create_ghz_state(4),
        "qft_3": lambda: CircuitBuilder.create_qft(3),
        "qft_4": lambda: CircuitBuilder.create_qft(4),
        "grover_2": lambda: CircuitBuilder.create_grover(2, [3]),
        "teleportation": _make_teleportation,
        "superdense": _make_superdense,
        "random_5": lambda: _make_random(5, 15),
    }
    
    builder = templates.get(template_id)
    if not builder:
        raise HTTPException(status_code=404, detail="Template not found")
    
    try:
        qc = builder()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template build failed: {e}")
    try:
        circuit_json = CircuitBuilder.to_json(qc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Circuit serialization failed: {e}")
    try:
        circuit_json["metrics"] = CircuitBuilder.get_circuit_metrics(qc)
    except Exception:
        circuit_json["metrics"] = None
    return circuit_json

@router.get("/{circuit_id}")
async def get_circuit(circuit_id: str):
    circuit = CIRCUIT_STORE.get(circuit_id)
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
    return circuit


@router.put("/{circuit_id}")
async def update_circuit(circuit_id: str, req: CircuitUpdateRequest):
    circuit = CIRCUIT_STORE.get(circuit_id)
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
    update = req.dict(exclude_none=True)
    circuit.update(update)
    circuit["updated_at"] = time.time()
    if "gates" in update or "num_qubits" in update:
        try:
            qc = CircuitBuilder.from_json(circuit)
            circuit["metrics"] = CircuitBuilder.get_circuit_metrics(qc)
        except Exception:
            pass
    return circuit


@router.delete("/{circuit_id}")
async def delete_circuit(circuit_id: str):
    if circuit_id not in CIRCUIT_STORE:
        raise HTTPException(status_code=404, detail="Circuit not found")
    del CIRCUIT_STORE[circuit_id]
    return {"deleted": circuit_id}


@router.get("/{circuit_id}/metrics")
async def get_circuit_metrics(circuit_id: str):
    circuit = CIRCUIT_STORE.get(circuit_id)
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
    qc = CircuitBuilder.from_json(circuit)
    return CircuitBuilder.get_circuit_metrics(qc)


@router.get("/{circuit_id}/qasm")
async def get_qasm(circuit_id: str, version: int = 2):
    circuit = CIRCUIT_STORE.get(circuit_id)
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
    qc = CircuitBuilder.from_json(circuit)
    if version == 3:
        try:
            from qiskit.qasm3 import dumps
            return {"qasm": dumps(qc), "version": 3}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"QASM3 export failed: {e}")
    try:
        import qiskit.qasm2 as qasm2
        return {"qasm": qasm2.dumps(qc), "version": 2}
    except Exception:
        return {"qasm": qc.qasm(), "version": 2}


@router.post("/{circuit_id}/clone")
async def clone_circuit(circuit_id: str, new_name: Optional[str] = None):
    circuit = CIRCUIT_STORE.get(circuit_id)
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
    new_id = str(uuid.uuid4())
    clone = dict(circuit)
    clone["id"] = new_id
    clone["name"] = new_name or f"{circuit['name']} (copy)"
    clone["created_at"] = time.time()
    clone["updated_at"] = time.time()
    CIRCUIT_STORE[new_id] = clone
    return clone





def _make_teleportation():
    from qiskit import QuantumCircuit
    qc = QuantumCircuit(3, 3)
    # Create Bell pair between qubits 1 and 2
    qc.h(1); qc.cx(1, 2)
    # Bell measurement on qubits 0 and 1
    qc.cx(0, 1); qc.h(0)
    qc.measure([0, 1], [0, 1])
    # Conditional corrections
    qc.cx(1, 2); qc.cz(0, 2)
    qc.measure(2, 2)
    return qc


def _make_superdense():
    from qiskit import QuantumCircuit
    qc = QuantumCircuit(2, 2)
    qc.h(0); qc.cx(0, 1)
    # Encode 11
    qc.x(0); qc.z(0)
    # Decode
    qc.cx(0, 1); qc.h(0)
    qc.measure([0, 1], [0, 1])
    return qc


def _make_random(n: int, depth: int):
    from qiskit.circuit.random import random_circuit
    return random_circuit(n, depth, measure=True)
