'use client';
import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useQuantumStore } from '@/store/quantumStore';
import { blochSphereVertexShader, blochSphereFragmentShader } from '@/lib/glsl/shaders';
import type { BlochVector } from '@/types/quantum';

// ─── Bloch Sphere mesh ────────────────────────────────────────────────────────
function BlochSphereMesh({ bloch }: { bloch: BlochVector }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const arrowRef = useRef<THREE.Mesh>(null);

  const uniformsRef = useRef({
    uBlochVector: { value: new THREE.Vector3(bloch.x, bloch.z, bloch.y) },
    uAccentColor: { value: new THREE.Color(0x6366f1) },
    uTime: { value: 0 },
    uPurity: { value: bloch.purity },
  });

  useFrame(({ clock }) => {
    uniformsRef.current.uTime.value = clock.getElapsedTime();
  });

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: blochSphereVertexShader,
    fragmentShader: blochSphereFragmentShader,
    uniforms: uniformsRef.current,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  // State vector direction
  const stateVec = useMemo(() => new THREE.Vector3(bloch.x, bloch.z, bloch.y), [bloch.x, bloch.y, bloch.z]);

  // Axis labels
  const axes = [
    { pos: [0, 1.4, 0] as [number,number,number], label: '|0⟩', color: '#94a3b8' },
    { pos: [0, -1.4, 0] as [number,number,number], label: '|1⟩', color: '#64748b' },
    { pos: [1.4, 0, 0] as [number,number,number], label: '|+⟩', color: '#6366f1' },
    { pos: [-1.4, 0, 0] as [number,number,number], label: '|−⟩', color: '#6366f1' },
    { pos: [0, 0, 1.4] as [number,number,number], label: '|i⟩', color: '#d946ef' },
    { pos: [0, 0, -1.4] as [number,number,number], label: '|−i⟩', color: '#d946ef' },
  ];

  // Lines for xyz axes
  const xAxis = useMemo(() => [new THREE.Vector3(-1.3, 0, 0), new THREE.Vector3(1.3, 0, 0)], []);
  const yAxis = useMemo(() => [new THREE.Vector3(0, -1.3, 0), new THREE.Vector3(0, 1.3, 0)], []);
  const zAxis = useMemo(() => [new THREE.Vector3(0, 0, -1.3), new THREE.Vector3(0, 0, 1.3)], []);

  // Equatorial circle
  const equator = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    return pts;
  }, []);

  const meridianXY = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    return pts;
  }, []);

  const meridianYZ = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(0, Math.sin(a), Math.cos(a)));
    }
    return pts;
  }, []);

  // State vector arrow end point
  const arrowEnd = stateVec.clone().multiplyScalar(0.95);

  return (
    <group>
      {/* Sphere surface */}
      <mesh ref={meshRef} material={material}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>

      {/* Coordinate axes */}
      <Line points={xAxis} color="#334155" lineWidth={0.5} />
      <Line points={yAxis} color="#334155" lineWidth={0.5} />
      <Line points={zAxis} color="#334155" lineWidth={0.5} />

      {/* Great circles */}
      <Line points={equator}    color="rgba(99,102,241,0.2)"  lineWidth={0.5} />
      <Line points={meridianXY} color="rgba(99,102,241,0.15)" lineWidth={0.5} />
      <Line points={meridianYZ} color="rgba(99,102,241,0.15)" lineWidth={0.5} />

      {/* Axis labels */}
      {axes.map(({ pos, label, color }) => (
        <Text
          key={label}
          position={pos}
          fontSize={0.12}
          color={color}
          anchorX="center"
          anchorY="middle"
          font="/fonts/JetBrainsMono.ttf"
        >
          {label}
        </Text>
      ))}

      {/* State vector arrow */}
      <Line
        points={[new THREE.Vector3(0, 0, 0), arrowEnd]}
        color="#6366f1"
        lineWidth={2.5}
      />
      {/* Arrow head */}
      <mesh position={arrowEnd.toArray()}>
        <coneGeometry args={[0.04, 0.12, 12]} />
        <meshBasicMaterial color="#818cf8" />
      </mesh>

      {/* State point glow */}
      <mesh position={[bloch.x, bloch.z, bloch.y]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#a5b4fc" />
      </mesh>
    </group>
  );
}

