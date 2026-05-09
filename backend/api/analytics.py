"""Analytics API Router"""
from fastapi import APIRouter
from typing import Dict, Any
from quantum.circuit_builder import CircuitBuilder
import numpy as np

router = APIRouter()

@router.post("/analyze")
async def analyze_circuit(payload: Dict[str, Any]):
    qc = CircuitBuilder.from_json(payload.get("circuit", {}))
    metrics = CircuitBuilder.get_circuit_metrics(qc)
    
    # Gate type distribution
    gate_counts = metrics.get("gate_counts", {})
    total_gates = sum(gate_counts.values())
    gate_distribution = {k: {"count": v, "fraction": v/max(total_gates,1)} for k, v in gate_counts.items()}
    
    # Parallelism estimate
    parallelism = metrics["size"] / max(metrics["depth"], 1)
    
    # Clifford vs non-Clifford
    clifford_gates = {"h","x","y","z","s","sdg","cx","cy","cz","swap"}
    clifford_count = sum(v for k,v in gate_counts.items() if k in clifford_gates)
    non_clifford_count = total_gates - clifford_count
    
    return {
        "metrics": metrics,
        "gate_distribution": gate_distribution,
        "parallelism": round(parallelism, 3),
        "clifford_fraction": clifford_count / max(total_gates, 1),
        "non_clifford_fraction": non_clifford_count / max(total_gates, 1),
        "estimated_runtime_ns": metrics["depth"] * 50,  # ~50ns per layer
        "fault_tolerance_overhead": metrics.get("t_count", 0) * 100,
    }

@router.post("/compare")
async def compare_circuits(payload: Dict[str, Any]):
    circuits = payload.get("circuits", [])
    results = []
    for c in circuits:
        qc = CircuitBuilder.from_json(c)
        metrics = CircuitBuilder.get_circuit_metrics(qc)
        results.append({"name": c.get("name", "unnamed"), "metrics": metrics})
    return {"comparison": results}
