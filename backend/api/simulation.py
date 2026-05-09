"""
Simulation API Router
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from quantum.circuit_builder import CircuitBuilder
from services.simulation_engine import SimulationEngine

router = APIRouter()
_engine = SimulationEngine()


class SimulationRequest(BaseModel):
    circuit: Dict[str, Any]
    mode: str = "statevector"
    shots: int = 1024
    noise_model: Optional[Dict[str, Any]] = None
    optimization_level: int = 1


@router.post("/run")
async def run_simulation(req: SimulationRequest):
    results = []
    async for update in _engine.simulate_stream(req.dict()):
        results.append(update)
    # Return last complete result
    for r in reversed(results):
        if r.get("stage") == "complete":
            return r
    return {"error": "Simulation failed", "stages": results}


@router.post("/expectation")
async def compute_expectation(payload: Dict[str, Any]):
    """Compute expectation value of Pauli operators"""
    from qiskit.quantum_info import SparsePauliOp, Statevector
    circuit_data = payload.get("circuit", {})
    operators = payload.get("operators", ["ZZ", "XX", "YY"])
    qc = CircuitBuilder.from_json(circuit_data)
    qc.remove_final_measurements(inplace=True)
    sv = Statevector(qc)
    results = {}
    for op_str in operators:
        try:
            op = SparsePauliOp(op_str)
            exp_val = sv.expectation_value(op)
            results[op_str] = {"re": float(exp_val.real), "im": float(exp_val.imag)}
        except Exception as e:
            results[op_str] = {"error": str(e)}
    return {"expectation_values": results}


@router.post("/fidelity")
async def compute_fidelity(payload: Dict[str, Any]):
    """Compute state fidelity between two circuits"""
    from qiskit.quantum_info import Statevector, state_fidelity
    c1 = CircuitBuilder.from_json(payload["circuit1"])
    c2 = CircuitBuilder.from_json(payload["circuit2"])
    c1.remove_final_measurements(inplace=True)
    c2.remove_final_measurements(inplace=True)
    sv1 = Statevector(c1)
    sv2 = Statevector(c2)
    fid = float(state_fidelity(sv1, sv2))
    return {"fidelity": fid, "infidelity": 1 - fid}
