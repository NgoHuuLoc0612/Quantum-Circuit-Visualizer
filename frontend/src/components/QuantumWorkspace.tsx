'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuantumStore } from '@/store/quantumStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { TopBar } from '@/components/ui/TopBar';
import { GatePanel } from '@/components/panels/GatePanel';
import { CircuitEditor } from '@/components/circuit/CircuitEditor';
import { SimulationPanel } from '@/components/panels/SimulationPanel';
import { PropertyPanel } from '@/components/panels/PropertyPanel';
import { StatusBar } from '@/components/ui/StatusBar';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { TemplateGallery } from '@/components/ui/TemplateGallery';
import { KeyboardShortcuts } from '@/components/ui/KeyboardShortcuts';
import { checkWebGPUSupport } from '@/lib/webgpu/compute';
import { toast } from 'sonner';

export default function QuantumWorkspace() {
  const { showLeftPanel, showRightPanel, wsConnected, circuit, undo, redo, canUndo, canRedo } = useQuantumStore();
  const ws = useWebSocket();

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(380);
  const resizingRef = useRef<'left' | 'right' | null>(null);

  // Check WebGPU support
  useEffect(() => {
    checkWebGPUSupport().then(caps => {
      setWebgpuSupported(caps.supported);
      if (caps.supported) {
        toast.success('WebGPU acceleration enabled', { duration: 3000 });
      }
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(v => !v); }
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (canUndo) undo(); }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); if (canRedo) redo(); }
      if (ctrl && e.key === 'Enter') {
        e.preventDefault();
        runSimulation();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUndo, canRedo, undo, redo]);

  // Panel resize handlers
  const startResize = useCallback((side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = side;
    const startX = e.clientX;
    const startLeft = leftWidth;
    const startRight = rightWidth;

    const onMove = (ev: MouseEvent) => {
      if (resizingRef.current === 'left') {
        setLeftWidth(Math.max(180, Math.min(400, startLeft + ev.clientX - startX)));
      } else {
        setRightWidth(Math.max(280, Math.min(600, startRight - (ev.clientX - startX))));
      }
    };
    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [leftWidth, rightWidth]);

  const runSimulation = useCallback(() => {
    const { simulation } = useQuantumStore.getState();
    ws.simulate({
      circuit,
      mode: simulation.mode,
      shots: simulation.shots,
      noise_model: simulation.noiseEnabled ? simulation.noiseConfig : null,
    });
  }, [circuit, ws]);

  return (
    <div className="h-screen w-screen flex flex-col bg-void-900 overflow-hidden select-none">
      {/* Top navigation bar */}
      <TopBar
        onCommandPalette={() => setCommandPaletteOpen(true)}
        onTemplates={() => setTemplateGalleryOpen(true)}
        onRunSimulation={runSimulation}
        webgpuSupported={webgpuSupported}
      />

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left panel - Gate palette */}
        <AnimatePresence>
          {showLeftPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: leftWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-shrink-0 overflow-hidden border-r border-quantum-500/10"
              style={{ width: leftWidth }}
            >
              <GatePanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left resize handle */}
        {showLeftPanel && (
          <div
            className="resize-handle flex-shrink-0 z-10 hover:bg-quantum-500/20 transition-colors cursor-col-resize"
            onMouseDown={startResize('left')}
          />
        )}

        {/* Circuit editor - center stage */}
        <div className="flex-1 overflow-hidden relative min-h-0" style={{ minHeight: 0 }}>
          <CircuitEditor onRunSimulation={runSimulation} />
        </div>

        {/* Right resize handle */}
        {showRightPanel && (
          <div
            className="resize-handle flex-shrink-0 z-10 hover:bg-quantum-500/20 transition-colors cursor-col-resize"
            onMouseDown={startResize('right')}
          />
        )}

        {/* Right panel - Simulation & Analysis */}
        <AnimatePresence>
          {showRightPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: rightWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-shrink-0 overflow-hidden border-l border-quantum-500/10 flex flex-col"
              style={{ width: rightWidth }}
            >
              <SimulationPanel onRunSimulation={runSimulation} ws={ws} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Property panel (selected gate) */}
      <PropertyPanel />

      {/* Status bar */}
      <StatusBar webgpuSupported={webgpuSupported} />

      {/* Overlays */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <CommandPalette
            onClose={() => setCommandPaletteOpen(false)}
            onRunSimulation={runSimulation}
            onTemplates={() => { setCommandPaletteOpen(false); setTemplateGalleryOpen(true); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {templateGalleryOpen && (
          <TemplateGallery onClose={() => setTemplateGalleryOpen(false)} />
        )}
      </AnimatePresence>

      <KeyboardShortcuts />
    </div>
  );
}
