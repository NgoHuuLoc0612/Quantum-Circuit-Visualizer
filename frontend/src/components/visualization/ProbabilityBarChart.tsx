'use client';
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, PieChart, Pie, Legend,
} from 'recharts';
import { useQuantumStore } from '@/store/quantumStore';
import type { ShotsSimResult } from '@/types/quantum';

const COLORS = [
  '#6366f1','#d946ef','#06b6d4','#f59e0b','#10b981',
  '#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316',
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { state: string; count: number; probability: number; percentage: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-panel px-3 py-2 rounded-lg border border-quantum-500/30">
      <p className="font-mono text-xs text-quantum-300 mb-1">|{d.state}⟩</p>
      <p className="font-mono text-[10px] text-slate-400">Count: <span className="text-white">{d.count.toLocaleString()}</span></p>
      <p className="font-mono text-[10px] text-slate-400">Prob: <span className="text-white">{(d.probability * 100).toFixed(3)}%</span></p>
    </div>
  );
}

export function ProbabilityBarChart() {
  const { simulation } = useQuantumStore();
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [showTop, setShowTop] = useState(16);

  const result = simulation.result as ShotsSimResult | null;
  if (!result || result.type !== 'shots') return null;

  const chartData = useMemo(
    () => result.distribution.slice(0, showTop),
    [result.distribution, showTop]
  );

  const idealUniform = 1 / Math.max(result.num_outcomes, 1);

  return (
    <div className="flex flex-col gap-0">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2 px-4 py-3">
        <div className="glass-panel p-2.5 rounded-lg">
          <div className="stat-value text-sm">{result.shots.toLocaleString()}</div>
          <div className="stat-label text-[9px]">Total shots</div>
        </div>
        <div className="glass-panel p-2.5 rounded-lg">
          <div className="stat-value text-sm">{result.num_outcomes}</div>
          <div className="stat-label text-[9px]">Unique outcomes</div>
        </div>
        <div className="glass-panel p-2.5 rounded-lg">
          <div className="stat-value text-sm">{(result.max_probability * 100).toFixed(1)}%</div>
          <div className="stat-label text-[9px]">Max probability</div>
        </div>
        <div className="glass-panel p-2.5 rounded-lg">
          <div className="stat-value text-sm">{result.entropy_from_counts.toFixed(3)}</div>
          <div className="stat-label text-[9px]">Shannon H</div>
        </div>
      </div>

      {/* Noise badge */}
      {result.noise_applied && (
        <div className="mx-4 mb-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/25
                        flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          <span className="text-[10px] text-yellow-400 font-mono">Noise model applied</span>
        </div>
      )}

      {/* Controls */}
      <div className="px-4 pb-2 flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-quantum-500/20">
          {(['bar', 'pie'] as const).map(t => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className={`px-3 py-1 text-[10px] font-mono transition-colors ${
                chartType === t
                  ? 'bg-quantum-500/20 text-quantum-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={showTop}
          onChange={e => setShowTop(Number(e.target.value))}
          className="bg-void-700/50 border border-quantum-500/15 rounded px-2 py-1 
                     text-[10px] font-mono text-slate-400 focus:outline-none ml-auto"
        >
          <option value={8}>Top 8</option>
          <option value={16}>Top 16</option>
          <option value={32}>Top 32</option>
          <option value={9999}>All</option>
        </select>
      </div>

      {/* Chart */}
      <div className="px-2">
        {chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(99,102,241,0.08)" vertical={false} />
              <XAxis
                dataKey="state"
                tick={{ fill: '#64748b', fontSize: 8, fontFamily: 'JetBrains Mono' }}
                angle={-45}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
              <ReferenceLine
                y={idealUniform}
                stroke="#475569"
                strokeDasharray="3 3"
                label={{ value: 'Uniform', fill: '#475569', fontSize: 8, position: 'right' }}
              />
              <Bar dataKey="probability" radius={[3, 3, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="probability"
                nameKey="state"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={2}
                label={({ state, percentage }) =>
                  percentage > 3 ? `${state} ${percentage.toFixed(0)}%` : ''
                }
                labelLine={{ stroke: '#475569', strokeWidth: 0.5 }}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Raw counts table */}
      <div className="px-4 py-2 border-t border-quantum-500/10">
        <p className="stat-label text-[9px] mb-2">Raw Counts</p>
        <div className="max-h-40 overflow-y-auto space-y-0.5">
          {result.distribution.slice(0, 32).map((d, i) => (
            <div key={d.state} className="flex items-center gap-2 py-0.5 hover:bg-quantum-500/5 rounded px-1">
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="font-mono text-[9px] text-slate-400 w-16">|{d.state}⟩</span>
              <div className="flex-1 amplitude-bar h-1">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${d.percentage}%` }}
                  transition={{ duration: 0.4, delay: i * 0.02 }}
                />
              </div>
              <span className="font-mono text-[9px] text-slate-500 w-12 text-right">{d.count.toLocaleString()}</span>
              <span className="font-mono text-[9px] text-slate-600 w-10 text-right">{d.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
