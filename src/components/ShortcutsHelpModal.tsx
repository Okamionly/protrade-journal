"use client";

import { X, Keyboard } from "lucide-react";

interface ShortcutsHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: "Ctrl + N", description: "Nouveau trade" },
  { keys: "Ctrl + D", description: "Tableau de bord" },
  { keys: "Ctrl + J", description: "Journal" },
  { keys: "Ctrl + K", description: "Graphiques" },
  { keys: "Ctrl + /", description: "Afficher les raccourcis" },
];

export function ShortcutsHelpModal({ open, onClose }: ShortcutsHelpModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative glass rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Raccourcis clavier
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Shortcuts grid */}
        <div className="space-y-3">
          {shortcuts.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between py-2 px-3 rounded-xl"
              style={{ background: "var(--bg-secondary)" }}
            >
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {s.description}
              </span>
              <kbd
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <p className="text-xs mt-5 text-center" style={{ color: "var(--text-muted)" }}>
          Appuyez sur <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>Esc</kbd> ou <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>Ctrl + /</kbd> pour fermer
        </p>
      </div>
    </div>
  );
}
