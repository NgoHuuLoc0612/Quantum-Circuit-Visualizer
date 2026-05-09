'use client';
import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { motion } from 'framer-motion';

export const MeasureNode = memo(({ data, id }: NodeProps) => {
  const { isSelected } = data;
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-12 h-12 flex items-center justify-center rounded-lg cursor-pointer"
      style={{
        background: 'rgba(148,163,184,0.08)',
        border: `1.5px solid ${isSelected ? '#94a3b8' : 'rgba(148,163,184,0.35)'}`,
        boxShadow: isSelected ? '0 0 0 2px rgba(148,163,184,0.5)' : undefined,
      }}
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <path d="M4 20 Q12 4 20 20" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
        <line x1="12" y1="20" x2="18" y2="10" stroke="#94a3b8" strokeWidth="1.5"
              markerEnd="url(#arrowhead-m)" />
        <defs>
          <marker id="arrowhead-m" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <polygon points="0 0, 4 2, 0 4" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>
    </motion.div>
  );
});
MeasureNode.displayName = 'MeasureNode';
