'use client';
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, GitMerge, Loader2, ChevronDown, TrendingDown } from 'lucide-react';
import { useQuantumStore } from '@/store/quantumStore';
import { transpilerApi } from '@/lib/api';
import { toast } from 'sonner';
import type { CircuitMetrics } from '@/types/quantum';

interface TranspileResult {
  transpiled: Record<string, unknown>;
  original_metrics: CircuitMetrics;
  transpiled_metrics: CircuitMetrics;
}

const BASIS_GATE_SETS = [
  { id: 'ibm', label: 'IBM (cx, u3)', gates: ['cx', 'u3', 'measure', 'reset'] },
  { id: 'google', label: 'Google (cz, phxz)', gates: ['cz', 'phxz', 'measure'] },
  { id: 'ionq', label: 'IonQ (ms, ry)', gates: ['ms', 'rx', 'ry', 'rz', 'measure'] },
  { id: 'minimal', label: 'Minimal (cx, rz, sx)', gates: ['cx', 'rz', 'sx', 'x', 'measure'] },
  { id: 'custom', label: 'Custom', gates: [] },
];

const COUPLING_MAPS = [
  { id: 'none', label: 'All-to-all', map: null },
  { id: 'linear3', label: 'Linear 3q (0-1-2)', map: [[0,1],[1,0],[1,2],[2,1]] },
  { id: 'linear5', label: 'Linear 5q', map: [[0,1],[1,0],[1,2],[2,1],[2,3],[3,2],[3,4],[4,3]] },
  { id: 'heavy_hex', label: 'Heavy-hex 7q', map: [[0,1],[1,0],[1,2],[2,1],[3,4],[4,3],[4,5],[5,4],[2,3],[5,6],[6,5]] },
];

function MetricCompare({
  label, before, after, lowerIsBetter = true
}: {
  label: string;
  before: number;
  after: number;
  lowerIsBetter?: boolean;
}) {
  const delta = after - before;
  const pct = before > 0 ? ((delta / before) * 100) : 0;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-quantum-500/8 last:border-0">
      <span className="text-[10px] text-slate-500 w-20 flex-shrink-0">{label}</span>
      <span className="font-mono text-xs text-slate-400 w-10 text-right">{before}</span>
      <ArrowRight size={10} className="text-slate-700 flex-shrink-0" />
      <span className={`font-mono text-xs w-10 ${improved ? 'text-green-400' : delta === 0 ? 'text-slate-400' : 'text-red-400'}`}>
        {after}
      </span>
      {delta !== 0 && (
        <span className={`font-mono text-[9px] ml-auto ${improved ? 'text-green-600' : 'text-red-600'}`}>
          {improved ? '↓' : '↑'}{Math.abs(pct).toFixed(0)}%
        </span>
      )}
    </div>
  );
}

