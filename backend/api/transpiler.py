"""Transpiler API Router"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from quantum.circuit_builder import CircuitBuilder

router = APIRouter()

class TranspileRequest(BaseModel):
    circuit: Dict[str, Any]
    optimization_level: int = 2
    basis_gates: List[str] = ["cx", "u3", "measure"]
    coupling_map: Optional[List[List[int]]] = None

@router.post("/")
async def transpile_circuit(req: TranspileRequest):
    from qiskit import transpile
    from qiskit_aer import AerSimulator
    qc = CircuitBuilder.from_json(req.circuit)
    sim = AerSimulator()
    kwargs = {"optimization_level": req.optimization_level, "basis_gates": req.basis_gates}
    if req.coupling_map:
        kwargs["coupling_map"] = req.coupling_map
    qc_t = transpile(qc, sim, **kwargs)
    return {
        "transpiled": CircuitBuilder.to_json(qc_t),
        "original_metrics": CircuitBuilder.get_circuit_metrics(qc),
        "transpiled_metrics": CircuitBuilder.get_circuit_metrics(qc_t),
    }

@router.get("/backends")
async def list_backends():
    return {"backends": [
        {"id": "aer_statevector", "name": "Aer Statevector", "max_qubits": 32, "basis_gates": ["u3","cx","measure"]},
        {"id": "aer_qasm", "name": "Aer QASM", "max_qubits": 30, "basis_gates": ["u3","cx","measure"]},
        {"id": "aer_density", "name": "Aer Density Matrix", "max_qubits": 15, "basis_gates": ["u3","cx","measure"]},
    ]}
