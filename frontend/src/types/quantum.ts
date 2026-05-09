// ─── Quantum Gate Types ───────────────────────────────────────────────────────

export type GateCategory = 'single' | 'rotation' | 'two_qubit' | 'three_qubit' | 'measurement' | 'control';

export interface GateDef {
  id: string;
  name: string;
  qubits: number;
  params: number;
  paramNames?: string[];
  description?: string;
  matrix?: ComplexNumber[][];
  category: GateCategory;
  color: string;
}

export interface ComplexNumber {
  re: number;
  im: number;
  magnitude?: number;
  phase?: number;
}

// ─── Circuit Types ────────────────────────────────────────────────────────────

export interface GateOperation {
  id: string;
  type: string;
  qubits: number[];
  clbits?: number[];
  params: (number | string)[];
  label?: string;
  condition?: { register: string; value: number };
}

export interface QuantumRegister {
  name: string;
  size: number;
  type: 'quantum' | 'classical';
}

export interface QuantumParameter {
  name: string;
  value?: number;
}

export interface CircuitData {
  id?: string;
  name: string;
  num_qubits: number;
  num_clbits: number;
  gates: GateOperation[];
  parameters: QuantumParameter[];
  registers: QuantumRegister[];
  description?: string;
  tags?: string[];
  metrics?: CircuitMetrics;
}

export interface CircuitMetrics {
  depth: number;
  size: number;
  width: number;
  num_qubits: number;
  num_clbits: number;
  num_parameters: number;
  gate_counts: Record<string, number>;
  num_nonlocal_gates: number;
  t_count: number;
  is_parameterized: boolean;
}

// ─── Simulation Result Types ──────────────────────────────────────────────────

export type SimulationMode = 'statevector' | 'shots' | 'density_matrix' | 'unitary' | 'evolution';

export interface AmplitudeEntry {
  re: number;
  im: number;
  magnitude: number;
  phase: number;
  probability: number;
  basis: string;
}

export interface StatevectorResult {
  amplitudes: AmplitudeEntry[];
  num_qubits: number;
  num_states: number;
}

export interface BlochVector {
  qubit: number;
  x: number;
  y: number;
  z: number;
  purity: number;
}

export interface EntanglementData {
  von_neumann_entropy: Record<string, number>;
  concurrence?: number;
}

export interface StatevectorSimResult {
  stage: 'complete';
  type: 'statevector';
  progress: 100;
  statevector: StatevectorResult;
  bloch_vectors: BlochVector[];
  entanglement: EntanglementData;
  entropy: number;
}

export interface ShotsDistEntry {
  state: string;
  count: number;
  probability: number;
  percentage: number;
}

export interface ShotsSimResult {
  stage: 'complete';
  type: 'shots';
  shots: number;
  counts: Record<string, number>;
  distribution: ShotsDistEntry[];
  total_counts: number;
  num_outcomes: number;
  max_probability: number;
  entropy_from_counts: number;
  noise_applied: boolean;
}

export interface DensityMatrixResult {
  stage: 'complete';
  type: 'density_matrix';
  density_matrix: {
    data: ComplexNumber[][];
    size: number;
    num_qubits: number;
  };
  purity: number;
  is_pure: boolean;
  von_neumann_entropy: number;
  trace: number;
}

export interface UnitaryResult {
  stage: 'complete';
  type: 'unitary';
  unitary: {
    data: (ComplexNumber & { magnitude: number; phase: number })[][];
    size: number;
    is_unitary: boolean;
    determinant: ComplexNumber;
  };
}

export interface EvolutionStep {
  stage: 'evolution_step' | 'evolution_start' | 'evolution_complete';
  step: number;
  progress: number;
  gate?: { type: string; qubits: number[]; params: number[] };
  statevector?: StatevectorResult;
  bloch_vectors?: BlochVector[];
}

export type SimulationResult = 
  | StatevectorSimResult 
  | ShotsSimResult 
  | DensityMatrixResult 
  | UnitaryResult;

export interface SimulationProgress {
  stage: string;
  progress: number;
  message?: string;
}

// ─── Noise Model Types ────────────────────────────────────────────────────────

export interface NoiseConfig {
  single_qubit_error: number;
  two_qubit_error: number;
  t1: number;
  t2: number;
  gate_time_1q: number;
  gate_time_2q: number;
  readout_error: number;
}

export interface NoisePreset {
  id: string;
  name: string;
  config: NoiseConfig;
}

// ─── React Flow Node Types ────────────────────────────────────────────────────

export type QNodeType = 'qubitLine' | 'gateNode' | 'measureNode' | 'barrierNode' | 'wireNode';

export interface GateNodeData {
  gateType: string;
  gateDef: GateDef;
  qubitIndex: number;
  params: number[];
  label?: string;
  column: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
}

// ─── WebSocket Message Types ──────────────────────────────────────────────────

export interface WSMessage {
  type: 
    | 'simulate' | 'transpile' | 'validate' 
    | 'statevector_evolution' | 'ping'
    | 'simulation_update' | 'transpile_result' 
    | 'validation_result' | 'statevector_update'
    | 'error' | 'pong';
  payload?: Record<string, unknown>;
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export type PanelId = 'gates' | 'properties' | 'simulation' | 'analysis' | 'bloch' | 'matrix' | 'history';

export interface AppTheme {
  id: string;
  name: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  accent: string;
}

export interface VisualizationConfig {
  showProbabilityBars: boolean;
  showPhaseWheel: boolean;
  showBlochSpheres: boolean;
  showEntanglement: boolean;
  showStatevectorTable: boolean;
  colorScheme: 'quantum' | 'plasma' | 'spectral' | 'viridis';
  animationSpeed: number;
  showGrid: boolean;
  showAxes: boolean;
}
