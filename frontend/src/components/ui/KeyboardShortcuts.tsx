'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SHORTCUTS = [
  { key: '⌘K',  desc: 'Command palette'   },
  { key: '⌘↵',  desc: 'Run simulation'    },
  { key: '⌘Z',  desc: 'Undo'              },
  { key: '⌘Y',  desc: 'Redo'              },
  { key: 'Del', desc: 'Delete selected gate' },
  { key: '?',   desc: 'Toggle shortcuts'  },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) setOpen(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <button
        className="fixed bottom-10 right-4 z-40 w-6 h-6 rounded-full bg-void-700
                   border border-quantum-500/20 flex items-center justify-center
                   text-slate-600 hover:text-slate-400 transition-colors text-xs font-mono"
        onClick={() => setOpen(v => !v)}
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-16 right-4 z-40 glass-panel rounded-xl p-3 w-44"
          >
            <p className="font-display text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Shortcuts
            </p>
            <div className="space-y-1.5">
              {SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{s.desc}</span>
                  <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-void-700 border border-quantum-500/20
                                  text-quantum-400 font-mono">{s.key}</kbd>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
