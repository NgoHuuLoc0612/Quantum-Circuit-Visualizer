'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuantumStore } from '@/store/quantumStore';

interface CommandPaletteProps {
  onClose: () => void;
  onRunSimulation: () => void;
  onTemplates: () => void;
}

const COMMANDS = [
  { id: 'run',      label: 'Run Simulation',   shortcut: '⌘↵', category: 'Simulation' },
  { id: 'templates',label: 'Load Template',     shortcut: '',   category: 'Circuit'    },
  { id: 'clear',    label: 'Clear Circuit',     shortcut: '',   category: 'Circuit'    },
  { id: 'bell',     label: 'Build Bell State',  shortcut: '',   category: 'Templates'  },
  { id: 'ghz3',     label: 'Build GHZ (3q)',    shortcut: '',   category: 'Templates'  },
  { id: 'qft4',     label: 'Build QFT (4q)',    shortcut: '',   category: 'Templates'  },
  { id: 'measure',  label: 'Add Measure All',   shortcut: '',   category: 'Circuit'    },
  { id: 'barrier',  label: 'Add Barrier',       shortcut: '',   category: 'Circuit'    },
  { id: 'export',   label: 'Export JSON',       shortcut: '',   category: 'File'       },
];

export function CommandPalette({ onClose, onRunSimulation, onTemplates }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const { clearCircuit, addGate, circuit } = useQuantumStore();

  const filtered = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const execute = useCallback((id: string) => {
    switch (id) {
      case 'run':      onRunSimulation(); break;
      case 'templates': onTemplates();   break;
      case 'clear':    clearCircuit();   break;
      case 'measure':
        for (let q = 0; q < circuit.num_qubits; q++)
          addGate({ type: 'MEASURE', qubits: [q], clbits: [q], params: [] });
        break;
      case 'barrier':
        addGate({ type: 'BARRIER', qubits: Array.from({ length: circuit.num_qubits }, (_, i) => i), params: [] });
        break;
    }
    onClose();
  }, [onClose, onRunSimulation, onTemplates, clearCircuit, addGate, circuit.num_qubits]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')    onClose();
      if (e.key === 'ArrowDown') setSelected(s => Math.min(s + 1, filtered.length - 1));
      if (e.key === 'ArrowUp')   setSelected(s => Math.max(s - 1, 0));
      if (e.key === 'Enter' && filtered[selected]) execute(filtered[selected].id);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, filtered, selected, execute]);

  useEffect(() => { setSelected(0); }, [query]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-void-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, y: -10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: -10 }}
        className="relative z-10 w-full max-w-lg glass-panel rounded-2xl overflow-hidden quantum-glow"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-quantum-500/10">
          <span className="text-quantum-400">⌘</span>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search commands…"
            className="flex-1 bg-transparent font-body text-slate-200 placeholder:text-slate-600
                       focus:outline-none text-sm"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-void-700 border border-quantum-500/20
                          text-slate-600 font-mono">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => execute(cmd.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selected ? 'bg-quantum-500/15' : 'hover:bg-quantum-500/8'
              }`}
            >
              <span className="text-[9px] text-slate-600 w-16 uppercase">{cmd.category}</span>
              <span className="font-body text-sm text-slate-300 flex-1">{cmd.label}</span>
              {cmd.shortcut && (
                <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-void-700 border border-quantum-500/20
                               text-slate-500 font-mono">{cmd.shortcut}</kbd>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-slate-600 py-6">No commands found</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
