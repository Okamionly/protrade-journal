"use client";

import { useState } from "react";
import { useStrategies, Strategy } from "@/hooks/useStrategies";
import { useTrades } from "@/hooks/useTrades";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

const PRESET_COLORS = [
  "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export default function StrategiesPage() {
  const { strategies, loading, addStrategy, updateStrategy, deleteStrategy } = useStrategies();
  const { trades } = useTrades();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const resetForm = () => {
    setName("");
    setColor(PRESET_COLORS[0]);
    setDescription("");
    setError("");
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (s: Strategy) => {
    setEditingId(s.id);
    setName(s.name);
    setColor(s.color);
    setDescription(s.description || "");
    setShowForm(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await updateStrategy(editingId, { name, color, description });
      } else {
        await addStrategy({ name, color, description });
      }
      resetForm();
    } catch (err: unknown) {
      setError((err as Error).message || "Erreur");
    }
  };

  const getStrategyStats = (stratName: string) => {
    const stTrades = trades.filter((t) => t.strategy === stratName);
    const wins = stTrades.filter((t) => t.result > 0).length;
    const total = stTrades.length;
    const pnl = stTrades.reduce((sum, t) => sum + t.result, 0);
    return { total, wins, winRate: total > 0 ? (wins / total) * 100 : 0, pnl };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl" style={{ background: "var(--bg-card-solid)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Stratégies</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Gérez vos stratégies de trading et suivez leurs performances.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Nouvelle stratégie
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="metric-card rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {editingId ? "Modifier la stratégie" : "Nouvelle stratégie"}
              </h3>
              <button type="button" onClick={resetForm}>
                <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            {error && (
              <p className="text-sm text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Nom</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Ex: Breakout London"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-lg transition-transform hover:scale-110 flex items-center justify-center"
                      style={{ background: c, border: color === c ? "2px solid white" : "2px solid transparent" }}
                    >
                      {color === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Description (optionnel)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
                rows={2}
                placeholder="Règles d'entrée, conditions, timeframe..."
              />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                Annuler
              </button>
              <button type="submit" className="btn-primary text-white px-6 py-2 rounded-xl text-sm font-medium">
                {editingId ? "Sauvegarder" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {strategies.length === 0 && !showForm ? (
        <div className="metric-card rounded-2xl p-12 text-center">
          <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>Aucune stratégie</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Créez votre première stratégie pour commencer à catégoriser vos trades.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {strategies.map((s) => {
            const stats = getStrategyStats(s.name);
            return (
              <div key={s.id} className="metric-card rounded-2xl p-5 flex items-center gap-4">
                <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{s.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${s.color}20`, color: s.color }}>
                      {stats.total} trades
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-xs mt-1 truncate" style={{ color: "var(--text-muted)" }}>{s.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold mono" style={{ color: stats.pnl >= 0 ? "#10b981" : "#ef4444" }}>
                      {stats.pnl >= 0 ? "+" : ""}{stats.pnl.toFixed(2)}€
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>P&L</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold mono" style={{ color: "var(--text-primary)" }}>
                      {stats.winRate.toFixed(0)}%
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Win Rate</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(s)}
                      className="p-2 rounded-lg hover:bg-blue-500/10 transition"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteStrategy(s.id)}
                      className="p-2 rounded-lg hover:bg-rose-500/10 transition text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
