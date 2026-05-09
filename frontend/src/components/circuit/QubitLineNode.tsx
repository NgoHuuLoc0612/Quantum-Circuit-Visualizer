'use client';
import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { motion } from 'framer-motion';

// ─── QubitLineNode ─────────────────────────────────────────────────────────────
export const QubitLineNode = memo(({ data }: NodeProps) => {
  const { qubitIndex, totalWidth } = data;
  return (
    <div className="relative" style={{ width: totalWidth, height: 60 }}>
      {/* Qubit label */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 z-10">
        <div className="w-5 h-5 rounded-full bg-void-700 border border-quantum-500/30 
                        flex items-center justify-center">
          <span className="font-mono text-[9px] text-quantum-400">{qubitIndex}</span>
        </div>
        <span className="font-mono text-xs text-slate-600">q[{qubitIndex}]</span>
      </div>
      {/* Wire */}
      <div
        className="absolute top-1/2 -translate-y-px"
        style={{
          left: 64,
          right: 0,
          height: 1,
          background: 'linear-gradient(to right, rgba(99,102,241,0.3), rgba(99,102,241,0.15))',
        }}
      />
    </div>
  );
});
QubitLineNode.displayName = 'QubitLineNode';

// ─── MeasureNode ──────────────────────────────────────────────────────────────
export const MeasureNode = memo(({ data, id }: NodeProps) => {
  const { isSelected, gate } = data;
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-12 h-12 flex items-center justify-center rounded-lg cursor-pointer"
      style={{
        background: 'rgba(148,163,184,0.08)',
        border: `1.5px solid ${isSelected ? '#94a3b8' : 'rgba(148,163,184,0.35)'}`,
        boxShadow: isSelected ? '0 0 0 2px rgba(148,163,184,0.5)' : undefined,
      }}
    >
      {/* Measurement symbol: half-circle with arrow */}
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <path d="M4 20 Q12 4 20 20" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
        <line x1="12" y1="20" x2="18" y2="10" stroke="#94a3b8" strokeWidth="1.5"
              markerEnd="url(#arrowhead)" />
        <defs>
          <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <polygon points="0 0, 4 2, 0 4" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>
    </motion.div>
  );
});
MeasureNode.displayName = 'MeasureNode';

// ─── BarrierNode ──────────────────────────────────────────────────────────────
export const BarrierNode = memo(({ data }: NodeProps) => {
  const { numQubits, isSelected } = data;
  return (
    <div
      className="flex items-center justify-center cursor-pointer"
      style={{ width: 8, height: numQubits * 60 }}
    >
      <div
        className="w-0.5 h-full rounded-full"
        style={{
          background: isSelected
            ? 'rgba(99,102,241,0.7)'
            : 'repeating-linear-gradient(to bottom, rgba(99,102,241,0.4) 0px, rgba(99,102,241,0.4) 4px, transparent 4px, transparent 8px)',
        }}
      />
    </div>
  );
});
BarrierNode.displayName = 'BarrierNode';

// ─── CircuitToolbar ───────────────────────────────────────────────────────────
import { Play, RotateCcw, Trash2, GitBranch, Layers, Plus, Minus } from 'lucide-react';
import { useQuantumStore } from '@/store/quantumStore';
import { toast } from 'sonner';

export function CircuitToolbar({ onRunSimulation }: { onRunSimulation: () => void }) {
  const {
    circuit, clearCircuit, setNumQubits, addGate, pushHistory,
    canUndo, canRedo, undo, redo, simulation,
  } = useQuantumStore();

  return (
    <div className="flex items-center gap-1 glass-panel px-2 py-1.5 rounded-lg">
      {/* Qubit count */}
      <div className="flex items-center gap-1 border-r border-quantum-500/15 pr-2 mr-1">
        <span className="font-mono text-[10px] text-slate-500 uppercase">Qubits</span>
        <button
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-quantum-500/20 
                     text-slate-400 hover:text-white transition-colors"
          onClick={() => circuit.num_qubits > 1 && setNumQubits(circuit.num_qubits - 1)}
        >
          <Minus size={10} />
        </button>
        <span className="font-mono text-sm text-quantum-300 w-4 text-center">
          {circuit.num_qubits}
        </span>
        <button
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-quantum-500/20 
                     text-slate-400 hover:text-white transition-colors"
          onClick={() => circuit.num_qubits < 20 && setNumQubits(circuit.num_qubits + 1)}
        >
          <Plus size={10} />
        </button>
      </div>

      {/* Add barrier */}
      <button
        className="quantum-button px-2 py-1 text-xs gap-1"
        onClick={() => {
          addGate({ type: 'BARRIER', qubits: Array.from({ length: circuit.num_qubits }, (_, i) => i), params: [] });
          pushHistory('Add barrier');
        }}
        title="Add barrier"
      >
        <Layers size={11} />
        <span>Barrier</span>
      </button>

      {/* Add measure all */}
      <button
        className="quantum-button px-2 py-1 text-xs"
        onClick={() => {
          for (let q = 0; q < circuit.num_qubits; q++) {
            addGate({ type: 'MEASURE', qubits: [q], clbits: [q], params: [] });
          }
          pushHistory('Measure all');
        }}
        title="Measure all qubits"
      >
        Measure All
      </button>

      <div className="w-px h-4 bg-quantum-500/20 mx-1" />

      {/* Undo/Redo */}
      <button
        className={`quantum-button px-2 py-1 text-xs ${!canUndo ? 'opacity-30' : ''}`}
        onClick={undo} disabled={!canUndo} title="Undo (⌘Z)"
      >
        <RotateCcw size={11} />
      </button>
      <button
        className={`quantum-button px-2 py-1 text-xs ${!canRedo ? 'opacity-30' : ''}`}
        onClick={redo} disabled={!canRedo} title="Redo (⌘Y)"
        style={{ transform: 'scaleX(-1)' }}
      >
        <RotateCcw size={11} />
      </button>

      <div className="w-px h-4 bg-quantum-500/20 mx-1" />

      {/* Clear */}
      <button
        className="quantum-button-danger px-2 py-1 text-xs"
        onClick={() => {
          clearCircuit();
          toast.info('Circuit cleared');
        }}
        title="Clear circuit"
      >
        <Trash2 size={11} />
      </button>

      <div className="w-px h-4 bg-quantum-500/20 mx-1" />

      {/* Run */}
      <button
        className="quantum-button-primary px-3 py-1 text-xs gap-1.5"
        onClick={onRunSimulation}
        disabled={simulation.isRunning}
        title="Run simulation (⌘Enter)"
      >
        <Play size={11} className={simulation.isRunning ? 'animate-pulse' : ''} />
        <span>{simulation.isRunning ? 'Running…' : 'Simulate'}</span>
      </button>
    </div>
  );
}
