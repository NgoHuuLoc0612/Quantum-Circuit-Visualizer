import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { nanoid } from '@/lib/nanoid';
import type {
  CircuitData, GateOperation, CircuitMetrics,
  SimulationResult, SimulationProgress, SimulationMode,
  NoiseConfig, VisualizationConfig, BlochVector,
  EvolutionStep, AmplitudeEntry, ShotsDistEntry,
} from '@/types/quantum';

// ─── History for undo/redo ─────────────────────────────────────────────────

const MAX_HISTORY = 100;

interface HistoryEntry {
  timestamp: number;
  description: string;
  circuit: CircuitData;
}

// ─── Simulation State ─────────────────────────────────────────────────────────

export interface SimulationState {
  isRunning: boolean;
  progress: number;
  stage: string;
  mode: SimulationMode;
  shots: number;
  result: SimulationResult | null;
  evolutionSteps: EvolutionStep[];
  currentEvolutionStep: number;
  noiseEnabled: boolean;
  noiseConfig: NoiseConfig;
  error: string | null;
}

// ─── Main Store Interface ─────────────────────────────────────────────────────

interface QuantumStore {
  // Circuit
  circuit: CircuitData;
  selectedGateId: string | null;
  hoveredQubit: number | null;
  clipboard: GateOperation | null;

  // History
  history: HistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  // Simulation
  simulation: SimulationState;

  // Visualization
  vizConfig: VisualizationConfig;
  activePanel: string;
  showRightPanel: boolean;
  showLeftPanel: boolean;

  // WebSocket
  wsConnected: boolean;
  sessionId: string;

  // Circuit Actions
  setCircuit: (circuit: CircuitData) => void;
  addGate: (gate: Omit<GateOperation, 'id'>) => void;
  removeGate: (gateId: string) => void;
  updateGate: (gateId: string, updates: Partial<GateOperation>) => void;
  moveGate: (gateId: string, newQubits: number[], newColumn?: number) => void;
  reorderGates: (newOrder: GateOperation[]) => void;
  setNumQubits: (n: number) => void;
  setNumClbits: (n: number) => void;
  setCircuitName: (name: string) => void;
  clearCircuit: () => void;
  selectGate: (id: string | null) => void;
  copyGate: (id: string) => void;
  pasteGate: () => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;

  // Simulation Actions
  setSimulationMode: (mode: SimulationMode) => void;
  setShots: (shots: number) => void;
  setNoiseEnabled: (enabled: boolean) => void;
  setNoiseConfig: (config: Partial<NoiseConfig>) => void;
  setSimulationRunning: (running: boolean) => void;
  setSimulationProgress: (progress: number, stage: string) => void;
  setSimulationResult: (result: SimulationResult) => void;
  setSimulationError: (error: string) => void;
  clearSimulationResult: () => void;
  setEvolutionStep: (step: EvolutionStep) => void;
  seekEvolutionStep: (index: number) => void;

  // Visualization Actions
  setVizConfig: (config: Partial<VisualizationConfig>) => void;
  setActivePanel: (panel: string) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;

  // WS Actions
  setWsConnected: (connected: boolean) => void;
}

// ─── Default State ────────────────────────────────────────────────────────────

const defaultCircuit: CircuitData = {
  name: 'Untitled Circuit',
  num_qubits: 4,
  num_clbits: 4,
  gates: [],
  parameters: [],
  registers: [],
  tags: [],
};

const defaultNoiseConfig: NoiseConfig = {
  single_qubit_error: 0.001,
  two_qubit_error: 0.01,
  t1: 50e-6,
  t2: 70e-6,
  gate_time_1q: 50e-9,
  gate_time_2q: 300e-9,
  readout_error: 0.02,
};

