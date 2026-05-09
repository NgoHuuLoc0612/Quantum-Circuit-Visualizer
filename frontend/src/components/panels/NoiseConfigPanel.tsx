'use client';
import React, { useEffect, useState } from 'react';
import { useQuantumStore } from '@/store/quantumStore';
import { noiseApi } from '@/lib/api';
import * as Slider from '@radix-ui/react-slider';
import type { NoisePreset } from '@/types/quantum';

function LogSlider({
  label, value, min, max, onChange, unit = '',
}: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; unit?: string;
}) {
  const logMin = Math.log10(min), logMax = Math.log10(max);
  const sliderVal = ((Math.log10(Math.max(value, min)) - logMin) / (logMax - logMin)) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span className="font-mono text-[10px] text-quantum-300">
          {value < 0.001 ? value.toExponential(1) : value.toFixed(4)}{unit}
        </span>
      </div>
      <Slider.Root
        min={0} max={100} step={0.5}
        value={[sliderVal]}
        onValueChange={([v]) => {
          const logVal = logMin + (v / 100) * (logMax - logMin);
          onChange(Math.pow(10, logVal));
        }}
        className="relative flex items-center h-4 w-full"
      >
        <Slider.Track className="relative h-1 flex-1 rounded-full bg-void-600">
          <Slider.Range className="absolute h-full rounded-full bg-quantum-500/70" />
        </Slider.Track>
        <Slider.Thumb className="block w-3 h-3 rounded-full bg-quantum-400 focus:outline-none cursor-pointer" />
      </Slider.Root>
    </div>
  );
}

export function NoiseConfigPanel() {
  const { simulation, setNoiseConfig } = useQuantumStore();
  const { noiseConfig } = simulation;
  const [presets, setPresets] = useState<NoisePreset[]>([]);

  useEffect(() => {
    noiseApi.getPresets().then(r => setPresets(r.presets)).catch(() => {});
  }, []);

  return (
    <div className="glass-panel rounded-lg p-3 space-y-3">
      {/* Presets */}
      <div>
        <p className="stat-label text-[9px] mb-1.5">Quick Presets</p>
        <div className="flex flex-wrap gap-1">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => setNoiseConfig(p.config as never)}
              className="px-2 py-0.5 text-[9px] font-mono rounded border border-quantum-500/20 
                         text-slate-500 hover:text-quantum-300 hover:border-quantum-500/40 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <LogSlider
        label="1Q Gate Error"
        value={noiseConfig.single_qubit_error}
        min={1e-6} max={0.1}
        onChange={v => setNoiseConfig({ single_qubit_error: v })}
      />
      <LogSlider
        label="2Q Gate Error"
        value={noiseConfig.two_qubit_error}
        min={1e-5} max={0.2}
        onChange={v => setNoiseConfig({ two_qubit_error: v })}
      />
      <LogSlider
        label="T1 (s)"
        value={noiseConfig.t1}
        min={1e-6} max={1e-2}
        onChange={v => setNoiseConfig({ t1: v })}
        unit="s"
      />
      <LogSlider
        label="T2 (s)"
        value={noiseConfig.t2}
        min={1e-6} max={2e-2}
        onChange={v => setNoiseConfig({ t2: v })}
        unit="s"
      />
      <LogSlider
        label="Readout Error"
        value={noiseConfig.readout_error}
        min={1e-4} max={0.15}
        onChange={v => setNoiseConfig({ readout_error: v })}
      />
    </div>
  );
}
