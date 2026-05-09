'use client';
import React, {
  useRef, useMemo, useCallback, Suspense, useEffect, useState,
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Billboard, Stars, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useQuantumStore } from '@/store/quantumStore';
import {
  amplitudeVertexShader, amplitudeFragmentShader,
  entanglementShader,
} from '@/lib/glsl/shaders';
import type { AmplitudeEntry, StatevectorSimResult } from '@/types/quantum';
import { Maximize2, Layers3 } from 'lucide-react';

// ─── Color maps ───────────────────────────────────────────────────────────────
function phaseToColor(phase: number): THREE.Color {
  const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360;
  const color = new THREE.Color();
  color.setHSL(hue / 360, 0.8, 0.55);
  return color;
}

// ─── Amplitude bars in 3D ─────────────────────────────────────────────────────
function AmplitudeBars3D({ entries, maxProb }: { entries: AmplitudeEntry[]; maxProb: number }) {
  const barsRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const n = entries.length;
  const cols = Math.ceil(Math.sqrt(n));

  useEffect(() => {
    if (!barsRef.current) return;
    entries.forEach((entry, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const height = Math.max(0.01, entry.probability * 6);

      dummy.position.set(
        (col - cols / 2) * 1.2,
        height / 2,
        (row - cols / 2) * 1.2
      );
      dummy.scale.set(0.8, height, 0.8);
      dummy.updateMatrix();
      barsRef.current!.setMatrixAt(i, dummy.matrix);

      const color = phaseToColor(entry.phase);
      barsRef.current!.setColorAt(i, color);
    });
    barsRef.current.instanceMatrix.needsUpdate = true;
    if (barsRef.current.instanceColor) {
      barsRef.current.instanceColor.needsUpdate = true;
    }
  }, [entries, cols]);

  return (
    <instancedMesh ref={barsRef} args={[undefined, undefined, n]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial
        vertexColors
        transparent
        opacity={0.85}
        roughness={0.2}
        metalness={0.1}
        envMapIntensity={0.5}
      />
    </instancedMesh>
  );
}

// ─── Basis state labels ───────────────────────────────────────────────────────
function BasisLabels({ entries }: { entries: AmplitudeEntry[] }) {
  const n = entries.length;
  const cols = Math.ceil(Math.sqrt(n));
  const topN = entries
    .map((e, i) => ({ ...e, idx: i }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 8);

  return (
    <>
      {topN.map(entry => {
        const col = entry.idx % cols;
        const row = Math.floor(entry.idx / cols);
        const height = Math.max(0.01, entry.probability * 6);
        return (
          <Billboard key={entry.basis} position={[
            (col - cols / 2) * 1.2,
            height + 0.3,
            (row - cols / 2) * 1.2
          ]}>
            <Text
              fontSize={0.18}
              color="#a5b4fc"
              anchorX="center"
              anchorY="bottom"
              font="/fonts/JetBrainsMono.ttf"
            >
              {`|${entry.basis}⟩`}
            </Text>
            <Text
              position={[0, -0.22, 0]}
              fontSize={0.13}
              color="#64748b"
              anchorX="center"
              anchorY="bottom"
            >
              {(entry.probability * 100).toFixed(1)}%
            </Text>
          </Billboard>
        );
      })}
    </>
  );
}

// ─── Probability sphere (alternative layout) ──────────────────────────────────
function ProbabilitySpheres({ entries }: { entries: AmplitudeEntry[] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  const n = entries.length;
  const spheres = useMemo(() =>
    entries.map((entry, i) => {
      const phi = Math.acos(1 - (2 * i) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 3;
      return {
        entry,
        pos: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        ),
        color: phaseToColor(entry.phase),
        scale: Math.max(0.05, entry.probability * 2),
      };
    }), [entries, n]
  );

  return (
    <group ref={groupRef}>
      {spheres.map(({ entry, pos, color, scale }) => (
        <mesh key={entry.basis} position={pos.toArray()}>
          <sphereGeometry args={[scale, 12, 12]} />
          <meshPhysicalMaterial
            color={color}
            transparent
            opacity={0.7 + entry.probability * 0.3}
            roughness={0.1}
            metalness={0.3}
            emissive={color}
            emissiveIntensity={entry.probability * 0.5}
          />
        </mesh>
      ))}
      {/* Connecting lines to center for high-probability states */}
      {spheres.filter(s => s.entry.probability > 0.05).map(({ entry, pos }) => {
        const pts = new Float32Array([0, 0, 0, pos.x, pos.y, pos.z]);
        const lineColor = phaseToColor(entry.phase);
        return (
          <lineSegments key={`line-${entry.basis}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={pts}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={lineColor}
              transparent
              opacity={entry.probability * 0.4}
            />
          </lineSegments>
        );
      })}
    </group>
  );
}

// ─── Custom particle shader visualization ─────────────────────────────────────
function AmplitudeParticles({ entries }: { entries: AmplitudeEntry[] }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const n = entries.length;
  const cols = Math.ceil(Math.sqrt(n));

  const { positions, amplitudes, phases, probabilities, colors } = useMemo(() => {
    const pos = new Float32Array(n * 3);
    const amp = new Float32Array(n);
    const ph = new Float32Array(n);
    const prob = new Float32Array(n);
    const col = new Float32Array(n * 3);

    entries.forEach((entry, i) => {
      const row = Math.floor(i / cols);
      const col_i = i % cols;
      pos[i * 3]     = (col_i - cols / 2) * 1.2;
      pos[i * 3 + 1] = entry.probability * 4;
      pos[i * 3 + 2] = (row - cols / 2) * 1.2;
      amp[i] = entry.magnitude;
      ph[i] = entry.phase;
      prob[i] = entry.probability;
      const c = phaseToColor(entry.phase);
      col[i * 3]     = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    });

    return { positions: pos, amplitudes: amp, phases: ph, probabilities: prob, colors: col };
  }, [entries, cols, n]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"    count={n} array={positions}    itemSize={3} />
        <bufferAttribute attach="attributes-amplitude"   count={n} array={amplitudes}   itemSize={1} />
        <bufferAttribute attach="attributes-phase"       count={n} array={phases}        itemSize={1} />
        <bufferAttribute attach="attributes-probability" count={n} array={probabilities} itemSize={1} />
        <bufferAttribute attach="attributes-color"       count={n} array={colors}        itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={amplitudeVertexShader}
        fragmentShader={amplitudeFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uAnimSpeed: { value: 1.5 },
        }}
        transparent
        vertexColors
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function QuantumScene3D({
  entries,
  layout,
}: {
  entries: AmplitudeEntry[];
  layout: '3d-bars' | 'sphere' | 'particles';
}) {
  const maxProb = Math.max(...entries.map(e => e.probability), 0.01);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 8, 5]} intensity={1.2} color="#6366f1" />
      <pointLight position={[-5, 4, -5]} intensity={0.6} color="#d946ef" />
      <pointLight position={[0, -3, 0]} intensity={0.4} color="#06b6d4" />

      <Stars radius={30} depth={10} count={500} factor={2} saturation={0.5} fade />

      <Grid
        args={[20, 20]}
        cellSize={1.2}
        cellThickness={0.3}
        cellColor="#1e293b"
        sectionSize={4.8}
        sectionThickness={0.5}
        sectionColor="#6366f130"
        fadeDistance={20}
        position={[0, -0.02, 0]}
      />

      {layout === '3d-bars' && (
        <>
          <AmplitudeBars3D entries={entries} maxProb={maxProb} />
          <BasisLabels entries={entries} />
        </>
      )}

      {layout === 'sphere' && (
        <ProbabilitySpheres entries={entries} />
      )}

      {layout === 'particles' && (
        <AmplitudeParticles entries={entries} />
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        autoRotate={layout === 'sphere'}
        autoRotateSpeed={0.5}
        minDistance={3}
        maxDistance={20}
      />
    </>
  );
}

// ─── 3D Quantum State Viewer ──────────────────────────────────────────────────
type Layout3D = '3d-bars' | 'sphere' | 'particles';

export function QuantumState3DViewer() {
  const { simulation } = useQuantumStore();
  const [layout, setLayout] = useState<Layout3D>('3d-bars');
  const [fullscreen, setFullscreen] = useState(false);

  const result = simulation.result as StatevectorSimResult | null;
  const evStep = simulation.evolutionSteps[simulation.currentEvolutionStep];

  const entries: AmplitudeEntry[] = useMemo(() => {
    if (result?.type === 'statevector') {
      return result.statevector.amplitudes.filter(a => a.probability > 1e-6);
    }
    if (evStep?.statevector) {
      return evStep.statevector.amplitudes.filter(a => a.probability > 1e-6);
    }
    return [];
  }, [result, evStep]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <div className="w-12 h-12 rounded-xl bg-quantum-500/10 border border-quantum-500/20
                        flex items-center justify-center">
          <Layers3 size={22} className="text-quantum-400/50" />
        </div>
        <p className="text-sm text-slate-600 font-body">
          Run a Statevector simulation to see the 3D quantum state
        </p>
      </div>
    );
  }

  const viewer = (
    <div className={`relative ${fullscreen ? 'fixed inset-0 z-50 bg-void-900' : 'h-full'}`}>
      {/* Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        {(['3d-bars', 'sphere', 'particles'] as Layout3D[]).map(l => (
          <button
            key={l}
            onClick={() => setLayout(l)}
            className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
              layout === l
                ? 'bg-quantum-500/25 border-quantum-500/50 text-quantum-300'
                : 'bg-void-800/60 border-quantum-500/15 text-slate-500 hover:text-slate-300'
            }`}
          >
            {l === '3d-bars' ? 'Bars' : l === 'sphere' ? 'Sphere' : 'Particles'}
          </button>
        ))}
      </div>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <div className="glass-panel px-2 py-1 rounded text-[9px] font-mono text-slate-600">
          {entries.length} states
        </div>
        <button
          className="quantum-button p-1.5"
          onClick={() => setFullscreen(v => !v)}
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          <Maximize2 size={11} />
        </button>
        {fullscreen && (
          <button
            className="quantum-button px-2 py-1 text-xs"
            onClick={() => setFullscreen(false)}
          >
            Close
          </button>
        )}
      </div>

      {/* Canvas */}
      <Canvas
        camera={{ position: [6, 5, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <QuantumScene3D entries={entries} layout={layout} />
        </Suspense>
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 glass-panel rounded-lg px-3 py-2">
        <p className="text-[9px] text-slate-600 mb-1.5">Phase → Color</p>
        <div
          className="h-2 w-24 rounded-full"
          style={{
            background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e, #06b6d4, #6366f1, #d946ef, #ef4444)',
          }}
        />
        <div className="flex justify-between text-[8px] text-slate-700 mt-0.5">
          <span>0</span><span>π</span><span>2π</span>
        </div>
      </div>
    </div>
  );

  return viewer;
}
