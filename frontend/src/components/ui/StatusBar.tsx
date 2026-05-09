'use client';
import React from 'react';
import { useQuantumStore } from '@/store/quantumStore';

export function StatusBar({ webgpuSupported }: { webgpuSupported: boolean | null }) {
  const { circuit, simulation, wsConnected } = useQuantumStore();

  return (
    <div className="h-6 flex items-center px-3 gap-4 border-t border-quantum-500/10 
                    bg-void-900/60 text-[9px] font-mono text-slate-600 flex-shrink-0">
      <div className="flex items-center gap-3">
        <span>
          <span className="text-slate-500">{circuit.num_qubits}</span> qubits
        </span>
        <span>
          <span className="text-slate-500">{circuit.gates.length}</span> gates
        </span>
        {simulation.result && (
          <span className="text-green-600">
            ✓ {simulation.result.type} complete
          </span>
        )}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <span className={wsConnected ? 'text-green-700' : 'text-slate-700'}>
          {wsConnected ? '● Connected' : '○ Disconnected'}
        </span>
        {webgpuSupported && <span className="text-purple-700">⚡ WebGPU</span>}
        <span>QCV v2.0</span>
      </div>
    </div>
  );
}
