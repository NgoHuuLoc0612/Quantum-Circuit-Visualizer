'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Play, Settings, BarChart3, Cpu, Waves, Grid3x3,
  ChevronDown, Loader2, AlertCircle, CheckCircle2,
  Box, GitMerge, Code2, Network,
} from 'lucide-react';
import { useQuantumStore } from '@/store/quantumStore';
import { StatevectorView } from '@/components/visualization/StatevectorView';
import { BlochSphereView } from '@/components/visualization/BlochSphereView';
import { ProbabilityBarChart } from '@/components/visualization/ProbabilityBarChart';
import { DensityMatrixView } from '@/components/visualization/DensityMatrixView';
import { UnitaryMatrixView } from '@/components/visualization/UnitaryMatrixView';
import { EvolutionPlayer } from '@/components/visualization/EvolutionPlayer';
import { QuantumState3DViewer } from '@/components/visualization/QuantumState3DViewer';
import { EntanglementGraph } from '@/components/visualization/EntanglementGraph';
import { NoiseConfigPanel } from './NoiseConfigPanel';
import { CircuitMetricsPanel } from './CircuitMetricsPanel';
import { QASMPanel } from './QASMPanel';
import { TranspilerPanel } from './TranspilerPanel';
import * as Slider from '@radix-ui/react-slider';
import type { SimulationMode } from '@/types/quantum';

const SIM_MODES: { id: SimulationMode; label: string; desc: string }[] = [
  { id: 'statevector', label: 'Statevector', desc: 'Exact amplitude simulation' },
  { id: 'shots',       label: 'Shot-based',  desc: 'Sampling with noise support' },
  { id: 'density_matrix', label: 'Density Matrix', desc: 'Open quantum systems' },
  { id: 'unitary',    label: 'Unitary',      desc: 'Full circuit unitary matrix' },
  { id: 'evolution',  label: 'Evolution',    desc: 'Step-by-step state evolution' },
];

interface SimulationPanelProps {
  onRunSimulation: () => void;
  ws: { simulate: (p: Record<string, unknown>) => boolean; startEvolution: (p: Record<string, unknown>) => boolean };
}

