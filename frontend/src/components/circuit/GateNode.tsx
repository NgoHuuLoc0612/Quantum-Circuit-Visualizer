'use client';
import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { useQuantumStore } from '@/store/quantumStore';
import type { GateDef, GateOperation } from '@/types/quantum';

interface GateNodeData {
  gate: GateOperation;
  gateDef?: GateDef;
  qubitIndex: number;
  spanQubits: number[];
  isSelected: boolean;
  qubitHeight: number;
}

export const GateNode = memo(({ data, id }: NodeProps<GateNodeData>) => {
  const { gate, gateDef, spanQubits, isSelected, qubitHeight } = data;
  const { removeGate, pushHistory } = useQuantumStore();

  const isMultiQubit = spanQubits.length > 1;
  const height = isMultiQubit ? (spanQubits.length - 1) * qubitHeight + 48 : 48;
  const color = gateDef?.color ?? '#6366f1';

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    removeGate(id);
    pushHistory(`Remove ${gateDef?.name ?? gate.type}`);
  }, [id, removeGate, pushHistory, gateDef, gate.type]);

  // Format params for display
  const paramLabel = gate.params.length > 0
    ? gate.params.map(p => {
        if (typeof p === 'number') {
          const pi = Math.PI;
          if (Math.abs(p - pi) < 0.001) return 'π';
          if (Math.abs(p - pi / 2) < 0.001) return 'π/2';
          if (Math.abs(p - pi / 4) < 0.001) return 'π/4';
          return p.toFixed(2);
        }
        return String(p);
      }).join(',')
    : null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.12, type: 'spring', stiffness: 400 }}
      className="relative flex flex-col items-center"
      style={{ width: 48, height }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Connection handles for each qubit */}
      {spanQubits.map((q, i) => (
        <React.Fragment key={q}>
          <Handle
            id={`q${q}-in`}
            type="target"
            position={Position.Left}
            style={{
              top: isMultiQubit ? i * qubitHeight + 24 : '50%',
              background: 'transparent',
              border: 'none',
              width: 0,
              height: 0,
            }}
          />
          <Handle
            id={`q${q}-out`}
            type="source"
            position={Position.Right}
            style={{
              top: isMultiQubit ? i * qubitHeight + 24 : '50%',
              background: 'transparent',
              border: 'none',
              width: 0,
              height: 0,
            }}
          />
        </React.Fragment>
      ))}

      {/* Multi-qubit vertical connector line */}
      {isMultiQubit && (
        <div
          className="absolute left-1/2 -translate-x-px z-0"
          style={{
            top: 24,
            bottom: 24,
            width: 1.5,
            background: `linear-gradient(to bottom, ${color}99, ${color})`,
          }}
        />
      )}

      {/* Gate box for primary qubit */}
      <div
        className="relative z-10 w-12 h-12 flex flex-col items-center justify-center 
                   rounded-lg cursor-pointer select-none transition-all duration-100"
        style={{
          background: `${color}18`,
          border: `1.5px solid ${isSelected ? color : color + '60'}`,
          boxShadow: isSelected
            ? `0 0 0 2px ${color}80, 0 0 16px ${color}30`
            : `0 2px 8px ${color}20`,
        }}
      >
        {/* Gate symbol */}
        <span
          className="font-mono font-bold text-xs leading-tight text-center"
          style={{ color, fontSize: gateDef?.name && gateDef.name.length > 3 ? '9px' : '11px' }}
        >
          {gateDef?.name ?? gate.type}
        </span>

        {/* Param label */}
        {paramLabel && (
          <span className="text-[7px] font-mono opacity-70 leading-none mt-0.5" style={{ color }}>
            {paramLabel}
          </span>
        )}

        {/* Phase indicator dot */}
        <div
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
          style={{ background: color, opacity: 0.8 }}
        />
      </div>

      {/* Control dots for multi-qubit gates */}
      {isMultiQubit && spanQubits.slice(1).map((_, i) => (
        <div
          key={i}
          className="absolute z-10 w-12 flex items-center justify-center"
          style={{ top: (i + 1) * qubitHeight, height: 48 }}
        >
          {gate.type === 'CX' || gate.type === 'CCX' ? (
            // Target: circle with plus
            <div
              className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: color, background: `${color}15` }}
            >
              <div className="w-5 h-px" style={{ background: color }} />
              <div className="absolute w-px h-5" style={{ background: color }} />
            </div>
          ) : gate.type === 'SWAP' || gate.type === 'CSWAP' ? (
            // SWAP: X symbol
            <div className="relative w-5 h-5" style={{ color }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-lg font-bold" style={{ color }}>×</span>
              </div>
            </div>
          ) : (
            // Generic control: filled dot
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
            />
          )}
        </div>
      ))}
    </motion.div>
  );
});

GateNode.displayName = 'GateNode';
