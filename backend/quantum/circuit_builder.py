"""
Quantum Circuit Builder - Core Qiskit Integration
Full-featured circuit construction, manipulation, and analysis
"""

from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit.circuit.library import (
    HGate, XGate, YGate, ZGate, SGate, TGate, CXGate, CZGate, CCXGate,
    SwapGate, RXGate, RYGate, RZGate, U1Gate, U2Gate, U3Gate,
    PhaseGate, CPhaseGate, IGate, SdgGate, TdgGate, SXGate, SXdgGate,
    ECRGate, DCXGate, iSwapGate, XXPlusYYGate, XXMinusYYGate,
    QFT, GroverOperator, PhaseOracle, MCMT
)
from qiskit.quantum_info import (
    Statevector, DensityMatrix, Operator, Clifford, 
    entropy, concurrence, negativity, partial_trace,
    random_statevector, random_unitary
)
from qiskit.circuit import Parameter, ParameterVector
from qiskit.circuit.quantumcircuit import QuantumCircuit
from qiskit.converters import circuit_to_dag, dag_to_circuit
from qiskit.dagcircuit import DAGCircuit
import numpy as np
from typing import Dict, List, Optional, Any, Tuple, Union
import json
import re


class CircuitBuilder:
    """
    Enterprise-grade quantum circuit builder with full Qiskit integration.
    Supports all standard and advanced gate sets, parameterized circuits,
    subcircuits, barriers, measurements, and circuit analysis.
    """

    GATE_CATALOG = {
        # Single-qubit gates
        "H": {
            "name": "Hadamard", "qubits": 1, "params": 0,
            "description": "Creates superposition: |0⟩ → (|0⟩+|1⟩)/√2",
            "matrix": [[1/np.sqrt(2), 1/np.sqrt(2)], [1/np.sqrt(2), -1/np.sqrt(2)]],
            "category": "single", "color": "#6366f1"
        },
        "X": {
            "name": "Pauli-X (NOT)", "qubits": 1, "params": 0,
            "description": "Bit flip: |0⟩↔|1⟩",
            "matrix": [[0, 1], [1, 0]],
            "category": "single", "color": "#ef4444"
        },
        "Y": {
            "name": "Pauli-Y", "qubits": 1, "params": 0,
            "description": "Combined bit+phase flip",
            "matrix": [[0, -1j], [1j, 0]],
            "category": "single", "color": "#f59e0b"
        },
        "Z": {
            "name": "Pauli-Z", "qubits": 1, "params": 0,
            "description": "Phase flip: |1⟩ → -|1⟩",
            "matrix": [[1, 0], [0, -1]],
            "category": "single", "color": "#10b981"
        },
        "S": {
            "name": "S Gate (Phase)", "qubits": 1, "params": 0,
            "description": "π/2 phase rotation",
            "category": "single", "color": "#06b6d4"
        },
        "T": {
            "name": "T Gate (π/8)", "qubits": 1, "params": 0,
            "description": "π/4 phase rotation",
            "category": "single", "color": "#8b5cf6"
        },
        "SDG": {"name": "S†", "qubits": 1, "params": 0, "category": "single", "color": "#06b6d4"},
        "TDG": {"name": "T†", "qubits": 1, "params": 0, "category": "single", "color": "#8b5cf6"},
        "SX": {"name": "√X", "qubits": 1, "params": 0, "category": "single", "color": "#ec4899"},
        "SXDG": {"name": "√X†", "qubits": 1, "params": 0, "category": "single", "color": "#ec4899"},
        "I": {"name": "Identity", "qubits": 1, "params": 0, "category": "single", "color": "#64748b"},
        
        # Rotation gates
        "RX": {
            "name": "RX(θ)", "qubits": 1, "params": 1,
            "param_names": ["theta"],
            "description": "X-axis rotation by angle θ",
            "category": "rotation", "color": "#f87171"
        },
        "RY": {
            "name": "RY(θ)", "qubits": 1, "params": 1,
            "param_names": ["theta"],
            "description": "Y-axis rotation by angle θ",
            "category": "rotation", "color": "#fbbf24"
        },
        "RZ": {
            "name": "RZ(θ)", "qubits": 1, "params": 1,
            "param_names": ["theta"],
            "description": "Z-axis rotation by angle θ",
            "category": "rotation", "color": "#34d399"
        },
        "P": {
            "name": "Phase(λ)", "qubits": 1, "params": 1,
            "param_names": ["lambda"],
            "category": "rotation", "color": "#60a5fa"
        },
        "U1": {"name": "U1(λ)", "qubits": 1, "params": 1, "param_names": ["lambda"], "category": "rotation", "color": "#a78bfa"},
        "U2": {"name": "U2(φ,λ)", "qubits": 1, "params": 2, "param_names": ["phi", "lambda"], "category": "rotation", "color": "#a78bfa"},
        "U3": {"name": "U3(θ,φ,λ)", "qubits": 1, "params": 3, "param_names": ["theta", "phi", "lambda"], "category": "rotation", "color": "#a78bfa"},
        
        # Two-qubit gates
        "CX": {
            "name": "CNOT", "qubits": 2, "params": 0,
            "description": "Controlled-NOT: flips target if control=|1⟩",
            "category": "two_qubit", "color": "#f97316"
        },
        "CZ": {"name": "CZ", "qubits": 2, "params": 0, "category": "two_qubit", "color": "#84cc16"},
        "CY": {"name": "CY", "qubits": 2, "params": 0, "category": "two_qubit", "color": "#f59e0b"},
        "SWAP": {"name": "SWAP", "qubits": 2, "params": 0, "category": "two_qubit", "color": "#14b8a6"},
        "ECR": {"name": "ECR", "qubits": 2, "params": 0, "category": "two_qubit", "color": "#f43f5e"},
        "DCX": {"name": "DCX", "qubits": 2, "params": 0, "category": "two_qubit", "color": "#8b5cf6"},
        "ISWAP": {"name": "iSWAP", "qubits": 2, "params": 0, "category": "two_qubit", "color": "#0ea5e9"},
        "CP": {"name": "CP(θ)", "qubits": 2, "params": 1, "param_names": ["theta"], "category": "two_qubit", "color": "#d946ef"},
        "CRX": {"name": "CRX(θ)", "qubits": 2, "params": 1, "param_names": ["theta"], "category": "two_qubit", "color": "#f97316"},
        "CRY": {"name": "CRY(θ)", "qubits": 2, "params": 1, "param_names": ["theta"], "category": "two_qubit", "color": "#f97316"},
        "CRZ": {"name": "CRZ(θ)", "qubits": 2, "params": 1, "param_names": ["theta"], "category": "two_qubit", "color": "#f97316"},
        "RZZGATE": {"name": "RZZ(θ)", "qubits": 2, "params": 1, "param_names": ["theta"], "category": "two_qubit", "color": "#22d3ee"},
        
        # Three-qubit gates
        "CCX": {"name": "Toffoli (CCX)", "qubits": 3, "params": 0, "category": "three_qubit", "color": "#e879f9"},
        "CSWAP": {"name": "Fredkin (CSWAP)", "qubits": 3, "params": 0, "category": "three_qubit", "color": "#a3e635"},
        
        # Measurement
        "MEASURE": {"name": "Measure", "qubits": 1, "params": 0, "category": "measurement", "color": "#94a3b8"},
        "BARRIER": {"name": "Barrier", "qubits": -1, "params": 0, "category": "control", "color": "#475569"},
        "RESET": {"name": "Reset", "qubits": 1, "params": 0, "category": "control", "color": "#64748b"},
    }

    @classmethod
    def get_gate_catalog(cls) -> Dict:
        """Return complete gate catalog with metadata"""
        catalog = {}
        for gate_id, gate_info in cls.GATE_CATALOG.items():
            gate_data = dict(gate_info)
            if "matrix" in gate_data:
                matrix = gate_data["matrix"]
                if isinstance(matrix, np.ndarray):
                    gate_data["matrix"] = matrix.tolist()
                elif isinstance(matrix, list):
                    # Convert complex numbers
                    gate_data["matrix"] = [
                        [{"re": complex(v).real, "im": complex(v).imag} for v in row]
                        for row in matrix
                    ]
            catalog[gate_id] = gate_data
        return catalog

    @classmethod
    def from_json(cls, circuit_data: Dict) -> QuantumCircuit:
        """
        Build a QuantumCircuit from JSON circuit description.
        Supports parameterized gates, registers, barriers, and measurements.
        """
        n_qubits = circuit_data.get("num_qubits", 1)
        n_cbits = circuit_data.get("num_clbits", 0)
        name = circuit_data.get("name", "circuit")
        
        # Build registers
        registers = circuit_data.get("registers", [])
        qregs = []
        cregs = []
        
        if registers:
            for reg in registers:
                if reg["type"] == "quantum":
                    qregs.append(QuantumRegister(reg["size"], reg["name"]))
                else:
                    cregs.append(ClassicalRegister(reg["size"], reg["name"]))
            qc = QuantumCircuit(*qregs, *cregs, name=name)
        else:
            qc = QuantumCircuit(n_qubits, n_cbits, name=name)
        
        # Add parameters
        param_map = {}
        for p in circuit_data.get("parameters", []):
            param_map[p["name"]] = Parameter(p["name"])
        
        # Add gates
        for gate_op in circuit_data.get("gates", []):
            cls._apply_gate(qc, gate_op, param_map)
        
        return qc

    @classmethod
    def _apply_gate(cls, qc: QuantumCircuit, gate_op: Dict, param_map: Dict):
        """Apply a single gate operation to the circuit"""
        gate_type = gate_op["type"].upper()
        qubits = gate_op.get("qubits", [])
        params = gate_op.get("params", [])
        
        # Resolve parameters (could be float or named parameter)
        resolved_params = []
        for p in params:
            if isinstance(p, str) and p in param_map:
                resolved_params.append(param_map[p])
            elif isinstance(p, (int, float)):
                resolved_params.append(float(p))
            else:
                resolved_params.append(p)
        
        gate_map = {
            "H": lambda q: qc.h(q[0]),
            "X": lambda q: qc.x(q[0]),
            "Y": lambda q: qc.y(q[0]),
            "Z": lambda q: qc.z(q[0]),
            "S": lambda q: qc.s(q[0]),
            "T": lambda q: qc.t(q[0]),
            "SDG": lambda q: qc.sdg(q[0]),
            "TDG": lambda q: qc.tdg(q[0]),
            "SX": lambda q: qc.sx(q[0]),
            "SXDG": lambda q: qc.sxdg(q[0]),
            "I": lambda q: qc.id(q[0]),
            "RX": lambda q: qc.rx(resolved_params[0], q[0]),
            "RY": lambda q: qc.ry(resolved_params[0], q[0]),
            "RZ": lambda q: qc.rz(resolved_params[0], q[0]),
            "P": lambda q: qc.p(resolved_params[0], q[0]),
            "U1": lambda q: qc.u1(resolved_params[0], q[0]),
            "U2": lambda q: qc.u2(resolved_params[0], resolved_params[1], q[0]),
            "U3": lambda q: qc.u(resolved_params[0], resolved_params[1], resolved_params[2], q[0]),
            "CX": lambda q: qc.cx(q[0], q[1]),
            "CNOT": lambda q: qc.cx(q[0], q[1]),
            "CZ": lambda q: qc.cz(q[0], q[1]),
            "CY": lambda q: qc.cy(q[0], q[1]),
            "SWAP": lambda q: qc.swap(q[0], q[1]),
            "CP": lambda q: qc.cp(resolved_params[0], q[0], q[1]),
            "CRX": lambda q: qc.crx(resolved_params[0], q[0], q[1]),
            "CRY": lambda q: qc.cry(resolved_params[0], q[0], q[1]),
            "CRZ": lambda q: qc.crz(resolved_params[0], q[0], q[1]),
            "CCX": lambda q: qc.ccx(q[0], q[1], q[2]),
            "TOFFOLI": lambda q: qc.ccx(q[0], q[1], q[2]),
            "CSWAP": lambda q: qc.cswap(q[0], q[1], q[2]),
            "BARRIER": lambda q: qc.barrier(*q) if q else qc.barrier(),
            "RESET": lambda q: qc.reset(q[0]),
            "MEASURE": lambda q: cls._apply_measure(qc, gate_op),
            "MEASURE_ALL": lambda q: qc.measure_all(),
        }
        
        handler = gate_map.get(gate_type)
        if handler:
            handler(qubits)

    @staticmethod
    def _apply_measure(qc: QuantumCircuit, gate_op: Dict):
        qubit = gate_op["qubits"][0]
        cbit = gate_op.get("clbits", [gate_op["qubits"][0]])[0]
        qc.measure(qubit, cbit)

    @classmethod
    def to_json(cls, qc: QuantumCircuit) -> Dict:
        """Convert QuantumCircuit to JSON representation"""
        import uuid as _uuid
        gates = []
        for instruction in qc.data:
            op = instruction.operation
            qargs = [qc.find_bit(q).index for q in instruction.qubits]
            cargs = [qc.find_bit(c).index for c in instruction.clbits]

            gate_data = {
                "id": str(_uuid.uuid4()),
                "type": op.name.upper(),
                "qubits": qargs,
                "params": [float(p) if not hasattr(p, 'name') else p.name
                          for p in op.params],
            }
            if cargs:
                gate_data["clbits"] = cargs

            gates.append(gate_data)

        return {
            "name": qc.name,
            "num_qubits": qc.num_qubits,
            "num_clbits": qc.num_clbits,
            "gates": gates,
            "parameters": [{"name": str(p)} for p in qc.parameters],
            "registers": [],
            "tags": [],
            "depth": qc.depth(),
            "size": qc.size(),
            "num_parameters": qc.num_parameters,
        }

    @classmethod
    def get_circuit_metrics(cls, qc: QuantumCircuit) -> Dict:
        """Compute comprehensive circuit metrics"""
        dag = circuit_to_dag(qc)

        gate_counts = {}
        for node in dag.gate_nodes():
            gate_name = node.op.name
            gate_counts[gate_name] = gate_counts.get(gate_name, 0) + 1

        # num_nonlocal_gates removed in Qiskit 1.0 — compute manually
        try:
            nonlocal_count = qc.num_nonlocal_gates()
        except AttributeError:
            nonlocal_count = sum(
                v for k, v in gate_counts.items()
                if k not in ("barrier", "measure", "reset", "delay")
                and any(
                    node.op.name == k and len(node.qargs) > 1
                    for node in dag.gate_nodes()
                )
            )

        t_count = gate_counts.get("t", 0) + gate_counts.get("tdg", 0)

        return {
            "depth": qc.depth(),
            "size": qc.size(),
            "width": qc.width(),
            "num_qubits": qc.num_qubits,
            "num_clbits": qc.num_clbits,
            "num_parameters": qc.num_parameters,
            "gate_counts": gate_counts,
            "num_nonlocal_gates": nonlocal_count,
            "is_parameterized": qc.num_parameters > 0,
            "t_count": t_count,
        }

    @classmethod  
    def create_bell_state(cls, qubit0: int = 0, qubit1: int = 1, n_qubits: int = 2) -> QuantumCircuit:
        qc = QuantumCircuit(n_qubits)
        qc.h(qubit0)
        qc.cx(qubit0, qubit1)
        return qc

    @classmethod
    def create_ghz_state(cls, n_qubits: int) -> QuantumCircuit:
        qc = QuantumCircuit(n_qubits)
        qc.h(0)
        for i in range(n_qubits - 1):
            qc.cx(i, i + 1)
        return qc

    @classmethod
    def create_qft(cls, n_qubits: int, inverse: bool = False) -> QuantumCircuit:
        qft = QFT(n_qubits, inverse=inverse, do_swaps=True)
        return qft.decompose()

    @classmethod
    def create_grover(cls, n_qubits: int, oracle_indices: List[int]) -> QuantumCircuit:
        """Create Grover's search circuit for given oracle"""
        oracle = PhaseOracle.from_dimacs_file  # placeholder
        qc = QuantumCircuit(n_qubits, n_qubits)
        # Initialize uniform superposition
        qc.h(range(n_qubits))
        # Oracle + diffusion (simplified)
        iterations = int(np.pi / 4 * np.sqrt(2**n_qubits / len(oracle_indices)))
        for _ in range(max(1, iterations)):
            # Mark oracle states
            for idx in oracle_indices:
                # Apply phase kickback for each marked state
                binary = format(idx, f'0{n_qubits}b')
                for i, bit in enumerate(reversed(binary)):
                    if bit == '0':
                        qc.x(i)
                qc.h(n_qubits - 1)
                qc.mcx(list(range(n_qubits - 1)), n_qubits - 1)
                qc.h(n_qubits - 1)
                for i, bit in enumerate(reversed(binary)):
                    if bit == '0':
                        qc.x(i)
            # Diffusion operator
            qc.h(range(n_qubits))
            qc.x(range(n_qubits))
            qc.h(n_qubits - 1)
            qc.mcx(list(range(n_qubits - 1)), n_qubits - 1)
            qc.h(n_qubits - 1)
            qc.x(range(n_qubits))
            qc.h(range(n_qubits))
        qc.measure(range(n_qubits), range(n_qubits))
        return qc
