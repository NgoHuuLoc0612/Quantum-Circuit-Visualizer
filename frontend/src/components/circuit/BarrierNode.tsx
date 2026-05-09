'use client';
import React, { memo } from 'react';
import { NodeProps } from 'reactflow';

export const BarrierNode = memo(({ data }: NodeProps) => {
  const { numQubits, isSelected } = data;
  return (
    <div
      className="flex items-center justify-center cursor-pointer"
      style={{ width: 8, height: numQubits * 60 }}
    >
      <div
        className="w-0.5 h-full rounded-full"
        style={{
          background: isSelected
            ? 'rgba(99,102,241,0.7)'
            : 'repeating-linear-gradient(to bottom, rgba(99,102,241,0.4) 0px, rgba(99,102,241,0.4) 4px, transparent 4px, transparent 8px)',
        }}
      />
    </div>
  );
});
BarrierNode.displayName = 'BarrierNode';