// ─── Single Bloch Sphere Card ─────────────────────────────────────────────────
function BlochCard({ bloch }: { bloch: BlochVector }) {
  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-quantum-500/10 flex items-center justify-between">
        <span className="font-mono text-xs text-quantum-300">q[{bloch.qubit}]</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
          bloch.purity > 0.99 ? 'bg-green-500/15 text-green-400' :
          bloch.purity > 0.5  ? 'bg-yellow-500/15 text-yellow-400' :
                                 'bg-red-500/15 text-red-400'
        }`}>
          {bloch.purity > 0.99 ? 'Pure' : bloch.purity > 0.5 ? 'Partial' : 'Mixed'}
        </span>
      </div>

      {/* 3D canvas */}
      <div className="h-44 relative">
        <Canvas
          camera={{ position: [2.2, 1.5, 2.2], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.4} />
          <pointLight position={[3, 3, 3]} intensity={0.8} />
          <Suspense fallback={null}>
            <BlochSphereMesh bloch={bloch} />
          </Suspense>
          <OrbitControls
            enablePan={false}
            minDistance={2}
            maxDistance={5}
            dampingFactor={0.05}
            enableDamping
          />
        </Canvas>
      </div>

      {/* Bloch vector components */}
      <div className="px-3 py-2 grid grid-cols-3 gap-2">
        {[
          { label: 'X', value: bloch.x, color: '#ef4444' },
          { label: 'Y', value: bloch.y, color: '#22c55e' },
          { label: 'Z', value: bloch.z, color: '#3b82f6' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <div className="font-mono text-xs font-bold" style={{ color }}>
              ⟨{label}⟩
            </div>
            <div className="font-mono text-[10px] text-slate-400">
              {value.toFixed(4)}
            </div>
            <div className="amplitude-bar h-1 mt-1">
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${((value + 1) / 2) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Purity bar */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="stat-label text-[9px]">Purity Tr(ρ²)</span>
          <span className="font-mono text-[9px] text-quantum-300">{bloch.purity.toFixed(4)}</span>
        </div>
        <div className="amplitude-bar h-1">
          <motion.div
            className="h-full rounded-full bg-quantum-500"
            initial={{ width: 0 }}
            animate={{ width: `${bloch.purity * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Bloch Sphere View ────────────────────────────────────────────────────────
export function BlochSphereView() {
  const { simulation } = useQuantumStore();

  const blochVectors: BlochVector[] = useMemo(() => {
    if (simulation.result && 'bloch_vectors' in simulation.result) {
      return (simulation.result as { bloch_vectors: BlochVector[] }).bloch_vectors ?? [];
    }
    // Show evolution step bloch vectors
    const steps = simulation.evolutionSteps;
    if (steps.length > 0) {
      const step = steps[simulation.currentEvolutionStep];
      return step?.bloch_vectors ?? [];
    }
    return [];
  }, [simulation.result, simulation.evolutionSteps, simulation.currentEvolutionStep]);

  if (blochVectors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <div className="w-12 h-12 rounded-xl bg-quantum-500/10 border border-quantum-500/20
                        flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#6366f1" strokeWidth="1.5" opacity={0.4} />
            <line x1="12" y1="3" x2="12" y2="21" stroke="#6366f1" strokeWidth="1" opacity={0.3} />
            <line x1="3" y1="12" x2="21" y2="12" stroke="#6366f1" strokeWidth="1" opacity={0.3} />
          </svg>
        </div>
        <p className="text-sm text-slate-600 text-center font-body">
          Run a Statevector or Evolution simulation to view Bloch spheres
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-semibold text-slate-300">Bloch Spheres</h3>
        <span className="text-[10px] text-slate-600 font-mono">{blochVectors.length} qubit{blochVectors.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex flex-col gap-3">
        {blochVectors.map(bloch => (
          <BlochCard key={bloch.qubit} bloch={bloch} />
        ))}
      </div>
    </div>
  );
}
