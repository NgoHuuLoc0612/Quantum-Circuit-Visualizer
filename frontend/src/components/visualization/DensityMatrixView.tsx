'use client';
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuantumStore } from '@/store/quantumStore';
import type { DensityMatrixResult, UnitaryResult } from '@/types/quantum';
import { formatComplex } from '@/lib/webgpu/compute';

// ─── Color scales ─────────────────────────────────────────────────────────────

function magnitudeToColor(magnitude: number, alpha = 0.9): string {
  // Plasma-inspired color scale: dark → purple → pink → yellow
  const t = Math.min(magnitude, 1);
  const r = Math.round(t < 0.5 ? 80 * t * 2 : 80 + (219 - 80) * (t - 0.5) * 2);
  const g = Math.round(t < 0.5 ? 10 : (t - 0.5) * 2 * 130);
  const b = Math.round(t < 0.5 ? 130 + (239 - 130) * t * 2 : 239 * (1 - (t - 0.5) * 2));
  return `rgba(${r},${g},${b},${alpha})`;
}

function phaseToColor(phase: number): string {
  const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360;
  return `hsl(${hue}, 75%, 55%)`;
}

// ─── Matrix Cell ──────────────────────────────────────────────────────────────
interface MatrixEntry { re: number; im: number; magnitude?: number; phase?: number }

function MatrixCell({
  entry,
  size,
  mode,
  showValue,
}: {
  entry: MatrixEntry;
  size: number;
  mode: 'magnitude' | 'phase' | 'real' | 'imag';
  showValue: boolean;
}) {
  const magnitude = entry.magnitude ?? Math.sqrt(entry.re * entry.re + entry.im * entry.im);
  const phase = entry.phase ?? Math.atan2(entry.im, entry.re);

  const bg = mode === 'magnitude' ? magnitudeToColor(magnitude) :
             mode === 'phase'     ? phaseToColor(phase) + `88` :
             mode === 'real'      ? magnitudeToColor(Math.abs(entry.re)) :
                                    magnitudeToColor(Math.abs(entry.im));

  const cellSize = Math.max(12, Math.min(40, 320 / size));

  return (
    <div
      title={`(${entry.re.toFixed(4)}, ${entry.im.toFixed(4)}i) |${magnitude.toFixed(3)}| ∠${(phase * 180 / Math.PI).toFixed(1)}°`}
      className="relative flex items-center justify-center border border-void-700/30 
                 cursor-help hover:z-10 hover:scale-110 transition-transform"
      style={{ width: cellSize, height: cellSize, background: bg, minWidth: cellSize }}
    >
      {showValue && cellSize >= 28 && (
        <span className="font-mono text-[7px] text-white/80 select-none leading-none text-center px-0.5">
          {magnitude.toFixed(2)}
        </span>
      )}
    </div>
  );
}