export function TranspilerPanel() {
  const { circuit, setCircuit } = useQuantumStore();
  const [optimLevel, setOptimLevel] = useState(2);
  const [basisSet, setBasisSet] = useState('ibm');
  const [couplingId, setCouplingId] = useState('none');
  const [result, setResult] = useState<TranspileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBasis = BASIS_GATE_SETS.find(b => b.id === basisSet)!;
  const selectedCoupling = COUPLING_MAPS.find(c => c.id === couplingId)!;

  const handleTranspile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        circuit,
        optimization_level: optimLevel,
        basis_gates: selectedBasis.gates,
      };
      if (selectedCoupling.map) {
        payload.coupling_map = selectedCoupling.map;
      }
      const res = await transpilerApi.transpile(payload) as TranspileResult;
      setResult(res);
      toast.success('Circuit transpiled');
    } catch (e: unknown) {
      setError((e as Error).message);
      toast.error('Transpilation failed');
    } finally {
      setLoading(false);
    }
  }, [circuit, optimLevel, selectedBasis, selectedCoupling]);

  const applyTranspiled = useCallback(() => {
    if (!result?.transpiled) return;
    setCircuit(result.transpiled as never);
    toast.success('Transpiled circuit applied');
  }, [result, setCircuit]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <GitMerge size={14} className="text-quantum-400" />
        <h3 className="font-display text-sm font-semibold text-slate-300">Circuit Transpiler</h3>
      </div>

      {/* Optimization level */}
      <div>
        <label className="stat-label text-[9px] block mb-2">Optimization Level</label>
        <div className="grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map(level => (
            <button
              key={level}
              onClick={() => setOptimLevel(level)}
              className={`py-1.5 rounded text-xs font-mono border transition-colors ${
                optimLevel === level
                  ? 'bg-quantum-500/20 border-quantum-500/50 text-quantum-300'
                  : 'border-quantum-500/15 text-slate-600 hover:text-slate-400'
              }`}
            >
              O{level}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-slate-600 mt-1">
          {['No optimization', 'Light optimization', 'Medium (default)', 'Heavy optimization'][optimLevel]}
        </p>
      </div>

      {/* Basis gate set */}
      <div>
        <label className="stat-label text-[9px] block mb-2">Target Basis Gates</label>
        <select
          value={basisSet}
          onChange={e => setBasisSet(e.target.value)}
          className="w-full bg-void-700/50 border border-quantum-500/15 rounded px-2 py-1.5
                     font-mono text-xs text-slate-300 focus:outline-none focus:border-quantum-500/40"
        >
          {BASIS_GATE_SETS.map(b => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
        {selectedBasis.gates.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {selectedBasis.gates.map(g => (
              <span key={g} className="px-1.5 py-0.5 text-[9px] font-mono rounded
                                       bg-quantum-500/10 text-quantum-400 border border-quantum-500/20">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Coupling map */}
      <div>
        <label className="stat-label text-[9px] block mb-2">Coupling Map (Connectivity)</label>
        <select
          value={couplingId}
          onChange={e => setCouplingId(e.target.value)}
          className="w-full bg-void-700/50 border border-quantum-500/15 rounded px-2 py-1.5
                     font-mono text-xs text-slate-300 focus:outline-none"
        >
          {COUPLING_MAPS.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Run */}
      <button
        className="quantum-button-primary w-full py-2 flex items-center justify-center gap-2"
        onClick={handleTranspile}
        disabled={loading}
      >
        {loading ? (
          <><Loader2 size={13} className="animate-spin" /><span>Transpiling…</span></>
        ) : (
          <><GitMerge size={13} /><span>Transpile Circuit</span></>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-[10px] text-red-400 font-mono">{error}</p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {/* Metrics comparison */}
            <div className="glass-panel rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={12} className="text-green-400" />
                <span className="font-display text-xs font-semibold text-slate-300">
                  Transpilation Results
                </span>
              </div>

              <div className="flex items-center gap-2 text-[9px] text-slate-700 mb-2">
                <span className="w-20">Metric</span>
                <span className="w-10 text-right">Before</span>
                <span className="w-4" />
                <span className="w-10">After</span>
                <span className="ml-auto">Δ</span>
              </div>

              <MetricCompare label="Depth" before={result.original_metrics.depth} after={result.transpiled_metrics.depth} />
              <MetricCompare label="Gate count" before={result.original_metrics.size} after={result.transpiled_metrics.size} />
              <MetricCompare label="2Q gates" before={result.original_metrics.num_nonlocal_gates} after={result.transpiled_metrics.num_nonlocal_gates} />
              <MetricCompare label="T-count" before={result.original_metrics.t_count} after={result.transpiled_metrics.t_count} />
            </div>

            {/* Gate count breakdown */}
            <div className="glass-panel rounded-xl p-3">
              <p className="stat-label text-[9px] mb-2">Gate Breakdown After Transpilation</p>
              {Object.entries(result.transpiled_metrics.gate_counts).map(([gate, count]) => (
                <div key={gate} className="flex items-center gap-2 py-0.5">
                  <span className="font-mono text-[9px] text-slate-500 w-12 uppercase">{gate}</span>
                  <div className="flex-1 amplitude-bar h-1">
                    <motion.div
                      className="h-full rounded-full bg-quantum-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / Math.max(result.transpiled_metrics.size, 1)) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-slate-600 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>

            {/* Apply button */}
            <button
              className="quantum-button w-full py-2 text-xs"
              onClick={applyTranspiled}
            >
              Apply Transpiled Circuit
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
