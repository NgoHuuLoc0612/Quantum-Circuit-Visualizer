'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';
import { useQuantumStore, selectSelectedGate } from '@/store/quantumStore';
import { getGateDef, COMMON_ANGLES } from '@/lib/gates';
import * as Slider from '@radix-ui/react-slider';

export function PropertyPanel() {
  const selectedGate = useQuantumStore(selectSelectedGate);
  const { updateGate, removeGate, selectGate, pushHistory, circuit } = useQuantumStore();
  const [params, setParams] = useState<number[]>([]);

  const def = selectedGate ? getGateDef(selectedGate.type) : null;

  useEffect(() => {
    if (selectedGate) {
      setParams(selectedGate.params.map(p => typeof p === 'number' ? p : Math.PI / 2));
    }
  }, [selectedGate?.id]);

  const applyParams = useCallback(() => {
    if (!selectedGate) return;
    updateGate(selectedGate.id, { params });
    pushHistory(`Update ${def?.name ?? selectedGate.type} params`);
  }, [selectedGate, params, updateGate, pushHistory, def]);

  const handleQubitChange = useCallback((i: number, newQ: number) => {
    if (!selectedGate) return;
    const newQubits = [...selectedGate.qubits];
    newQubits[i] = newQ;
    updateGate(selectedGate.id, { qubits: newQubits });
    pushHistory(`Move ${def?.name ?? selectedGate.type} qubit`);
  }, [selectedGate, updateGate, pushHistory, def]);

  return (
    <AnimatePresence>
      {selectedGate && def && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 
                     glass-panel rounded-xl border border-quantum-500/25 shadow-2xl
                     w-auto min-w-80 max-w-lg quantum-glow"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-quantum-500/10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: `${def.color}20`, border: `1px solid ${def.color}50` }}>
              <span className="font-mono font-bold text-xs" style={{ color: def.color }}>
                {def.name}
              </span>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold text-slate-200">{def.name}</h4>
              {def.description && (
                <p className="text-[10px] text-slate-500">{def.description}</p>
              )}
            </div>
            <button
              className="ml-auto w-6 h-6 rounded flex items-center justify-center 
                         hover:bg-quantum-500/20 transition-colors"
              onClick={() => selectGate(null)}
            >
              <X size={12} className="text-slate-500" />
            </button>
          </div>

          <div className="px-4 py-3 flex gap-6">
            {/* Qubit selector */}
            <div>
              <p className="stat-label text-[9px] mb-2">Qubits</p>
              <div className="flex flex-col gap-1.5">
                {selectedGate.qubits.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-slate-600 w-8">
                      {i === 0 ? 'ctrl' : i === selectedGate.qubits.length - 1 ? 'tgt' : `q${i}`}
                    </span>
                    <select
                      value={q}
                      onChange={e => handleQubitChange(i, Number(e.target.value))}
                      className="bg-void-700 border border-quantum-500/20 rounded px-2 py-1
                                 font-mono text-xs text-slate-300 focus:outline-none
                                 focus:border-quantum-500/50"
                    >
                      {Array.from({ length: circuit.num_qubits }, (_, qi) => (
                        <option key={qi} value={qi}>q[{qi}]</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Parameter editors */}
            {def.params > 0 && (
              <div className="flex-1 min-w-40">
                <p className="stat-label text-[9px] mb-2">Parameters</p>
                <div className="flex flex-col gap-3">
                  {Array.from({ length: def.params }, (_, i) => {
                    const paramName = def.paramNames?.[i] ?? `θ${i + 1}`;
                    const val = params[i] ?? 0;
                    const valInPi = val / Math.PI;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] text-slate-400">{paramName}</span>
                          <span className="font-mono text-[10px] text-quantum-300">
                            {val.toFixed(4)} ({valInPi.toFixed(3)}π)
                          </span>
                        </div>
                        <Slider.Root
                          min={-Math.PI * 2} max={Math.PI * 2} step={Math.PI / 64}
                          value={[val]}
                          onValueChange={([v]) => {
                            const newParams = [...params];
                            newParams[i] = v;
                            setParams(newParams);
                          }}
                          onValueCommit={applyParams}
                          className="relative flex items-center h-4 w-full"
                        >
                          <Slider.Track className="relative h-1 flex-1 rounded-full bg-void-600">
                            <Slider.Range className="absolute h-full rounded-full bg-quantum-500" />
                          </Slider.Track>
                          <Slider.Thumb className="block w-3 h-3 rounded-full bg-quantum-400 
                                                   focus:outline-none cursor-pointer" />
                        </Slider.Root>
                        {/* Quick angle buttons */}
                        <div className="flex gap-1 flex-wrap">
                          {COMMON_ANGLES.map(({ label, value: av }) => (
                            <button
                              key={label}
                              onClick={() => {
                                const np = [...params];
                                np[i] = av;
                                setParams(np);
                                setTimeout(applyParams, 0);
                              }}
                              className="px-1.5 py-0.5 text-[8px] font-mono rounded border 
                                         border-quantum-500/20 text-slate-600 
                                         hover:text-quantum-300 hover:border-quantum-500/40 transition-colors"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 pb-3 flex gap-2 border-t border-quantum-500/10 pt-3">
            <button
              className="quantum-button-danger px-3 py-1.5 text-xs flex-1"
              onClick={() => {
                removeGate(selectedGate.id);
                pushHistory(`Remove ${def.name}`);
              }}
            >
              Remove Gate
            </button>
            {def.params > 0 && (
              <button className="quantum-button px-3 py-1.5 text-xs" onClick={applyParams}>
                Apply
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
