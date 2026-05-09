'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { GATE_CATALOG, GATE_CATEGORIES, getGatesByCategory } from '@/lib/gates';
import type { GateDef, GateCategory } from '@/types/quantum';

// ─── Draggable Gate Chip ──────────────────────────────────────────────────────
function DraggableGate({ def }: { def: GateDef }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const onDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('gate-type', def.id);
    e.dataTransfer.effectAllowed = 'copy';
    // Custom drag image
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; top:-100px; left:-100px;
      width:48px; height:48px; border-radius:8px;
      background:${def.color}22; border:1.5px solid ${def.color}88;
      display:flex; align-items:center; justify-content:center;
      font-family:monospace; font-size:11px; font-weight:700;
      color:${def.color}; pointer-events:none;
    `;
    el.textContent = def.name;
    document.body.appendChild(el);
    e.dataTransfer.setDragImage(el, 24, 24);
    setTimeout(() => document.body.removeChild(el), 0);
  }, [def]);

  return (
    <div className="relative" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      <motion.div
        draggable
        onDragStart={onDragStart}
        whileHover={{ scale: 1.08, y: -1 }}
        whileTap={{ scale: 0.95 }}
        className="gate-chip w-full flex items-center gap-2 px-2.5 py-2 rounded-lg"
        style={{
          background: `${def.color}12`,
          border: `1px solid ${def.color}35`,
        }}
      >
        {/* Color dot */}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: def.color }} />

        {/* Symbol */}
        <span
          className="font-mono font-bold text-xs flex-shrink-0"
          style={{ color: def.color, minWidth: 28 }}
        >
          {def.name}
        </span>

        {/* Param indicator */}
        {def.params > 0 && (
          <span className="font-mono text-[9px] text-slate-600 ml-auto">
            {def.params}θ
          </span>
        )}

        {/* Qubit count badge */}
        {def.qubits > 1 && (
          <span
            className="text-[8px] font-mono px-1 rounded"
            style={{ background: `${def.color}25`, color: def.color }}
          >
            {def.qubits}Q
          </span>
        )}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && def.description && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-0 ml-2 z-50 w-52 glass-panel p-3 rounded-lg pointer-events-none"
            style={{ border: `1px solid ${def.color}30` }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: def.color }} />
              <span className="font-mono text-xs font-bold" style={{ color: def.color }}>
                {def.name}
              </span>
              {def.qubits > 0 && (
                <span className="text-[9px] text-slate-600 ml-auto">
                  {def.qubits === -1 ? 'all' : def.qubits} qubit{def.qubits !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{def.description}</p>
            {def.params > 0 && (
              <p className="text-[10px] text-slate-600 mt-1.5">
                Parameters: {def.paramNames?.join(', ') ?? `θ₁…θ${def.params}`}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────
function CategorySection({
  category,
  label,
  gates,
  defaultOpen = true,
}: {
  category: GateCategory;
  label: string;
  gates: GateDef[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-quantum-500/5 
                   transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-slate-600">
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
        <span className="font-body text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          {label}
        </span>
        <span className="ml-auto font-mono text-[9px] text-slate-700">{gates.length}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 flex flex-col gap-1">
              {gates.map(def => (
                <DraggableGate key={def.id} def={def} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Gate Panel ───────────────────────────────────────────────────────────────
export function GatePanel() {
  const [search, setSearch] = useState('');

  const filteredGates = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return Object.values(GATE_CATALOG).filter(
      g =>
        g.id.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="h-full flex flex-col bg-void-800/50">
      {/* Header */}
      <div className="panel-header">
        <div className="w-2 h-2 rounded-full bg-quantum-500" />
        Gate Palette
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-quantum-500/10">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search gates…"
            className="w-full bg-void-700/50 border border-quantum-500/15 rounded-lg
                       pl-7 pr-3 py-1.5 font-mono text-xs text-slate-300
                       placeholder:text-slate-600 focus:outline-none
                       focus:border-quantum-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Gates list */}
      <div className="flex-1 overflow-y-auto py-1">
        {filteredGates ? (
          /* Search results */
          <div className="px-2 py-1">
            <p className="font-body text-[10px] text-slate-600 mb-2 px-1">
              {filteredGates.length} result{filteredGates.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-col gap-1">
              {filteredGates.map(def => (
                <DraggableGate key={def.id} def={def} />
              ))}
            </div>
            {filteredGates.length === 0 && (
              <p className="text-xs text-slate-600 text-center py-4">No gates found</p>
            )}
          </div>
        ) : (
          /* Categorized */
          <div className="flex flex-col">
            {GATE_CATEGORIES.map((cat, i) => {
              const gates = getGatesByCategory(cat.id);
              if (gates.length === 0) return null;
              return (
                <CategorySection
                  key={cat.id}
                  category={cat.id}
                  label={cat.label}
                  gates={gates}
                  defaultOpen={i < 2}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-quantum-500/10">
        <p className="font-body text-[9px] text-slate-700 text-center leading-relaxed">
          Drag gates onto the canvas<br />Right-click a gate to remove it
        </p>
      </div>
    </div>
  );
}
