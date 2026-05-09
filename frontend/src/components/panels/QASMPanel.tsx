'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Download, RefreshCw, Code2, AlertCircle } from 'lucide-react';
import { useQuantumStore } from '@/store/quantumStore';
import { circuitsApi } from '@/lib/api';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// ─── Custom QASM language definition ─────────────────────────────────────────
const QASM_MONARCH = {
  keywords: [
    'OPENQASM', 'include', 'qreg', 'creg', 'gate', 'measure', 'barrier',
    'reset', 'if', 'opaque', 'pi',
  ],
  gates: [
    'h', 'x', 'y', 'z', 's', 't', 'sdg', 'tdg', 'sx', 'cx', 'cy', 'cz',
    'ch', 'ccx', 'cswap', 'swap', 'rx', 'ry', 'rz', 'p', 'u', 'u1', 'u2', 'u3',
    'cp', 'crx', 'cry', 'crz', 'id', 'rxx', 'ryy', 'rzz', 'ecr', 'dcx',
  ],
  tokenizer: {
    root: [
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
      [/"[^"]*"/, 'string'],
      [/\d+\.\d*([eE][\-+]?\d+)?/, 'number.float'],
      [/\d+/, 'number'],
      [/[a-z_A-Z][\w]*/, {
        cases: {
          '@keywords': 'keyword',
          '@gates': 'type',
          '@default': 'identifier',
        },
      }],
      [/[\[\]{}()\->]/, 'bracket'],
      [/[,;]/, 'delimiter'],
    ],
    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],
  },
};

// ─── QASM Code Panel ──────────────────────────────────────────────────────────
export function QASMPanel() {
  const { circuit } = useQuantumStore();
  const [qasm, setQasm] = useState('');
  const [version, setVersion] = useState<2 | 3>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<{ getValue: () => string } | null>(null);

  const generateQASM = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Save circuit first to get ID, then fetch QASM
      const saved = await circuitsApi.create(circuit as Record<string, unknown>) as { id: string };
      const { qasm: generatedQasm } = await circuitsApi.getQasm(saved.id, version);
      setQasm(generatedQasm);
    } catch (e: unknown) {
      // Fallback: generate basic QASM2 inline
      setError((e as Error).message);
      setQasm(generateQASMFallback(circuit));
    } finally {
      setLoading(false);
    }
  }, [circuit, version]);

  useEffect(() => { generateQASM(); }, [circuit.gates.length, version]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(qasm);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  }, [qasm]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([qasm], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${circuit.name || 'circuit'}.qasm`;
    a.click();
    URL.revokeObjectURL(url);
  }, [qasm, circuit.name]);

  const monacoOptions = {
    minimap: { enabled: false },
    lineNumbers: 'on' as const,
    fontSize: 12,
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    theme: 'qasm-dark',
    padding: { top: 12, bottom: 12 },
    renderLineHighlight: 'none' as const,
    scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
    wordWrap: 'on' as const,
    readOnly: true,
    contextmenu: false,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-quantum-500/10">
        <Code2 size={13} className="text-quantum-400" />
        <span className="font-display text-xs font-semibold text-slate-300">QASM Editor</span>

        {/* Version toggle */}
        <div className="flex rounded overflow-hidden border border-quantum-500/20 ml-2">
          {([2, 3] as const).map(v => (
            <button
              key={v}
              onClick={() => setVersion(v)}
              className={`px-2 py-0.5 text-[10px] font-mono transition-colors ${
                version === v
                  ? 'bg-quantum-500/20 text-quantum-300'
                  : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              v{v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            className="quantum-button px-2 py-1 text-xs"
            onClick={generateQASM}
            disabled={loading}
            title="Regenerate"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            className="quantum-button px-2 py-1 text-xs gap-1"
            onClick={handleCopy}
          >
            {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
          </button>
          <button
            className="quantum-button px-2 py-1 text-xs gap-1"
            onClick={handleDownload}
          >
            <Download size={10} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20">
          <AlertCircle size={11} className="text-yellow-400 flex-shrink-0" />
          <p className="text-[10px] text-yellow-400 font-mono truncate">{error} — showing fallback</p>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2">
            <RefreshCw size={14} className="text-quantum-400 animate-spin" />
            <span className="text-xs text-slate-500">Generating QASM…</span>
          </div>
        ) : (
          <MonacoEditor
            height="100%"
            language="qasm"
            value={qasm}
            options={monacoOptions}
            beforeMount={(monaco) => {
              // Register QASM language
              if (!monaco.languages.getLanguages().find(l => l.id === 'qasm')) {
                monaco.languages.register({ id: 'qasm' });
                monaco.languages.setMonarchTokensProvider('qasm', QASM_MONARCH as never);
                monaco.editor.defineTheme('qasm-dark', {
                  base: 'vs-dark',
                  inherit: true,
                  rules: [
                    { token: 'keyword',    foreground: '818cf8', fontStyle: 'bold' },
                    { token: 'type',       foreground: '34d399' },
                    { token: 'comment',    foreground: '475569', fontStyle: 'italic' },
                    { token: 'string',     foreground: 'fbbf24' },
                    { token: 'number',     foreground: 'fb923c' },
                    { token: 'number.float', foreground: 'fb923c' },
                    { token: 'identifier', foreground: 'e2e8f0' },
                    { token: 'bracket',    foreground: '94a3b8' },
                    { token: 'delimiter',  foreground: '64748b' },
                  ],
                  colors: {
                    'editor.background': '#05060f',
                    'editor.foreground': '#e2e8f0',
                    'editorLineNumber.foreground': '#334155',
                    'editorLineNumber.activeForeground': '#6366f1',
                    'editor.lineHighlightBackground': '#090b1a00',
                    'editor.selectionBackground': '#6366f130',
                    'editorCursor.foreground': '#6366f1',
                    'scrollbar.shadow': '#00000000',
                    'scrollbarSlider.background': '#6366f120',
                    'scrollbarSlider.hoverBackground': '#6366f140',
                  },
                });
              }
            }}
            onMount={(editor) => {
              editorRef.current = editor as unknown as { getValue: () => string };
            }}
          />
        )}
      </div>

      {/* Stats footer */}
      <div className="px-3 py-1.5 border-t border-quantum-500/10 flex items-center gap-4">
        <span className="font-mono text-[9px] text-slate-700">
          {qasm.split('\n').length} lines
        </span>
        <span className="font-mono text-[9px] text-slate-700">
          {(new TextEncoder().encode(qasm).length / 1024).toFixed(1)} KB
        </span>
        <span className="font-mono text-[9px] text-slate-700">
          OPENQASM {version}.0
        </span>
      </div>
    </div>
  );
}