const defaultVizConfig: VisualizationConfig = {
  showProbabilityBars: true,
  showPhaseWheel: true,
  showBlochSpheres: true,
  showEntanglement: true,
  showStatevectorTable: true,
  colorScheme: 'quantum',
  animationSpeed: 1,
  showGrid: true,
  showAxes: true,
};

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useQuantumStore = create<QuantumStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      circuit: defaultCircuit,
      selectedGateId: null,
      hoveredQubit: null,
      clipboard: null,

      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,

      simulation: {
        isRunning: false,
        progress: 0,
        stage: 'idle',
        mode: 'statevector',
        shots: 1024,
        result: null,
        evolutionSteps: [],
        currentEvolutionStep: 0,
        noiseEnabled: false,
        noiseConfig: defaultNoiseConfig,
        error: null,
      },

      vizConfig: defaultVizConfig,
      activePanel: 'simulation',
      showRightPanel: true,
      showLeftPanel: true,

      wsConnected: false,
      sessionId: nanoid(),

      // ── Circuit Actions ────────────────────────────────────────────────────

      setCircuit: (circuit) => set((state) => {
        state.circuit = circuit;
      }),

      addGate: (gate) => set((state) => {
        const newGate: GateOperation = { ...gate, id: nanoid() };
        state.circuit.gates.push(newGate);
      }),

      removeGate: (gateId) => set((state) => {
        state.circuit.gates = state.circuit.gates.filter(g => g.id !== gateId);
        if (state.selectedGateId === gateId) state.selectedGateId = null;
      }),

      updateGate: (gateId, updates) => set((state) => {
        const idx = state.circuit.gates.findIndex(g => g.id === gateId);
        if (idx >= 0) Object.assign(state.circuit.gates[idx], updates);
      }),

      moveGate: (gateId, newQubits) => set((state) => {
        const gate = state.circuit.gates.find(g => g.id === gateId);
        if (gate) gate.qubits = newQubits;
      }),

      reorderGates: (newOrder) => set((state) => {
        state.circuit.gates = newOrder;
      }),

      setNumQubits: (n) => set((state) => {
        state.circuit.num_qubits = n;
        // Remove gates on qubits that no longer exist
        state.circuit.gates = state.circuit.gates.filter(
          g => g.qubits.every(q => q < n)
        );
      }),

      setNumClbits: (n) => set((state) => {
        state.circuit.num_clbits = n;
      }),

      setCircuitName: (name) => set((state) => {
        state.circuit.name = name;
      }),

      clearCircuit: () => set((state) => {
        state.circuit.gates = [];
        state.selectedGateId = null;
        state.simulation.result = null;
      }),

      selectGate: (id) => set((state) => {
        state.selectedGateId = id;
      }),

      copyGate: (id) => set((state) => {
        const gate = state.circuit.gates.find(g => g.id === id);
        if (gate) state.clipboard = gate;
      }),

      pasteGate: () => set((state) => {
        const { clipboard } = state;
        if (clipboard) {
          state.circuit.gates.push({ ...clipboard, id: nanoid() });
        }
      }),

      // ── History ───────────────────────────────────────────────────────────

      pushHistory: (description) => set((state) => {
        const entry: HistoryEntry = {
          timestamp: Date.now(),
          description,
          circuit: JSON.parse(JSON.stringify(state.circuit)),
        };
        // Truncate forward history
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(entry);
        if (state.history.length > MAX_HISTORY) state.history.shift();
        state.historyIndex = state.history.length - 1;
        state.canUndo = state.historyIndex > 0;
        state.canRedo = false;
      }),

      undo: () => set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex -= 1;
          state.circuit = JSON.parse(JSON.stringify(state.history[state.historyIndex].circuit));
          state.canUndo = state.historyIndex > 0;
          state.canRedo = true;
        }
      }),

      redo: () => set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex += 1;
          state.circuit = JSON.parse(JSON.stringify(state.history[state.historyIndex].circuit));
          state.canRedo = state.historyIndex < state.history.length - 1;
          state.canUndo = true;
        }
      }),

      // ── Simulation ────────────────────────────────────────────────────────

      setSimulationMode: (mode) => set((state) => { state.simulation.mode = mode; }),
      setShots: (shots) => set((state) => { state.simulation.shots = shots; }),
      setNoiseEnabled: (enabled) => set((state) => { state.simulation.noiseEnabled = enabled; }),
      setNoiseConfig: (config) => set((state) => {
        Object.assign(state.simulation.noiseConfig, config);
      }),
      setSimulationRunning: (running) => set((state) => {
        state.simulation.isRunning = running;
        if (running) { state.simulation.error = null; state.simulation.result = null; }
      }),
      setSimulationProgress: (progress, stage) => set((state) => {
        state.simulation.progress = progress;
        state.simulation.stage = stage;
      }),
      setSimulationResult: (result) => set((state) => {
        state.simulation.result = result;
        state.simulation.isRunning = false;
        state.simulation.progress = 100;
      }),
      setSimulationError: (error) => set((state) => {
        state.simulation.error = error;
        state.simulation.isRunning = false;
      }),
      clearSimulationResult: () => set((state) => {
        state.simulation.result = null;
        state.simulation.error = null;
        state.simulation.progress = 0;
        state.simulation.stage = 'idle';
        state.simulation.evolutionSteps = [];
      }),
      setEvolutionStep: (step) => set((state) => {
        if (step.stage === 'evolution_start') {
          state.simulation.evolutionSteps = [step];
        } else {
          state.simulation.evolutionSteps.push(step);
        }
        state.simulation.currentEvolutionStep = state.simulation.evolutionSteps.length - 1;
      }),
      seekEvolutionStep: (index) => set((state) => {
        state.simulation.currentEvolutionStep = Math.max(
          0, Math.min(index, state.simulation.evolutionSteps.length - 1)
        );
      }),

      // ── Visualization ─────────────────────────────────────────────────────

      setVizConfig: (config) => set((state) => {
        Object.assign(state.vizConfig, config);
      }),
      setActivePanel: (panel) => set((state) => { state.activePanel = panel; }),
      toggleLeftPanel: () => set((state) => { state.showLeftPanel = !state.showLeftPanel; }),
      toggleRightPanel: () => set((state) => { state.showRightPanel = !state.showRightPanel; }),

      // ── WebSocket ─────────────────────────────────────────────────────────

      setWsConnected: (connected) => set((state) => { state.wsConnected = connected; }),
    }))
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectCircuit = (s: QuantumStore) => s.circuit;
export const selectGates = (s: QuantumStore) => s.circuit.gates;
export const selectSimulation = (s: QuantumStore) => s.simulation;
export const selectVizConfig = (s: QuantumStore) => s.vizConfig;
export const selectSelectedGate = (s: QuantumStore) =>
  s.circuit.gates.find(g => g.id === s.selectedGateId) ?? null;
