"""
Simulation Engine - Qiskit Aer Integration
Real quantum simulation with statevector, density matrix, and shot-based backends
"""

import asyncio
import numpy as np
from typing import Dict, List, AsyncGenerator, Optional, Any
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from qiskit_aer.noise import (
    NoiseModel, depolarizing_error, thermal_relaxation_error,
    ReadoutError, pauli_error, amplitude_damping_error, phase_damping_error,
    QuantumError
)
from qiskit.quantum_info import (
    Statevector, DensityMatrix, Operator,
    entropy, concurrence, negativity, partial_trace, state_fidelity
)
from qiskit.result import Result
from quantum.circuit_builder import CircuitBuilder
import json
import time


class SimulationEngine:
    """
    Production quantum simulation engine supporting:
    - Statevector simulation (exact)
    - Shot-based simulation (sampling)
    - Density matrix simulation (open quantum systems)
    - Noise model simulation (hardware-realistic)
    - Unitary simulation
    - Real-time streaming of simulation progress
    """

    def __init__(self):
        self.statevector_sim = None
        self.shot_sim = None
        self.density_sim = None
        self.unitary_sim = None
        self._initialized = False

    async def initialize(self):
        """Initialize simulation backends"""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._init_backends)
        self._initialized = True

    def _init_backends(self):
        self.statevector_sim = AerSimulator(method="statevector")
        self.shot_sim = AerSimulator(method="automatic")
        self.density_sim = AerSimulator(method="density_matrix")
        self.unitary_sim = AerSimulator(method="unitary")

    async def shutdown(self):
        self._initialized = False

    async def status(self) -> Dict:
        return {
            "initialized": self._initialized,
            "backends": ["statevector", "shot-based", "density_matrix", "unitary"],
        }

    async def simulate_stream(self, payload: Dict) -> AsyncGenerator[Dict, None]:
        """Stream simulation results step-by-step"""
        circuit_data = payload.get("circuit", {})
        mode = payload.get("mode", "statevector")
        shots = payload.get("shots", 1024)
        noise_config = payload.get("noise_model")
        
        try:
            qc = CircuitBuilder.from_json(circuit_data)

            # Validate: cannot simulate empty circuit
            if qc.size() == 0:
                yield {"stage": "error", "error": "Circuit is empty — add at least one gate before simulating.", "progress": 0}
                return

            yield {
                "stage": "circuit_built",
                "progress": 10,
                "metrics": CircuitBuilder.get_circuit_metrics(qc)
            }
            
            if mode == "statevector":
                async for update in self._simulate_statevector_stream(qc):
                    yield update
            elif mode == "shots":
                async for update in self._simulate_shots_stream(qc, shots, noise_config):
                    yield update
            elif mode == "density_matrix":
                async for update in self._simulate_density_matrix_stream(qc, noise_config):
                    yield update
            elif mode == "unitary":
                async for update in self._simulate_unitary_stream(qc):
                    yield update
            elif mode == "evolution":
                async for update in self._simulate_evolution_stream(qc):
                    yield update
                    
        except Exception as e:
            yield {"stage": "error", "error": str(e), "progress": 0}

    async def _simulate_statevector_stream(self, qc: QuantumCircuit) -> AsyncGenerator[Dict, None]:
        """Simulate and stream statevector computation"""
        yield {"stage": "transpiling", "progress": 20}
        
        loop = asyncio.get_event_loop()
        
        # Transpile
        qc_sv = qc.copy()
        if qc_sv.num_clbits == 0:
            pass
        else:
            # Remove measurements for statevector
            qc_sv.remove_final_measurements(inplace=True)
        
        qc_t = await loop.run_in_executor(
            None, lambda: transpile(qc_sv, self.statevector_sim, optimization_level=1)
        )
        
        yield {"stage": "transpiled", "progress": 40, "transpiled_depth": qc_t.depth()}
        
        # Run simulation
        job = await loop.run_in_executor(
            None, lambda: self.statevector_sim.run(qc_t)
        )
        
        yield {"stage": "running", "progress": 70}
        
        result = await loop.run_in_executor(None, lambda: job.result())
        
        yield {"stage": "processing", "progress": 85}
        
        sv = result.get_statevector()
        amplitudes = sv.data
        
        # Compute probability distribution
        probs = np.abs(amplitudes) ** 2
        
        # Prepare basis states
        n = qc_sv.num_qubits
        basis_states = [format(i, f'0{n}b') for i in range(2**n)]
        
        # Bloch sphere data for each qubit
        bloch_data = self._compute_bloch_vectors(sv)
        
        # Entanglement analysis
        entanglement = self._compute_entanglement(sv, n)
        
        yield {
            "stage": "complete",
            "progress": 100,
            "type": "statevector",
            "statevector": {
                "amplitudes": [
                    {"re": float(a.real), "im": float(a.imag), 
                     "magnitude": float(abs(a)), "phase": float(np.angle(a)),
                     "probability": float(p), "basis": b}
                    for a, p, b in zip(amplitudes, probs, basis_states)
                ],
                "num_qubits": n,
                "num_states": len(amplitudes),
            },
            "bloch_vectors": bloch_data,
            "entanglement": entanglement,
            "entropy": self._compute_von_neumann_entropy(sv),
        }

    async def _simulate_shots_stream(
        self, qc: QuantumCircuit, shots: int, noise_config: Optional[Dict]
    ) -> AsyncGenerator[Dict, None]:
        """Shot-based simulation with optional noise"""
        yield {"stage": "preparing", "progress": 15}
        
        loop = asyncio.get_event_loop()
        
        # Build noise model if provided
        noise_model = None
        if noise_config:
            noise_model = self._build_noise_model(noise_config)
            yield {"stage": "noise_model_built", "progress": 25}
        
        # Ensure measurements
        qc_m = qc.copy()
        if not any(op.operation.name == "measure" for op in qc_m.data):
            qc_m.measure_all()
        
        sim = AerSimulator(method="automatic", noise_model=noise_model)
        qc_t = await loop.run_in_executor(
            None, lambda: transpile(qc_m, sim, optimization_level=2)
        )
        
        yield {"stage": "transpiled", "progress": 40}
        
        job = await loop.run_in_executor(
            None, lambda: sim.run(qc_t, shots=shots)
        )
        
        yield {"stage": "running", "progress": 70}
        
        result = await loop.run_in_executor(None, lambda: job.result())
        counts = result.get_counts()
        
        yield {"stage": "analyzing", "progress": 90}
        
        total = sum(counts.values())
        n = qc.num_qubits
        
        # Expectation values for Pauli operators
        pauli_expectations = {}
        
        distribution = [
            {
                "state": state,
                "count": count,
                "probability": count / total,
                "percentage": 100 * count / total
            }
            for state, count in sorted(counts.items(), key=lambda x: -x[1])
        ]
        
        yield {
            "stage": "complete",
            "progress": 100,
            "type": "shots",
            "shots": shots,
            "counts": counts,
            "distribution": distribution,
            "total_counts": total,
            "num_outcomes": len(counts),
            "max_probability": max(c / total for c in counts.values()),
            "entropy_from_counts": self._classical_entropy(
                [c / total for c in counts.values()]
            ),
            "noise_applied": noise_model is not None,
        }

    async def _simulate_density_matrix_stream(
        self, qc: QuantumCircuit, noise_config: Optional[Dict]
    ) -> AsyncGenerator[Dict, None]:
        """Density matrix simulation for open quantum systems"""
        yield {"stage": "preparing", "progress": 20}
        
        loop = asyncio.get_event_loop()
        
        noise_model = None
        if noise_config:
            noise_model = self._build_noise_model(noise_config)
        
        qc_dm = qc.copy()
        qc_dm.remove_final_measurements(inplace=True)
        
        sim = AerSimulator(method="density_matrix", noise_model=noise_model)
        qc_t = await loop.run_in_executor(
            None, lambda: transpile(qc_dm, sim)
        )
        qc_t.save_density_matrix()
        
        yield {"stage": "running", "progress": 60}
        
        job = await loop.run_in_executor(None, lambda: sim.run(qc_t))
        result = await loop.run_in_executor(None, lambda: job.result())
        
        dm = result.data()["density_matrix"]
        dm_data = dm.data
        
        n = qc.num_qubits
        
        # Purity = Tr(ρ²)
        purity = float(np.real(np.trace(dm_data @ dm_data)))
        
        # Von Neumann entropy
        vn_entropy = float(entropy(dm))
        
        yield {
            "stage": "complete",
            "progress": 100,
            "type": "density_matrix",
            "density_matrix": {
                "data": [
                    [{"re": float(v.real), "im": float(v.imag)} for v in row]
                    for row in dm_data
                ],
                "size": len(dm_data),
                "num_qubits": n,
            },
            "purity": purity,
            "is_pure": purity > 0.999,
            "von_neumann_entropy": vn_entropy,
            "trace": float(np.real(np.trace(dm_data))),
        }

    async def _simulate_unitary_stream(self, qc: QuantumCircuit) -> AsyncGenerator[Dict, None]:
        """Compute unitary matrix of the circuit"""
        yield {"stage": "preparing", "progress": 20}
        
        loop = asyncio.get_event_loop()
        qc_u = qc.copy()
        qc_u.remove_final_measurements(inplace=True)
        
        qc_t = await loop.run_in_executor(
            None, lambda: transpile(qc_u, self.unitary_sim)
        )
        qc_t.save_unitary()
        
        yield {"stage": "running", "progress": 60}
        
        job = await loop.run_in_executor(None, lambda: self.unitary_sim.run(qc_t))
        result = await loop.run_in_executor(None, lambda: job.result())
        
        unitary = result.data()["unitary"].data
        
        # Check properties
        product = unitary @ unitary.conj().T
        is_unitary = np.allclose(product, np.eye(len(unitary)), atol=1e-6)
        
        yield {
            "stage": "complete",
            "progress": 100,
            "type": "unitary",
            "unitary": {
                "data": [
                    [{"re": float(v.real), "im": float(v.imag), 
                      "magnitude": float(abs(v)), "phase": float(np.angle(v))} 
                     for v in row]
                    for row in unitary
                ],
                "size": len(unitary),
                "is_unitary": is_unitary,
                "determinant": {"re": float(np.linalg.det(unitary).real),
                                "im": float(np.linalg.det(unitary).imag)},
            }
        }

    async def _simulate_evolution_stream(self, qc: QuantumCircuit) -> AsyncGenerator[Dict, None]:
        """Step-by-step statevector evolution through circuit"""
        n = qc.num_qubits
        sv = Statevector.from_label("0" * n)
        
        yield {
            "stage": "evolution_start",
            "progress": 0,
            "step": 0,
            "statevector": self._sv_to_dict(sv, n),
            "bloch_vectors": self._compute_bloch_vectors(sv),
        }
        
        gates = [op for op in qc.data if op.operation.name not in ("measure", "barrier")]
        total = len(gates)
        
        for i, instruction in enumerate(gates):
            # Build single-gate circuit
            qc_step = QuantumCircuit(n)
            qc_step.append(instruction.operation, [qc.find_bit(q).index for q in instruction.qubits])
            
            try:
                sv = sv.evolve(qc_step)
            except Exception:
                pass
            
            progress = int(((i + 1) / total) * 100) if total > 0 else 100
            
            yield {
                "stage": "evolution_step",
                "progress": progress,
                "step": i + 1,
                "gate": {
                    "type": instruction.operation.name,
                    "qubits": [qc.find_bit(q).index for q in instruction.qubits],
                    "params": [float(p) for p in instruction.operation.params 
                              if not hasattr(p, 'name')],
                },
                "statevector": self._sv_to_dict(sv, n),
                "bloch_vectors": self._compute_bloch_vectors(sv),
            }
            await asyncio.sleep(0.05)  # Allow UI updates
        
        yield {"stage": "evolution_complete", "progress": 100}

    async def statevector_evolution_stream(self, payload: Dict) -> AsyncGenerator[Dict, None]:
        """Public API for statevector evolution streaming"""
        circuit_data = payload.get("circuit", {})
        qc = CircuitBuilder.from_json(circuit_data)
        async for update in self._simulate_evolution_stream(qc):
            yield update

    def _sv_to_dict(self, sv: Statevector, n: int) -> Dict:
        amplitudes = sv.data
        probs = np.abs(amplitudes) ** 2
        basis = [format(i, f'0{n}b') for i in range(2**n)]
        return {
            "amplitudes": [
                {"re": float(a.real), "im": float(a.imag),
                 "magnitude": float(abs(a)), "phase": float(np.angle(a)),
                 "probability": float(p), "basis": b}
                for a, p, b in zip(amplitudes, probs, basis)
            ]
        }

    def _compute_bloch_vectors(self, sv: Statevector) -> List[Dict]:
        """Compute Bloch sphere vectors for each qubit"""
        from qiskit.quantum_info import partial_trace
        n = int(np.log2(len(sv.data)))
        bloch = []
        
        for i in range(n):
            # Partial trace to get single-qubit density matrix
            keep = [i]
            trace_out = [j for j in range(n) if j != i]
            try:
                dm = partial_trace(sv, trace_out)
                dm_data = dm.data
                # Bloch vector components: <X>, <Y>, <Z>
                sx = float(np.real(np.trace(np.array([[0, 1], [1, 0]]) @ dm_data)))
                sy = float(np.real(np.trace(np.array([[0, -1j], [1j, 0]]) @ dm_data)))
                sz = float(np.real(np.trace(np.array([[1, 0], [0, -1]]) @ dm_data)))
                bloch.append({"qubit": i, "x": sx, "y": sy, "z": sz,
                              "purity": float(np.real(np.trace(dm_data @ dm_data)))})
            except Exception:
                bloch.append({"qubit": i, "x": 0, "y": 0, "z": 1, "purity": 1.0})
        
        return bloch

    def _compute_entanglement(self, sv: Statevector, n: int) -> Dict:
        """Compute entanglement measures"""
        result = {"von_neumann_entropy": {}, "concurrence": None}
        
        for i in range(n):
            trace_out = [j for j in range(n) if j != i]
            try:
                dm_i = partial_trace(sv, trace_out)
                result["von_neumann_entropy"][str(i)] = float(entropy(dm_i))
            except Exception:
                result["von_neumann_entropy"][str(i)] = 0.0
        
        if n == 2:
            try:
                result["concurrence"] = float(concurrence(sv))
            except Exception:
                result["concurrence"] = 0.0
        
        return result

    def _compute_von_neumann_entropy(self, sv: Statevector) -> float:
        try:
            dm = DensityMatrix(sv)
            return float(entropy(dm))
        except Exception:
            return 0.0

    def _classical_entropy(self, probs: List[float]) -> float:
        """Shannon entropy"""
        return float(-sum(p * np.log2(p + 1e-12) for p in probs if p > 0))

    def _build_noise_model(self, config: Dict) -> NoiseModel:
        """Build Qiskit noise model from config"""
        noise_model = NoiseModel()
        
        p1q = config.get("single_qubit_error", 0.001)
        p2q = config.get("two_qubit_error", 0.01)
        t1 = config.get("t1", 50e-6)
        t2 = config.get("t2", 70e-6)
        gate_time_1q = config.get("gate_time_1q", 50e-9)
        gate_time_2q = config.get("gate_time_2q", 300e-9)
        readout_error = config.get("readout_error", 0.02)
        
        # Depolarizing errors
        if p1q > 0:
            error_1q = depolarizing_error(p1q, 1)
            noise_model.add_all_qubit_quantum_error(error_1q, ["h", "x", "y", "z", "s", "t", "rx", "ry", "rz", "u3"])
        
        if p2q > 0:
            error_2q = depolarizing_error(p2q, 2)
            noise_model.add_all_qubit_quantum_error(error_2q, ["cx", "cz", "swap"])
        
        # Thermal relaxation
        if t1 > 0 and t2 > 0:
            thermal_1q = thermal_relaxation_error(t1, t2, gate_time_1q)
            thermal_2q = thermal_relaxation_error(t1, t2, gate_time_2q).expand(
                thermal_relaxation_error(t1, t2, gate_time_2q)
            )
            noise_model.add_all_qubit_quantum_error(thermal_1q, ["h", "x", "y", "z", "rx", "ry", "rz"])
            noise_model.add_all_qubit_quantum_error(thermal_2q, ["cx", "cz"])
        
        # Readout error
        if readout_error > 0:
            p0g1 = readout_error
            p1g0 = readout_error * 0.8
            ro_err = ReadoutError([[1 - p0g1, p0g1], [p1g0, 1 - p1g0]])
            noise_model.add_all_qubit_readout_error(ro_err)
        
        return noise_model

    def validate_circuit(self, payload: Dict) -> Dict:
        """Validate circuit structure and return diagnostics"""
        try:
            qc = CircuitBuilder.from_json(payload.get("circuit", {}))
            metrics = CircuitBuilder.get_circuit_metrics(qc)
            
            warnings = []
            errors = []
            
            if metrics["depth"] > 1000:
                warnings.append({"code": "HIGH_DEPTH", "message": f"Circuit depth {metrics['depth']} may cause decoherence"})
            if metrics["t_count"] > 100:
                warnings.append({"code": "HIGH_T_COUNT", "message": f"T-count {metrics['t_count']} affects fault-tolerance overhead"})
            if metrics["num_qubits"] > 30:
                warnings.append({"code": "LARGE_CIRCUIT", "message": "Statevector simulation may require excessive memory"})
            
            return {
                "valid": True,
                "metrics": metrics,
                "warnings": warnings,
                "errors": errors,
            }
        except Exception as e:
            return {"valid": False, "error": str(e)}

    async def transpile(self, payload: Dict) -> Dict:
        """Transpile circuit for target backend"""
        from qiskit.transpiler import PassManager
        from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
        
        qc = CircuitBuilder.from_json(payload.get("circuit", {}))
        optimization_level = payload.get("optimization_level", 2)
        basis_gates = payload.get("basis_gates", ["cx", "u3", "measure"])
        
        loop = asyncio.get_event_loop()
        
        sim = AerSimulator()
        qc_t = await loop.run_in_executor(
            None,
            lambda: transpile(qc, sim, optimization_level=optimization_level,
                            basis_gates=basis_gates)
        )
        
        original_metrics = CircuitBuilder.get_circuit_metrics(qc)
        transpiled_metrics = CircuitBuilder.get_circuit_metrics(qc_t)
        transpiled_json = CircuitBuilder.to_json(qc_t)
        
        return {
            "transpiled_circuit": transpiled_json,
            "original_metrics": original_metrics,
            "transpiled_metrics": transpiled_metrics,
            "reduction": {
                "depth": original_metrics["depth"] - transpiled_metrics["depth"],
                "size": original_metrics["size"] - transpiled_metrics["size"],
            }
        }