export function SimulationPanel({ onRunSimulation, ws }: SimulationPanelProps) {
  const { simulation, circuit, setSimulationMode, setShots, setNoiseEnabled } = useQuantumStore();
  const [activeTab, setActiveTab] = useState('run');

  const hasResult = simulation.result !== null;
  const resultType = simulation.result?.type;

  const handleRun = () => {
    if (simulation.mode === 'evolution') {
      ws.startEvolution({ circuit });
    } else {
      onRunSimulation();
    }
    setActiveTab('results');
  };

  return (
    <div className="h-full flex flex-col bg-void-800/40">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Tab list */}
        <Tabs.List className="flex border-b border-quantum-500/10 bg-void-900/30">
          {[
            { id: 'run',          icon: <Play size={11} />,      label: 'Run' },
            { id: 'results',      icon: <BarChart3 size={11} />, label: 'Results' },
            { id: 'bloch',        icon: <Waves size={11} />,     label: 'Bloch' },
            { id: 'matrix',       icon: <Grid3x3 size={11} />,   label: 'Matrix' },
            { id: '3d',           icon: <Box size={11} />,       label: '3D' },
            { id: 'entanglement', icon: <Network size={11} />,   label: 'Graph' },
            { id: 'qasm',         icon: <Code2 size={11} />,     label: 'QASM' },
            { id: 'transpiler',   icon: <GitMerge size={11} />,  label: 'Transpile' },
            { id: 'metrics',      icon: <Cpu size={11} />,       label: 'Metrics' },
          ].map(tab => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1 px-3 py-2.5 text-xs font-body font-medium
                         text-slate-500 hover:text-slate-300 transition-colors relative
                         data-[state=active]:text-quantum-300 flex-1 justify-center"
            >
              {tab.icon}
              <span className="hidden sm:block">{tab.label}</span>
              {/* Active indicator */}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-quantum-500 rounded-full"
                />
              )}
              {/* Badge for results */}
              {tab.id === 'results' && hasResult && (
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 absolute top-1.5 right-1.5" />
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* ── Run Tab ─────────────────────────────────────────────────────── */}
        <Tabs.Content value="run" className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mode selector */}
          <div>
            <label className="stat-label block mb-2">Simulation Mode</label>
            <div className="flex flex-col gap-1.5">
              {SIM_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setSimulationMode(mode.id)}
                  className={`text-left px-3 py-2 rounded-lg border transition-all text-xs
                    ${simulation.mode === mode.id
                      ? 'bg-quantum-500/15 border-quantum-500/50 text-quantum-300'
                      : 'bg-void-700/30 border-quantum-500/10 text-slate-400 hover:border-quantum-500/25'
                    }`}
                >
                  <div className="font-mono font-semibold">{mode.label}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Shots (only for shot-based) */}
          <AnimatePresence>
            {simulation.mode === 'shots' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="stat-label block mb-2">
                  Shots: <span className="text-quantum-300 font-mono">{simulation.shots.toLocaleString()}</span>
                </label>
                <Slider.Root
                  min={100} max={100000} step={100}
                  value={[simulation.shots]}
                  onValueChange={([v]) => setShots(v)}
                  className="relative flex items-center h-5 w-full"
                >
                  <Slider.Track className="relative h-1 flex-1 rounded-full bg-void-700">
                    <Slider.Range className="absolute h-full rounded-full bg-quantum-500" />
                  </Slider.Track>
                  <Slider.Thumb className="block w-4 h-4 rounded-full bg-quantum-400 
                                           border-2 border-void-800 shadow-lg focus:outline-none
                                           hover:bg-quantum-300 cursor-pointer" />
                </Slider.Root>
                <div className="flex justify-between text-[10px] text-slate-700 mt-1">
                  <span>100</span><span>10k</span><span>100k</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Noise toggle */}
          <AnimatePresence>
            {(simulation.mode === 'shots' || simulation.mode === 'density_matrix') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <label className="stat-label">Noise Model</label>
                  <button
                    onClick={() => setNoiseEnabled(!simulation.noiseEnabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      simulation.noiseEnabled ? 'bg-quantum-500' : 'bg-void-600'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow
                                    transition-transform ${simulation.noiseEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {simulation.noiseEnabled && <NoiseConfigPanel />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Run button */}
          <button
            className="quantum-button-primary w-full py-2.5 flex items-center justify-center gap-2"
            onClick={handleRun}
            disabled={simulation.isRunning}
          >
            {simulation.isRunning ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span className="font-mono text-sm">{simulation.stage}… {simulation.progress}%</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span className="font-mono text-sm">Run Simulation</span>
              </>
            )}
          </button>

          {/* Progress bar */}
          {simulation.isRunning && (
            <div className="amplitude-bar">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-quantum-600 to-plasma-500"
                animate={{ width: `${simulation.progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          )}

          {/* Error */}
          {simulation.error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/25">
              <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-400 font-mono break-all">{simulation.error}</p>
            </div>
          )}
        </Tabs.Content>

        {/* ── Results Tab ──────────────────────────────────────────────────── */}
        <Tabs.Content value="results" className="flex-1 overflow-y-auto">
          {!hasResult && !simulation.isRunning ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
              <div className="w-12 h-12 rounded-xl bg-quantum-500/10 border border-quantum-500/20
                              flex items-center justify-center">
                <BarChart3 size={22} className="text-quantum-400/50" />
              </div>
              <p className="text-sm text-slate-600 text-center font-body">
                Run a simulation to see results
              </p>
            </div>
          ) : simulation.isRunning ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 size={24} className="text-quantum-400 animate-spin" />
              <p className="text-sm text-slate-500 font-mono">{simulation.stage}…</p>
            </div>
          ) : (
            <div className="p-0">
              {resultType === 'statevector' && <StatevectorView />}
              {resultType === 'shots' && <ProbabilityBarChart />}
              {resultType === 'density_matrix' && <DensityMatrixView />}
              {resultType === 'unitary' && <UnitaryMatrixView />}
              {simulation.evolutionSteps.length > 0 && simulation.mode === 'evolution' && (
                <EvolutionPlayer />
              )}
            </div>
          )}
        </Tabs.Content>

        {/* ── Bloch Tab ────────────────────────────────────────────────────── */}
        <Tabs.Content value="bloch" className="flex-1 overflow-hidden">
          <BlochSphereView />
        </Tabs.Content>

        {/* ── Matrix Tab ───────────────────────────────────────────────────── */}
        <Tabs.Content value="matrix" className="flex-1 overflow-y-auto">
          {resultType === 'unitary' ? <UnitaryMatrixView /> :
           resultType === 'density_matrix' ? <DensityMatrixView /> :
           <div className="flex items-center justify-center h-full">
             <p className="text-sm text-slate-600">Run Unitary or Density Matrix simulation</p>
           </div>
          }
        </Tabs.Content>

        {/* ── 3D Tab ───────────────────────────────────────────────────────── */}
        <Tabs.Content value="3d" className="flex-1 overflow-hidden">
          <QuantumState3DViewer />
        </Tabs.Content>

        {/* ── Entanglement Graph Tab ────────────────────────────────────────── */}
        <Tabs.Content value="entanglement" className="flex-1 overflow-hidden">
          <EntanglementGraph />
        </Tabs.Content>

        {/* ── QASM Tab ─────────────────────────────────────────────────────── */}
        <Tabs.Content value="qasm" className="flex-1 overflow-hidden">
          <QASMPanel />
        </Tabs.Content>

        {/* ── Transpiler Tab ────────────────────────────────────────────────── */}
        <Tabs.Content value="transpiler" className="flex-1 overflow-y-auto">
          <TranspilerPanel />
        </Tabs.Content>

        {/* ── Metrics Tab ──────────────────────────────────────────────────── */}
        <Tabs.Content value="metrics" className="flex-1 overflow-y-auto">
          <CircuitMetricsPanel />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
