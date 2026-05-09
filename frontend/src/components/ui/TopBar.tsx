'use client';
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, Save, Upload, Download, ChevronDown,
  Layout, Zap, BookOpen, Settings, Wifi, WifiOff, Command,
  PanelLeft, PanelRight, Play,
} from 'lucide-react';
import { useQuantumStore } from '@/store/quantumStore';
import { circuitsApi } from '@/lib/api';
import { toast } from 'sonner';

interface TopBarProps {
  onCommandPalette: () => void;
  onTemplates: () => void;
  onRunSimulation: () => void;
  webgpuSupported: boolean | null;
}

export function TopBar({ onCommandPalette, onTemplates, onRunSimulation, webgpuSupported }: TopBarProps) {
  const {
    circuit, setCircuit, setCircuitName,
    wsConnected, simulation,
    toggleLeftPanel, toggleRightPanel,
    showLeftPanel, showRightPanel,
  } = useQuantumStore();

  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await circuitsApi.create(circuit as Record<string, unknown>) as { name: string };
      toast.success(`Circuit "${saved.name}" saved`);
    } catch (e: unknown) {
      toast.error(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [circuit]);

  const handleExportQASM = useCallback(async () => {
    if (!circuit.id) {
      toast.error('Save the circuit first to export QASM');
      return;
    }
    try {
      const { qasm } = await circuitsApi.getQasm(circuit.id);
      const blob = new Blob([qasm], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${circuit.name}.qasm`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('QASM exported');
    } catch (e: unknown) {
      toast.error('Export failed');
    }
  }, [circuit]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setCircuit(data);
        toast.success('Circuit imported');
      } catch {
        toast.error('Invalid circuit JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [setCircuit]);

  const handleExportJSON = useCallback(() => {
    const json = JSON.stringify(circuit, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${circuit.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exported');
  }, [circuit]);

  return (
    <header className="h-11 flex items-center px-3 gap-3 border-b border-quantum-500/10 
                       bg-void-900/80 backdrop-blur-xl flex-shrink-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-6 h-6 rounded-md bg-quantum-500/15 border border-quantum-500/30
                        flex items-center justify-center">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
            <circle cx="8" cy="8" r="3" stroke="#6366f1" strokeWidth="1.2" strokeDasharray="2 1" className="animate-spin-slow" />
            <circle cx="8" cy="8" r="6" stroke="#4f5ef9" strokeWidth="0.6" strokeDasharray="1 2" />
            <circle cx="8" cy="2" r="1" fill="#818cf8" />
            <circle cx="8" cy="14" r="1" fill="#818cf8" />
          </svg>
        </div>
        <span className="font-display font-bold text-sm text-slate-200 hidden sm:block">
          QCV
        </span>
      </div>

      {/* Circuit name */}
      <div className="flex items-center gap-1">
        {editingName ? (
          <input
            autoFocus
            value={circuit.name}
            onChange={e => setCircuitName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
            className="bg-void-700 border border-quantum-500/40 rounded px-2 py-0.5
                       font-display text-sm text-slate-200 focus:outline-none w-40"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="font-display text-sm text-slate-300 hover:text-white transition-colors px-1 py-0.5 rounded
                       hover:bg-quantum-500/10"
          >
            {circuit.name}
          </button>
        )}
        <span className="text-slate-700 text-xs font-mono">
          {circuit.num_qubits}q·{circuit.gates.length}g
        </span>
      </div>

      <div className="flex-1" />

      {/* Panel toggles */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleLeftPanel}
          className={`quantum-button p-1.5 ${showLeftPanel ? 'text-quantum-300' : 'text-slate-600'}`}
          title="Toggle gate palette"
        >
          <PanelLeft size={13} />
        </button>
        <button
          onClick={toggleRightPanel}
          className={`quantum-button p-1.5 ${showRightPanel ? 'text-quantum-300' : 'text-slate-600'}`}
          title="Toggle simulation panel"
        >
          <PanelRight size={13} />
        </button>
      </div>

      <div className="w-px h-4 bg-quantum-500/20" />

      {/* Templates */}
      <button className="quantum-button px-2.5 py-1 text-xs gap-1.5" onClick={onTemplates}>
        <BookOpen size={11} />
        <span>Templates</span>
      </button>

      {/* File operations */}
      <div className="flex items-center gap-1">
        <label className="quantum-button px-2.5 py-1 text-xs gap-1.5 cursor-pointer">
          <Upload size={11} />
          <span>Import</span>
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
        <button className="quantum-button px-2.5 py-1 text-xs gap-1.5" onClick={handleExportJSON}>
          <Download size={11} />
          <span>Export</span>
        </button>
      </div>

      {/* Save */}
      <button
        className="quantum-button px-2.5 py-1 text-xs gap-1.5"
        onClick={handleSave}
        disabled={saving}
      >
        <Save size={11} className={saving ? 'animate-pulse' : ''} />
        <span>Save</span>
      </button>

      {/* Command palette */}
      <button
        className="quantum-button px-2.5 py-1 text-xs gap-1.5"
        onClick={onCommandPalette}
        title="Command palette (⌘K)"
      >
        <Command size={11} />
        <span className="hidden sm:block">⌘K</span>
      </button>

      {/* Run */}
      <button
        className="quantum-button-primary px-3 py-1 text-xs gap-1.5"
        onClick={onRunSimulation}
        disabled={simulation.isRunning}
      >
        <Play size={11} className={simulation.isRunning ? 'animate-pulse' : ''} />
        <span>{simulation.isRunning ? 'Running…' : 'Run'}</span>
      </button>

      <div className="w-px h-4 bg-quantum-500/20" />

      {/* WS Status */}
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono ${
        wsConnected ? 'text-green-400' : 'text-slate-600'
      }`}>
        {wsConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
        <span className="hidden md:block">{wsConnected ? 'Live' : 'Disconnected'}</span>
      </div>

      {/* WebGPU badge */}
      {webgpuSupported !== null && (
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono ${
          webgpuSupported
            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25'
            : 'bg-void-700 text-slate-600 border border-quantum-500/10'
        }`}>
          <Zap size={9} />
          <span>GPU</span>
        </div>
      )}
    </header>
  );
}
