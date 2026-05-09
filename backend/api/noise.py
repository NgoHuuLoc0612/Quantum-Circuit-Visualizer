"""Noise Model API Router"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
router = APIRouter()

class NoiseConfig(BaseModel):
    single_qubit_error: float = 0.001
    two_qubit_error: float = 0.01
    t1: float = 50e-6
    t2: float = 70e-6
    gate_time_1q: float = 50e-9
    gate_time_2q: float = 300e-9
    readout_error: float = 0.02

@router.get("/presets")
async def get_noise_presets():
    return {"presets": [
        {"id": "ideal", "name": "Ideal (No Noise)", "config": {"single_qubit_error":0,"two_qubit_error":0,"t1":1e3,"t2":1e3,"readout_error":0}},
        {"id": "low_noise", "name": "Low Noise", "config": {"single_qubit_error":0.0001,"two_qubit_error":0.001,"t1":100e-6,"t2":150e-6,"readout_error":0.005}},
        {"id": "medium_noise", "name": "Medium Noise (Near-term)", "config": {"single_qubit_error":0.001,"two_qubit_error":0.01,"t1":50e-6,"t2":70e-6,"readout_error":0.02}},
        {"id": "high_noise", "name": "High Noise (NISQ)", "config": {"single_qubit_error":0.005,"two_qubit_error":0.05,"t1":20e-6,"t2":30e-6,"readout_error":0.05}},
        {"id": "ibm_washington", "name": "IBM Washington (approx)", "config": {"single_qubit_error":0.0003,"two_qubit_error":0.006,"t1":80e-6,"t2":100e-6,"readout_error":0.01}},
    ]}

@router.post("/validate")
async def validate_noise_config(config: NoiseConfig):
    warnings = []
    if config.t2 > 2 * config.t1:
        warnings.append("T2 cannot exceed 2*T1 physically")
    return {"valid": True, "warnings": warnings, "config": config.dict()}
