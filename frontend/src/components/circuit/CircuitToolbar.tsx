'use client';
import React from 'react';
import { Play, RotateCcw, Trash2, Layers, Plus, Minus } from 'lucide-react';
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

      {/* Measure all */}
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
        onClick={() => { clearCircuit(); toast.info('Circuit cleared'); }}
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
