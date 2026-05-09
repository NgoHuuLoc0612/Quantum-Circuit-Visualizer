'use client';
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuantumStore } from '@/store/quantumStore';
import type { StatevectorSimResult, AmplitudeEntry } from '@/types/quantum';
import { formatComplex } from '@/lib/webgpu/compute';

// ─── Phase wheel SVG ──────────────────────────────────────────────────────────
function PhaseWheel({ phase, magnitude, color }: { phase: number; magnitude: number; color: string }) {
  const r = 10;
  const cx = 12, cy = 12;
  const x = cx + r * Math.cos(phase - Math.PI / 2) * magnitude;
  const y = cy + r * Math.sin(phase - Math.PI / 2) * magnitude;

  return (
    <svg width={24} height={24} viewBox="0 0 24 24">
      {/* Phase arc background */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth={1} />
      {/* Phase arc fill */}
      {magnitude > 0.01 && (
        <path
          d={describeArc(cx, cy, r - 2, -Math.PI / 2, phase - Math.PI / 2)}
          fill={color + '30'}
          stroke={color + '60'}
          strokeWidth={0.5}
        />
      )}
      {/* Amplitude arrow */}
      <line
        x1={cx} y1={cy} x2={x} y2={y}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={magnitude}
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={1} fill={color} />
    </svg>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = { x: cx + r * Math.cos(startAngle), y: cy + r * Math.sin(startAngle) };
  const end = { x: cx + r * Math.cos(endAngle), y: cy + r * Math.sin(endAngle) };
  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

// ─── Phase → color mapping ─────────────────────────────────────────────────
function phaseToColor(phase: number): string {
  const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360;
  return `hsl(${hue}, 80%, 60%)`;
}

// ─── Amplitude Row ────────────────────────────────────────────────────────────
function AmplitudeRow({ entry, maxProb, rank }: { entry: AmplitudeEntry; maxProb: number; rank: number }) {
  const color = phaseToColor(entry.phase);
  const barWidth = maxProb > 0 ? (entry.probability / maxProb) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.015, duration: 0.2 }}
      className="flex items-center gap-2 px-3 py-1.5 hover:bg-quantum-500/5 
                 transition-colors group rounded"
    >
      {/* Basis state */}
      <span className="font-mono text-[10px] text-slate-500 w-8 flex-shrink-0">
        |{entry.basis}⟩
      </span>

      {/* Phase wheel */}
      <div className="flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
        <PhaseWheel phase={entry.phase} magnitude={entry.magnitude} color={color} />
      </div>

      {/* Probability bar */}
      <div className="flex-1 relative h-4 rounded overflow-hidden bg-void-700/50">
        <motion.div
          className="absolute inset-y-0 left-0 rounded"
          style={{ background: `linear-gradient(to right, ${color}50, ${color}80)` }}
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: rank * 0.02 }}
        />
        {/* Probability label */}
        <span className="absolute right-1 top-1/2 -translate-y-1/2 font-mono text-[9px] text-slate-400">
          {(entry.probability * 100).toFixed(1)}%
        </span>
      </div>

      {/* Amplitude value */}
      <span className="font-mono text-[9px] text-slate-500 w-28 text-right flex-shrink-0
                       group-hover:text-slate-300 transition-colors">
        {formatComplex(entry.re, entry.im, 3)}
      </span>
    </motion.div>
  );
}

