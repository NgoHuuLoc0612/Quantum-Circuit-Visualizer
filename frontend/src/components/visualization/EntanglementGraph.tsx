'use client';
import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { useQuantumStore } from '@/store/quantumStore';
import type { StatevectorSimResult } from '@/types/quantum';

interface Node {
  id: string;
  qubit: number;
  entropy: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  strength: number;
}

// Build qubit-qubit entanglement graph from circuit structure
function buildEntanglementGraph(
  gates: Array<{ type: string; qubits: number[] }>,
  numQubits: number,
  entropyMap: Record<string, number>
): { nodes: Node[]; links: Link[] } {
  const nodes: Node[] = Array.from({ length: numQubits }, (_, i) => ({
    id: `q${i}`,
    qubit: i,
    entropy: entropyMap[String(i)] ?? 0,
  }));

  const linkMap = new Map<string, number>();

  for (const gate of gates) {
    if (gate.qubits.length < 2) continue;
    for (let a = 0; a < gate.qubits.length; a++) {
      for (let b = a + 1; b < gate.qubits.length; b++) {
        const key = `${Math.min(gate.qubits[a], gate.qubits[b])}-${Math.max(gate.qubits[a], gate.qubits[b])}`;
        linkMap.set(key, (linkMap.get(key) ?? 0) + 1);
      }
    }
  }

  const maxStrength = Math.max(...Array.from(linkMap.values()), 1);
  const links: Link[] = Array.from(linkMap.entries()).map(([key, count]) => {
    const [a, b] = key.split('-').map(Number);
    return { source: `q${a}`, target: `q${b}`, strength: count / maxStrength };
  });

  return { nodes, links };
}

export function EntanglementGraph() {
  const { circuit, simulation } = useQuantumStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ w: 300, h: 220 });
  const containerRef = useRef<HTMLDivElement>(null);

  const result = simulation.result as StatevectorSimResult | null;
  const entropyMap: Record<string, number> = result?.entanglement?.von_neumann_entropy ?? {};

  const { nodes, links } = useMemo(
    () => buildEntanglementGraph(circuit.gates, circuit.num_qubits, entropyMap),
    [circuit.gates, circuit.num_qubits, entropyMap]
  );

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ w: Math.max(width, 200), h: Math.max(height, 160) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    const { w, h } = dimensions;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    // Gradient for nodes
    const grad = defs.append('radialGradient').attr('id', 'node-grad');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#818cf8');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#4f5ef9');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links)
        .id(d => d.id)
        .distance(d => 80 - d.strength * 40)
        .strength(d => d.strength * 0.8)
      )
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide(28));

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => `rgba(99,102,241,${0.2 + d.strength * 0.6})`)
      .attr('stroke-width', d => 1 + d.strength * 3)
      .attr('stroke-linecap', 'round');

    // Link labels (interaction count)
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links.filter(l => l.strength > 0.3))
      .join('text')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', 9)
      .attr('fill', '#6366f180')
      .attr('text-anchor', 'middle');

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab')
      .call(
        d3.drag<SVGGElement, Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          }) as never
      );

    // Node glow ring
    node.append('circle')
      .attr('r', d => 18 + d.entropy * 8)
      .attr('fill', d => `rgba(99,102,241,${d.entropy * 0.15})`)
      .attr('filter', 'url(#glow)');

    // Node body
    node.append('circle')
      .attr('r', 18)
      .attr('fill', 'url(#node-grad)')
      .attr('stroke', d => d.entropy > 0.1 ? '#d946ef' : '#6366f1')
      .attr('stroke-width', d => 1 + d.entropy * 2);

    // Qubit label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', 11)
      .attr('font-weight', 'bold')
      .attr('fill', '#e2e8f0')
      .text(d => `q${d.qubit}`);

    // Entropy label below
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '2.2em')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', 8)
      .attr('fill', '#94a3b8')
      .text(d => d.entropy > 0.001 ? `S=${d.entropy.toFixed(2)}` : '');

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      linkLabel
        .attr('x', d => ((d.source as Node).x! + (d.target as Node).x!) / 2)
        .attr('y', d => ((d.source as Node).y! + (d.target as Node).y!) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [nodes, links, dimensions]);

  const hasEntanglement = links.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header border-b border-quantum-500/10">
        <div className="w-2 h-2 rounded-full bg-plasma-500" />
        Entanglement Graph
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] font-mono text-slate-700">
            {links.length} interaction{links.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative">
        {circuit.num_qubits === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-slate-600">No qubits</p>
          </div>
        ) : !hasEntanglement ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <svg viewBox="0 0 32 32" className="w-8 h-8 opacity-20" fill="none">
              {Array.from({ length: circuit.num_qubits }, (_, i) => (
                <circle key={i} cx={16} cy={16} r={4 + i * 3}
                        stroke="#6366f1" strokeWidth="0.8" strokeDasharray="2 2" />
              ))}
            </svg>
            <p className="text-xs text-slate-600">
              {circuit.num_qubits} qubits — no multi-qubit gates yet
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ overflow: 'visible' }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-quantum-500/10 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 bg-quantum-500/60 rounded" />
          <span className="text-[9px] text-slate-600">Weak coupling</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-1 bg-quantum-500 rounded" />
          <span className="text-[9px] text-slate-600">Strong coupling</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-plasma-500" />
          <span className="text-[9px] text-slate-600">High entropy</span>
        </div>
      </div>
    </div>
  );
}
