'use client';
import dynamic from 'next/dynamic';

// Load heavy components dynamically (Three.js, Monaco, etc.)
const QuantumWorkspace = dynamic(
  () => import('@/components/QuantumWorkspace'),
  {
    ssr: false,
    loading: () => <QuantumLoadingScreen />,
  }
);

function QuantumLoadingScreen() {
  return (
    <div className="h-screen w-screen bg-void-900 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 circuit-grid opacity-40" />
      <div className="absolute inset-0 dot-grid opacity-20" />

      {/* Central logo */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-quantum-500/10 border border-quantum-500/30 
                          flex items-center justify-center quantum-glow">
            <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
              <circle cx="24" cy="24" r="10" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" className="animate-spin-slow" />
              <circle cx="24" cy="24" r="18" stroke="#4f5ef9" strokeWidth="0.8" strokeDasharray="2 4" className="animate-spin-slow" style={{animationDirection:'reverse'}} />
              <circle cx="24" cy="24" r="3" fill="#818cf8" />
              <circle cx="24" cy="6" r="2" fill="#6366f1" />
              <circle cx="24" cy="42" r="2" fill="#6366f1" />
              <circle cx="6" cy="24" r="2" fill="#6366f1" />
              <circle cx="42" cy="24" r="2" fill="#6366f1" />
            </svg>
          </div>
          <div className="absolute -inset-4 bg-quantum-500/5 rounded-3xl blur-xl animate-pulse-slow" />
        </div>

        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-slate-100 tracking-tight mb-1">
            Quantum Circuit Visualizer
          </h1>
          <p className="font-body text-sm text-slate-500">Initializing simulation engine…</p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-quantum-500/60 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return <QuantumWorkspace />;
}
