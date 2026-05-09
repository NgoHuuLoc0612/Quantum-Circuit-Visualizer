'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuantumStore } from '@/store/quantumStore';
import { circuitsApi } from '@/lib/api';

interface Template {
  id: string;
  name: string;
  num_qubits: number;
  description: string;
}

export function TemplateGallery({ onClose }: { onClose: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { setCircuit } = useQuantumStore();

  useEffect(() => {
    (circuitsApi.listTemplates() as Promise<{ templates: Template[] }>)
      .then(r => { setTemplates(r.templates); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadTemplate = async (id: string) => {
    try {
      const data = await circuitsApi.getTemplate(id) as Template & Record<string, unknown>;
      setCircuit({ ...data, name: data.name ?? id } as Parameters<typeof setCircuit>[0]);
      onClose();
    } catch {
      // silently fail
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-void-900/70 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="relative z-10 w-full max-w-2xl glass-panel rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="panel-header border-b border-quantum-500/10">
          <div className="w-2 h-2 rounded-full bg-quantum-500" />
          Template Gallery
          <button onClick={onClose} className="ml-auto text-slate-600 hover:text-slate-300 transition-colors">✕</button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-quantum-500/30 border-t-quantum-500 rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-center text-sm text-slate-600 py-8">No templates available</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => loadTemplate(t.id)}
                  className="glass-panel-hover p-3 rounded-xl text-left group transition-all"
                >
                  <div className="font-display text-sm font-semibold text-slate-200 mb-1
                                  group-hover:text-quantum-300 transition-colors">
                    {t.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2">{t.description}</div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded
                                   bg-quantum-500/10 text-quantum-400 border border-quantum-500/20">
                    {t.num_qubits}q
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
