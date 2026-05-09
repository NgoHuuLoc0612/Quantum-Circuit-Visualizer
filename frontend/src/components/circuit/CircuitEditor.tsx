'use client';
import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  Node, Edge, Connection, ReactFlowProvider,
  useReactFlow, Panel, MarkerType,
  BackgroundVariant, NodeTypes, EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuantumStore } from '@/store/quantumStore';
import { GATE_CATALOG, computeCircuitColumns, getGateDef } from '@/lib/gates';
import { GateNode } from './GateNode';
import { QubitLineNode } from './QubitLineNode';
import { MeasureNode } from './MeasureNode';
import { BarrierNode } from './BarrierNode';
import { CircuitToolbar } from './CircuitToolbar';
import type { GateOperation } from '@/types/quantum';
import { nanoid } from '@/lib/nanoid';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────
const QUBIT_HEIGHT = 60;
const GATE_WIDTH = 56;
const GATE_PADDING = 8;
const LEFT_MARGIN = 80;
const TOP_MARGIN = 30;
const COLUMN_WIDTH = GATE_WIDTH + GATE_PADDING * 2;

// ─── Custom Node Types ────────────────────────────────────────────────────────
const nodeTypes: NodeTypes = {
  gateNode:    GateNode,
  qubitLine:   QubitLineNode,
  measureNode: MeasureNode,
  barrierNode: BarrierNode,
};

// ─── Circuit to React Flow conversion ────────────────────────────────────────
function circuitToFlow(
  gates: GateOperation[],
  numQubits: number,
  numColumns: number,
  selectedId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const totalWidth = LEFT_MARGIN + (numColumns + 2) * COLUMN_WIDTH + 40;
  const cappedWidth = Math.max(totalWidth, 600);

  // Qubit lines
  for (let q = 0; q < numQubits; q++) {
    nodes.push({
      id: `qubit-${q}`,
      type: 'qubitLine',
      position: { x: 0, y: TOP_MARGIN + q * QUBIT_HEIGHT },
      data: { qubitIndex: q, totalWidth: cappedWidth, numQubits },
      draggable: false,
      selectable: false,
      style: { width: cappedWidth, height: QUBIT_HEIGHT },
    });
  }

  // Compute columns
  const gateColumns = computeCircuitColumns(
    gates.map(g => ({ id: g.id, type: g.type, qubits: g.qubits })),
    numQubits
  );

  // Gate nodes
  for (const gate of gates) {
    const col = gateColumns.get(gate.id) ?? 0;
    const x = LEFT_MARGIN + col * COLUMN_WIDTH;
    const primaryQubit = gate.qubits[0] ?? 0;
    const y = TOP_MARGIN + primaryQubit * QUBIT_HEIGHT;
    const def = getGateDef(gate.type);

    const isSelected = gate.id === selectedId;

    if (gate.type === 'BARRIER') {
      nodes.push({
        id: gate.id,
        type: 'barrierNode',
        position: { x: x + GATE_PADDING, y: TOP_MARGIN },
        data: { gate, numQubits, isSelected },
        draggable: false,
        selectable: true,
        style: { height: numQubits * QUBIT_HEIGHT },
      });
    } else if (gate.type === 'MEASURE') {
      nodes.push({
        id: gate.id,
        type: 'measureNode',
        position: { x: x + GATE_PADDING, y: y + 6 },
        data: { gate, gateDef: def, isSelected },
        selectable: true,
        draggable: false,
      });
    } else {
      // Multi-qubit: draw connector edges
      if (gate.qubits.length > 1) {
        for (let i = 0; i < gate.qubits.length - 1; i++) {
          edges.push({
            id: `${gate.id}-conn-${i}`,
            source: gate.id,
            target: gate.id,
            sourceHandle: `q${gate.qubits[i]}-out`,
            targetHandle: `q${gate.qubits[i + 1]}-in`,
            type: 'straight',
            style: { stroke: def?.color ?? '#6366f1', strokeWidth: 1.5 },
          });
        }
      }

      nodes.push({
        id: gate.id,
        type: 'gateNode',
        position: { x: x + GATE_PADDING, y: y + 6 },
        data: {
          gate,
          gateDef: def,
          qubitIndex: primaryQubit,
          isSelected,
          spanQubits: gate.qubits,
          qubitHeight: QUBIT_HEIGHT,
        },
        selectable: true,
        draggable: false,
      });
    }
  }

  return { nodes, edges };
}