// ─── Density Matrix View ──────────────────────────────────────────────────────
export function DensityMatrixView() {
  const { simulation } = useQuantumStore();
  const [mode, setMode] = useState<'magnitude' | 'phase' | 'real' | 'imag'>('magnitude');
  const [showValues, setShowValues] = useState(false);

  const result = simulation.result as DensityMatrixResult | null;
  if (!result || result.type !== 'density_matrix') {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-slate-600">Run Density Matrix simulation</p>
      </div>
    );
  }

  const { density_matrix, purity, is_pure, von_neumann_entropy } = result;
  const size = density_matrix.size;

  return (
    <div className="p-4 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-panel p-2.5 rounded-lg text-center">
          <div className="stat-value text-sm">{purity.toFixed(4)}</div>
          <div className="stat-label text-[9px]">Purity Tr(ρ²)</div>
        </div>
        <div className="glass-panel p-2.5 rounded-lg text-center">
          <div className="stat-value text-sm">{von_neumann_entropy.toFixed(4)}</div>
          <div className="stat-label text-[9px]">S(ρ) entropy</div>
        </div>
        <div className="glass-panel p-2.5 rounded-lg text-center">
          <div className={`stat-value text-sm ${is_pure ? 'text-green-400' : 'text-yellow-400'}`}>
            {is_pure ? 'Pure' : 'Mixed'}
          </div>
          <div className="stat-label text-[9px]">State type</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['magnitude', 'phase', 'real', 'imag'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2 py-1 text-[10px] font-mono rounded transition-colors border ${
              mode === m
                ? 'bg-quantum-500/20 border-quantum-500/50 text-quantum-300'
                : 'border-quantum-500/15 text-slate-500 hover:text-slate-300'
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
        <label className="flex items-center gap-1 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={showValues}
            onChange={e => setShowValues(e.target.checked)}
            className="w-3 h-3 accent-quantum-500"
          />
          <span className="text-[10px] text-slate-600">Values</span>
        </label>
      </div>

      {/* Matrix grid */}
      <div className="overflow-auto">
        <div className="inline-flex flex-col border border-quantum-500/20 rounded-lg overflow-hidden">
          {density_matrix.data.map((row, ri) => (
            <div key={ri} className="flex">
              {row.map((entry, ci) => (
                <MatrixCell
                  key={ci}
                  entry={entry}
                  size={size}
                  mode={mode}
                  showValue={showValues}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Color scale legend */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-slate-600">0</span>
        <div className="flex-1 h-2 rounded-full overflow-hidden"
             style={{
               background: 'linear-gradient(to right, rgba(50,5,82,1), rgba(145,15,208,1), rgba(240,100,150,1), rgba(250,200,50,1))'
             }}
        />
        <span className="text-[9px] text-slate-600">1</span>
      </div>
    </div>
  );
}

// ─── Unitary Matrix View ──────────────────────────────────────────────────────
export function UnitaryMatrixView() {
  const { simulation } = useQuantumStore();
  const [mode, setMode] = useState<'magnitude' | 'phase' | 'real' | 'imag'>('magnitude');
  const [showValues, setShowValues] = useState(false);

  const result = simulation.result as UnitaryResult | null;
  if (!result || result.type !== 'unitary') {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-slate-600">Run Unitary simulation</p>
      </div>
    );
  }

  const { unitary } = result;
  const size = unitary.size;
  const det = unitary.determinant;
  const detMag = Math.sqrt(det.re ** 2 + det.im ** 2);

  return (
    <div className="p-4 space-y-4">
      {/* Info */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-panel p-2.5 rounded-lg text-center">
          <div className={`stat-value text-sm ${unitary.is_unitary ? 'text-green-400' : 'text-red-400'}`}>
            {unitary.is_unitary ? '✓' : '✗'}
          </div>
          <div className="stat-label text-[9px]">Unitary UU†=I</div>
        </div>
        <div className="glass-panel p-2.5 rounded-lg text-center">
          <div className="stat-value text-sm">{size}×{size}</div>
          <div className="stat-label text-[9px]">Dimension</div>
        </div>
        <div className="glass-panel p-2.5 rounded-lg text-center">
          <div className="stat-value text-sm">{detMag.toFixed(4)}</div>
          <div className="stat-label text-[9px]">|det(U)|</div>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1.5 flex-wrap">
        {(['magnitude', 'phase', 'real', 'imag'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
              mode === m
                ? 'bg-quantum-500/20 border-quantum-500/50 text-quantum-300'
                : 'border-quantum-500/15 text-slate-500 hover:text-slate-300'
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
        <label className="flex items-center gap-1 ml-auto cursor-pointer">
          <input type="checkbox" checked={showValues} onChange={e => setShowValues(e.target.checked)}
                 className="w-3 h-3 accent-quantum-500" />
          <span className="text-[10px] text-slate-600">Values</span>
        </label>
      </div>

      {/* Unitary matrix grid */}
      {size <= 32 ? (
        <div className="overflow-auto">
          <div className="inline-flex flex-col border border-quantum-500/20 rounded-lg overflow-hidden">
            {unitary.data.map((row, ri) => (
              <div key={ri} className="flex">
                {row.map((entry, ci) => (
                  <MatrixCell
                    key={ci}
                    entry={entry}
                    size={size}
                    mode={mode}
                    showValue={showValues}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-slate-600">
          Matrix too large to display ({size}×{size}). Use density matrix view.
        </div>
      )}
    </div>
  );
}