// ─── Fallback QASM generator (no backend needed) ──────────────────────────────
function generateQASMFallback(circuit: { name: string; num_qubits: number; num_clbits: number; gates: Array<{ type: string; qubits: number[]; clbits?: number[]; params: (number | string)[] }> }): string {
  const lines: string[] = [
    'OPENQASM 2.0;',
    '"qelib1.inc";',
    '',
    `qreg q[${circuit.num_qubits}];`,
  ];

  if (circuit.num_clbits > 0) {
    lines.push(`creg c[${circuit.num_clbits}];`);
  }

  lines.push('');

  const gateMap: Record<string, string> = {
    H: 'h', X: 'x', Y: 'y', Z: 'z',
    S: 's', T: 't', SDG: 'sdg', TDG: 'tdg',
    SX: 'sx', I: 'id',
    CX: 'cx', CY: 'cy', CZ: 'cz', SWAP: 'swap',
    CCX: 'ccx', CSWAP: 'cswap',
    MEASURE: 'measure', BARRIER: 'barrier', RESET: 'reset',
    RX: 'rx', RY: 'ry', RZ: 'rz', P: 'p',
    U1: 'u1', U2: 'u2', U3: 'u3',
    CP: 'cp', CRX: 'crx', CRY: 'cry', CRZ: 'crz',
  };

  for (const gate of circuit.gates) {
    const gname = gateMap[gate.type.toUpperCase()] ?? gate.type.toLowerCase();
    const qargs = gate.qubits.map(q => `q[${q}]`).join(', ');

    if (gate.type === 'MEASURE') {
      const cbit = gate.clbits?.[0] ?? gate.qubits[0];
      lines.push(`measure q[${gate.qubits[0]}] -> c[${cbit}];`);
    } else if (gate.type === 'BARRIER') {
      lines.push(`barrier ${qargs};`);
    } else if (gate.params.length > 0) {
      const paramStr = gate.params
        .map(p => typeof p === 'number' ? formatParamValue(p) : p)
        .join(', ');
      lines.push(`${gname}(${paramStr}) ${qargs};`);
    } else {
      lines.push(`${gname} ${qargs};`);
    }
  }

  return lines.join('\n');
}

function formatParamValue(v: number): string {
  const pi = Math.PI;
  if (Math.abs(v) < 1e-10) return '0';
  if (Math.abs(v - pi) < 1e-6) return 'pi';
  if (Math.abs(v - pi / 2) < 1e-6) return 'pi/2';
  if (Math.abs(v - pi / 4) < 1e-6) return 'pi/4';
  if (Math.abs(v + pi) < 1e-6) return '-pi';
  if (Math.abs(v - 2 * pi) < 1e-6) return '2*pi';
  return v.toFixed(6);
}