// ─── Inner Circuit Component ──────────────────────────────────────────────────
function CircuitEditorInner({ onRunSimulation }: { onRunSimulation: () => void }) {
  const {
    circuit, selectedGateId, addGate, removeGate, selectGate,
    setNumQubits, pushHistory, simulation,
  } = useQuantumStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [dragOver, setDragOver] = useState(false);

  const numColumns = useMemo(() => {
    const cols = computeCircuitColumns(
      circuit.gates.map(g => ({ id: g.id, type: g.type, qubits: g.qubits })),
      circuit.num_qubits
    );
    return Math.max(...Array.from(cols.values()), 0) + 1;
  }, [circuit.gates, circuit.num_qubits]);

  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () => circuitToFlow(circuit.gates, circuit.num_qubits, numColumns, selectedGateId),
    [circuit.gates, circuit.num_qubits, numColumns, selectedGateId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  const { fitView } = useReactFlow();

  // Sync nodes when circuit changes
  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
    // Re-fit view when circuit structure changes (qubit count or gate count)
    setTimeout(() => fitView({ padding: 0.2, maxZoom: 1.2, duration: 200 }), 50);
  }, [flowNodes, flowEdges]);

  // Drop handler - add gate from palette drag
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const gateType = event.dataTransfer.getData('gate-type');
    if (!gateType) return;

    const def = getGateDef(gateType);
    if (!def) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Determine qubit from Y position
    const qubitIndex = Math.max(
      0,
      Math.min(
        circuit.num_qubits - 1,
        Math.round((position.y - TOP_MARGIN) / QUBIT_HEIGHT)
      )
    );

    // For multi-qubit gates, use consecutive qubits
    const qubits = Array.from(
      { length: Math.min(def.qubits, circuit.num_qubits - qubitIndex) },
      (_, i) => qubitIndex + i
    );

    const defaultParams = new Array(def.params).fill(Math.PI / 2);

    addGate({
      type: gateType,
      qubits,
      params: defaultParams,
      clbits: gateType === 'MEASURE' ? [qubitIndex] : [],
    });

    pushHistory(`Add ${def.name} gate`);
    toast.success(`Added ${def.name}`, { duration: 1500 });
  }, [screenToFlowPosition, circuit.num_qubits, addGate, pushHistory]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id.startsWith('qubit-')) return;
    selectGate(node.id === selectedGateId ? null : node.id);
  }, [selectGate, selectedGateId]);

  const onPaneClick = useCallback(() => {
    selectGate(null);
  }, [selectGate]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedGateId) {
      removeGate(selectedGateId);
      pushHistory('Delete gate');
    }
  }, [selectedGateId, removeGate, pushHistory]);

  const isEmpty = circuit.gates.length === 0;

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onKeyDown={onKeyDown}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {/* Drag-over highlight overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-quantum-500/5 border-2 border-dashed border-quantum-500/40 
                       rounded-lg z-10 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Circuit toolbar */}
      <div className="absolute top-3 left-3 z-20">
        <CircuitToolbar onRunSimulation={onRunSimulation} />
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 20, y: 20, zoom: 0.9 }}
        minZoom={0.3}
        maxZoom={3}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        className="circuit-grid"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(99,102,241,0.12)"
        />
        <Controls
          showInteractive={false}
          className="!bottom-4 !left-4"
        />
        <MiniMap
          nodeColor={(node) => {
            const gate = circuit.gates.find(g => g.id === node.id);
            if (!gate) return '#1e293b';
            return getGateDef(gate.type)?.color ?? '#6366f1';
          }}
          maskColor="rgba(5,6,15,0.8)"
          className="!bottom-4 !right-4 !border !border-quantum-500/20 !rounded-lg !bg-void-800/80"
          style={{ width: 140, height: 90 }}
        />

        {/* Empty state prompt */}
        {isEmpty && (
          <Panel position="top-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center pointer-events-none"
            >
              <p className="font-body text-slate-500 text-sm">
                Drag gates from the palette to build your circuit
              </p>
              <p className="font-mono text-slate-600 text-xs mt-1">
                or press <kbd className="px-1 py-0.5 rounded bg-void-700 border border-quantum-500/20 text-quantum-400 text-xs">⌘K</kbd> to open command palette
              </p>
            </motion.div>
          </Panel>
        )}
      </ReactFlow>

      {/* Simulation running overlay */}
      <AnimatePresence>
        {simulation.isRunning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-void-900/30 backdrop-blur-sm z-30 pointer-events-none
                       flex items-center justify-center"
          >
            <div className="glass-panel px-6 py-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-quantum-400 animate-pulse" />
              <span className="font-mono text-sm text-quantum-300">
                {simulation.stage} {simulation.progress > 0 ? `${simulation.progress}%` : ''}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Export with provider ─────────────────────────────────────────────────────
export function CircuitEditor({ onRunSimulation }: { onRunSimulation: () => void }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', minHeight: 0 }}>
      <ReactFlowProvider>
        <CircuitEditorInner onRunSimulation={onRunSimulation} />
      </ReactFlowProvider>
    </div>
  );
}
