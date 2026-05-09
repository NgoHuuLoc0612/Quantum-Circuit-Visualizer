import type { GateDef, GateCategory } from '@/types/quantum';

export const GATE_CATALOG: Record<string, GateDef> = {
  H:    { id: 'H',    name: 'H',       qubits: 1, params: 0, category: 'single',      color: '#6366f1', description: 'Hadamard: creates superposition' },
  X:    { id: 'X',    name: 'X',       qubits: 1, params: 0, category: 'single',      color: '#ef4444', description: 'Pauli-X: bit flip' },
  Y:    { id: 'Y',    name: 'Y',       qubits: 1, params: 0, category: 'single',      color: '#f59e0b', description: 'Pauli-Y: bit+phase flip' },
  Z:    { id: 'Z',    name: 'Z',       qubits: 1, params: 0, category: 'single',      color: '#10b981', description: 'Pauli-Z: phase flip' },
  S:    { id: 'S',    name: 'S',       qubits: 1, params: 0, category: 'single',      color: '#06b6d4', description: 'S gate: π/2 phase' },
  T:    { id: 'T',    name: 'T',       qubits: 1, params: 0, category: 'single',      color: '#8b5cf6', description: 'T gate: π/4 phase' },
  SDG:  { id: 'SDG',  name: 'S†',      qubits: 1, params: 0, category: 'single',      color: '#06b6d4', description: 'S-dagger' },
  TDG:  { id: 'TDG',  name: 'T†',      qubits: 1, params: 0, category: 'single',      color: '#8b5cf6', description: 'T-dagger' },
  SX:   { id: 'SX',   name: '√X',      qubits: 1, params: 0, category: 'single',      color: '#ec4899', description: 'Square root of X' },
  SXDG: { id: 'SXDG', name: '√X†',     qubits: 1, params: 0, category: 'single',      color: '#ec4899', description: 'Square root of X dagger' },
  I:    { id: 'I',    name: 'I',       qubits: 1, params: 0, category: 'single',      color: '#64748b', description: 'Identity' },

  RX:   { id: 'RX',   name: 'RX(θ)',   qubits: 1, params: 1, paramNames: ['θ'],       category: 'rotation',     color: '#f87171', description: 'X-rotation by θ' },
  RY:   { id: 'RY',   name: 'RY(θ)',   qubits: 1, params: 1, paramNames: ['θ'],       category: 'rotation',     color: '#fbbf24', description: 'Y-rotation by θ' },
  RZ:   { id: 'RZ',   name: 'RZ(θ)',   qubits: 1, params: 1, paramNames: ['θ'],       category: 'rotation',     color: '#34d399', description: 'Z-rotation by θ' },
  P:    { id: 'P',    name: 'P(λ)',     qubits: 1, params: 1, paramNames: ['λ'],       category: 'rotation',     color: '#60a5fa', description: 'Phase rotation' },
  U1:   { id: 'U1',   name: 'U1(λ)',    qubits: 1, params: 1, paramNames: ['λ'],       category: 'rotation',     color: '#a78bfa', description: 'U1 rotation' },
  U2:   { id: 'U2',   name: 'U2(φ,λ)', qubits: 1, params: 2, paramNames: ['φ','λ'],  category: 'rotation',     color: '#a78bfa', description: 'U2 rotation' },
  U3:   { id: 'U3',   name: 'U3(θ,φ,λ)', qubits: 1, params: 3, paramNames: ['θ','φ','λ'], category: 'rotation', color: '#a78bfa', description: 'General U3 rotation' },

  CX:   { id: 'CX',   name: 'CX',      qubits: 2, params: 0, category: 'two_qubit',   color: '#f97316', description: 'CNOT: controlled-X' },
  CZ:   { id: 'CZ',   name: 'CZ',      qubits: 2, params: 0, category: 'two_qubit',   color: '#84cc16', description: 'Controlled-Z' },
  CY:   { id: 'CY',   name: 'CY',      qubits: 2, params: 0, category: 'two_qubit',   color: '#f59e0b', description: 'Controlled-Y' },
  SWAP: { id: 'SWAP', name: 'SWAP',    qubits: 2, params: 0, category: 'two_qubit',   color: '#14b8a6', description: 'Swap two qubits' },
  ECR:  { id: 'ECR',  name: 'ECR',     qubits: 2, params: 0, category: 'two_qubit',   color: '#f43f5e', description: 'Echoed cross-resonance' },
  DCX:  { id: 'DCX',  name: 'DCX',     qubits: 2, params: 0, category: 'two_qubit',   color: '#8b5cf6', description: 'Double-CNOT' },
  ISWAP:{ id: 'ISWAP', name: 'iSWAP',  qubits: 2, params: 0, category: 'two_qubit',   color: '#0ea5e9', description: 'iSWAP gate' },
  CP:   { id: 'CP',   name: 'CP(θ)',   qubits: 2, params: 1, paramNames: ['θ'],       category: 'two_qubit',   color: '#d946ef', description: 'Controlled-Phase' },
  CRX:  { id: 'CRX',  name: 'CRX(θ)', qubits: 2, params: 1, paramNames: ['θ'],       category: 'two_qubit',   color: '#f97316', description: 'Controlled-RX' },
  CRY:  { id: 'CRY',  name: 'CRY(θ)', qubits: 2, params: 1, paramNames: ['θ'],       category: 'two_qubit',   color: '#f97316', description: 'Controlled-RY' },
  CRZ:  { id: 'CRZ',  name: 'CRZ(θ)', qubits: 2, params: 1, paramNames: ['θ'],       category: 'two_qubit',   color: '#f97316', description: 'Controlled-RZ' },

  CCX:  { id: 'CCX',  name: 'CCX',     qubits: 3, params: 0, category: 'three_qubit', color: '#e879f9', description: 'Toffoli gate' },
  CSWAP:{ id: 'CSWAP',name: 'CSWAP',   qubits: 3, params: 0, category: 'three_qubit', color: '#a3e635', description: 'Fredkin gate' },

  MEASURE: { id: 'MEASURE', name: 'M', qubits: 1, params: 0, category: 'measurement', color: '#94a3b8', description: 'Measure qubit' },
  BARRIER: { id: 'BARRIER', name: '|', qubits: -1, params: 0, category: 'control',    color: '#475569', description: 'Barrier (no optimization across)' },
  RESET:   { id: 'RESET',   name: 'R', qubits: 1,  params: 0, category: 'control',    color: '#64748b', description: 'Reset to |0⟩' },
};

