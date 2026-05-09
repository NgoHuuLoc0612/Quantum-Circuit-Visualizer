'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useQuantumStore } from '@/store/quantumStore';
import { analyticsApi } from '@/lib/api';
import type { CircuitMetrics } from '@/types/quantum';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

interface AnalyticsResult {
  metrics: CircuitMetrics;
  gate_distribution: Record<string, { count: number; fraction: number }>;
  parallelism: number;
  clifford_fraction: number;
  non_clifford_fraction: number;
  estimated_runtime_ns: number;
  fault_tolerance_overhead: number;
}

export function CircuitMetricsPanel() {
  const { circuit } = useQuantumStore();
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (circuit.gates.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyticsApi.analyze(circuit as Record<string, unknown>) as AnalyticsResult;
      setAnalytics(result);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [circuit]);

  useEffect(() => { refresh(); }, [circuit.gates.length]);

  const radarData = analytics ? [
    { metric: 'Depth', value: Math.min(analytics.metrics.depth / 100, 1) * 100 },
    { metric: 'Width', value: Math.min(analytics.metrics.num_qubits / 20, 1) * 100 },
    { metric: 'Gates', value: Math.min(analytics.metrics.size / 500, 1) * 100 },
    { metric: 'Entangle', value: Math.min(analytics.metrics.num_nonlocal_gates / 100, 1) * 100 },
    { metric: 'T-count', value: Math.min(analytics.metrics.t_count / 100, 1) * 100 },
    { metric: 'Parallel', value: Math.min(analytics.parallelism / 5, 1) * 100 },
  ] : [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-slate-300">Circuit Analytics</h3>
        <button className="quantum-button px-2 py-1 text-xs" onClick={refresh} disabled={loading}>
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={12} className="text-red-400" />
          <p className="text-[10px] text-red-400 font-mono">{error}</p>
        </div>
      )}

      {circuit.gates.length === 0 ? (
        <p className="text-sm text-slate-600 text-center py-4">Add gates to see metrics</p>
      ) : analytics ? (
        <>
          {/* Core metrics grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Depth', value: analytics.metrics.depth },
              { label: 'Gate Count', value: analytics.metrics.size },
              { label: 'Qubits', value: analytics.metrics.num_qubits },
              { label: '2Q Gates', value: analytics.metrics.num_nonlocal_gates },
              { label: 'T-count', value: analytics.metrics.t_count },
              { label: 'Parallelism', value: analytics.parallelism.toFixed(2) },
            ].map(({ label, value }) => (
              <div key={label} className="glass-panel p-2.5 rounded-lg">
                <div className="stat-value text-sm">{value}</div>
                <div className="stat-label text-[9px]">{label}</div>
              </div>
            ))}
          </div>

          {/* Radar chart */}
          {radarData.length > 0 && (
            <div>
              <p className="stat-label text-[9px] mb-2">Complexity Profile</p>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                  <PolarGrid stroke="rgba(99,102,241,0.15)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  />
                  <Radar
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.15}
                    strokeWidth={1.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Clifford vs non-Clifford */}
          <div>
            <p className="stat-label text-[9px] mb-2">Gate Composition</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-600 w-20">Clifford</span>
                <div className="flex-1 amplitude-bar h-1.5">
                  <motion.div
                    className="h-full rounded-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${analytics.clifford_fraction * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="font-mono text-[9px] text-slate-500 w-10 text-right">
                  {(analytics.clifford_fraction * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-600 w-20">Non-Clifford</span>
                <div className="flex-1 amplitude-bar h-1.5">
                  <motion.div
                    className="h-full rounded-full bg-yellow-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${analytics.non_clifford_fraction * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="font-mono text-[9px] text-slate-500 w-10 text-right">
                  {(analytics.non_clifford_fraction * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Estimated runtime */}
          <div className="glass-panel p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="stat-label text-[9px]">Est. Gate Time</span>
              <span className="font-mono text-xs text-quantum-300">
                {analytics.estimated_runtime_ns >= 1000
                  ? `${(analytics.estimated_runtime_ns / 1000).toFixed(1)} μs`
                  : `${analytics.estimated_runtime_ns} ns`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="stat-label text-[9px]">FT Overhead (T-count)</span>
              <span className="font-mono text-xs text-yellow-400">
                ×{analytics.fault_tolerance_overhead > 0 ? analytics.fault_tolerance_overhead : '0'}
              </span>
            </div>
          </div>

          {/* Gate breakdown */}
          <div>
            <p className="stat-label text-[9px] mb-2">Gate Breakdown</p>
            <div className="space-y-1">
              {Object.entries(analytics.gate_distribution)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([gate, data]) => (
                  <div key={gate} className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-slate-500 w-10 uppercase">{gate}</span>
                    <div className="flex-1 amplitude-bar h-1">
                      <motion.div
                        className="h-full rounded-full bg-quantum-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${data.fraction * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-slate-600 w-6 text-right">{data.count}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      ) : loading ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <RefreshCw size={14} className="text-quantum-400 animate-spin" />
          <span className="text-xs text-slate-500">Computing metrics…</span>
        </div>
      ) : null}
    </div>
  );
}
