'use client';
// ─── EvolutionPlayer ──────────────────────────────────────────────────────────
import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useQuantumStore } from '@/store/quantumStore';
import * as Slider from '@radix-ui/react-slider';

export function EvolutionPlayer() {
  const { simulation, seekEvolutionStep } = useQuantumStore();
  const { evolutionSteps, currentEvolutionStep } = simulation;
  const total = evolutionSteps.length;
  const current = evolutionSteps[currentEvolutionStep];

  if (total === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-quantum-500/10 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-xs font-semibold text-slate-300">State Evolution</h4>
        <span className="font-mono text-[10px] text-quantum-400">
          Step {currentEvolutionStep} / {total - 1}
        </span>
      </div>

      {/* Current gate info */}
      {current?.gate && (
        <div className="glass-panel px-3 py-2 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-quantum-500 animate-pulse" />
          <span className="font-mono text-xs text-quantum-300">{current.gate.type}</span>
          <span className="font-mono text-[10px] text-slate-500">
            q[{current.gate.qubits.join(',')}]
            {current.gate.params?.length > 0 && ` (${current.gate.params.map(p => p.toFixed(2)).join(',')})`}
          </span>
        </div>
      )}

      {/* Timeline slider */}
      <Slider.Root
        min={0} max={Math.max(total - 1, 1)} step={1}
        value={[currentEvolutionStep]}
        onValueChange={([v]) => seekEvolutionStep(v)}
        className="relative flex items-center h-5 w-full"
      >
        <Slider.Track className="relative h-1.5 flex-1 rounded-full bg-void-700">
          <Slider.Range className="absolute h-full rounded-full bg-quantum-500" />
        </Slider.Track>
        <Slider.Thumb className="block w-4 h-4 rounded-full bg-quantum-400 border-2 border-void-800
                                 shadow-lg focus:outline-none cursor-pointer" />
      </Slider.Root>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-2">
        <button className="quantum-button px-2 py-1.5" onClick={() => seekEvolutionStep(0)}>
          <SkipBack size={12} />
        </button>
        <button className="quantum-button px-2 py-1.5" onClick={() => seekEvolutionStep(currentEvolutionStep - 1)}>
          <ChevronLeft size={12} />
        </button>
        <button className="quantum-button px-2 py-1.5" onClick={() => seekEvolutionStep(currentEvolutionStep + 1)}>
          <ChevronRight size={12} />
        </button>
        <button className="quantum-button px-2 py-1.5" onClick={() => seekEvolutionStep(total - 1)}>
          <SkipForward size={12} />
        </button>
      </div>

      {/* Progress */}
      <div className="amplitude-bar">
        <motion.div
          className="h-full rounded-full bg-quantum-500"
          animate={{ width: `${(currentEvolutionStep / Math.max(total - 1, 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