export const GATE_CATEGORIES: Array<{ id: GateCategory; label: string }> = [
  { id: 'single',      label: 'Single Qubit' },
  { id: 'rotation',    label: 'Rotation' },
  { id: 'two_qubit',   label: 'Two Qubit' },
  { id: 'three_qubit', label: 'Three Qubit' },
  { id: 'measurement', label: 'Measurement' },
  { id: 'control',     label: 'Control' },
];

export function getGatesByCategory(category: GateCategory): GateDef[] {
  return Object.values(GATE_CATALOG).filter(g => g.category === category);
}

export function getGateDef(type: string): GateDef | undefined {
  return GATE_CATALOG[type.toUpperCase()];
}

/** Compute circuit columns (time slots) for display */
export function computeCircuitColumns(
  gates: Array<{ id: string; type: string; qubits: number[] }>,
  numQubits: number
): Map<string, number> {
  const gateColumns = new Map<string, number>();
  const qubitLastCol = new Array(numQubits).fill(-1);

  for (const gate of gates) {
    if (gate.type === 'BARRIER') {
      const maxCol = Math.max(...qubitLastCol);
      gate.qubits.forEach(q => { qubitLastCol[q] = maxCol + 1; });
      gateColumns.set(gate.id, maxCol + 1);
      continue;
    }

    const col = Math.max(...gate.qubits.map(q => qubitLastCol[q])) + 1;
    gateColumns.set(gate.id, col);
    gate.qubits.forEach(q => { qubitLastCol[q] = col; });
  }

  return gateColumns;
}

export const PI = Math.PI;
export const HALF_PI = Math.PI / 2;
export const QUARTER_PI = Math.PI / 4;

export const COMMON_ANGLES = [
  { label: 'π', value: PI },
  { label: 'π/2', value: HALF_PI },
  { label: 'π/4', value: QUARTER_PI },
  { label: 'π/8', value: PI / 8 },
  { label: '2π', value: 2 * PI },
  { label: '3π/4', value: (3 * PI) / 4 },
  { label: '0', value: 0 },
];