// ─── Statevector View ─────────────────────────────────────────────────────────
export function StatevectorView() {
  const { simulation } = useQuantumStore();
  const [sortBy, setSortBy] = useState<'index' | 'probability' | 'phase'>('probability');
  const [showZero, setShowZero] = useState(false);
  const [search, setSearch] = useState('');

  const result = simulation.result as StatevectorSimResult | null;
  if (!result || result.type !== 'statevector') return null;

  const { amplitudes } = result.statevector;

  const maxProb = useMemo(() => Math.max(...amplitudes.map(a => a.probability)), [amplitudes]);

  const filtered = useMemo(() => {
    let entries = amplitudes;
    if (!showZero) entries = entries.filter(a => a.probability > 1e-6);
    if (search) entries = entries.filter(a => a.basis.includes(search));
    if (sortBy === 'probability') return [...entries].sort((a, b) => b.probability - a.probability);
    if (sortBy === 'phase') return [...entries].sort((a, b) => a.phase - b.phase);
    return entries;
  }, [amplitudes, showZero, search, sortBy]);

  // Summary stats
  const nonZero = amplitudes.filter(a => a.probability > 1e-6).length;

  return (
    <div className="flex flex-col">
      {/* Summary */}
      <div className="px-4 pt-4 pb-2 grid grid-cols-3 gap-3">
        <div className="glass-panel p-2.5 rounded-lg text-center">
          <div className="stat-value text-sm">{nonZero}</div>
          <div className="stat-label text-[9px]">Non-zero states</div>
        </div>
        <div className="glass-panel p-2.5 rounded-lg text-center">
          <div className="stat-value text-sm">{result.statevector.num_qubits}</div>
          <div className="stat-label text-[9px]">Qubits</div>
        </div>
        <div className="glass-panel p-2.5 rounded-lg text-center">
          <div className="stat-value text-sm">{result.entropy?.toFixed(3) ?? '—'}</div>
          <div className="stat-label text-[9px]">S(ρ) entropy</div>
        </div>
      </div>

      {/* Entanglement */}
      {result.entanglement && result.entanglement.concurrence !== undefined && (
        <div className="px-4 pb-2">
          <div className="glass-panel p-2.5 rounded-lg flex items-center justify-between">
            <span className="stat-label text-[9px]">Concurrence</span>
            <div className="flex items-center gap-2">
              <div className="amplitude-bar w-20">
                <motion.div
                  className="h-full rounded-full bg-plasma-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(result.entanglement.concurrence ?? 0) * 100}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <span className="font-mono text-xs text-plasma-400">
                {(result.entanglement.concurrence ?? 0).toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="px-3 pb-2 flex items-center gap-2 flex-wrap">
        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-void-700/50 border border-quantum-500/15 rounded px-2 py-1 
                     text-[10px] font-mono text-slate-400 focus:outline-none"
        >
          <option value="probability">Sort: Probability</option>
          <option value="index">Sort: Index</option>
          <option value="phase">Sort: Phase</option>
        </select>

        {/* Search basis */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter |ψ⟩…"
          className="bg-void-700/50 border border-quantum-500/15 rounded px-2 py-1
                     text-[10px] font-mono text-slate-400 placeholder:text-slate-700
                     focus:outline-none w-24"
        />

        {/* Show zero */}
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={showZero}
            onChange={e => setShowZero(e.target.checked)}
            className="w-3 h-3 rounded border-quantum-500/30 accent-quantum-500"
          />
          <span className="text-[10px] text-slate-600">Show zero</span>
        </label>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-3 pb-1 border-b border-quantum-500/10">
        <span className="font-body text-[9px] text-slate-700 uppercase w-8">|ψ⟩</span>
        <span className="font-body text-[9px] text-slate-700 uppercase w-6">φ</span>
        <span className="font-body text-[9px] text-slate-700 uppercase flex-1">Probability</span>
        <span className="font-body text-[9px] text-slate-700 uppercase w-28 text-right">Amplitude</span>
      </div>

      {/* Amplitude rows */}
      <div className="overflow-y-auto max-h-96">
        <AnimatePresence>
          {filtered.map((entry, i) => (
            <AmplitudeRow
              key={entry.basis}
              entry={entry}
              maxProb={maxProb}
              rank={i}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="text-center text-xs text-slate-700 py-6">No states match filter</p>
        )}
      </div>

      {/* Von Neumann entropy per qubit */}
      {result.entanglement?.von_neumann_entropy && (
        <div className="px-4 py-3 border-t border-quantum-500/10">
          <p className="stat-label text-[9px] mb-2">Subsystem Entropy S(q_i)</p>
          <div className="flex flex-col gap-1">
            {Object.entries(result.entanglement.von_neumann_entropy).map(([qubit, ent]) => (
              <div key={qubit} className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-slate-600 w-10">q[{qubit}]</span>
                <div className="flex-1 amplitude-bar h-1.5">
                  <motion.div
                    className="h-full rounded-full bg-quantum-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(ent * 100, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="font-mono text-[9px] text-slate-500 w-12 text-right">
                  {Number(ent).toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
