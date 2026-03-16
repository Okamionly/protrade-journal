"use client";

import { useState, useEffect } from "react";
import { Save, ChevronLeft, ChevronRight, Crosshair, TrendingUp, TrendingDown, Minus, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { useTradingRules } from "@/hooks/useTradingRules";

const BIAS_OPTIONS = [
  { value: "bullish", label: "Haussier", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
  { value: "bearish", label: "Baissier", icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30" },
  { value: "neutral", label: "Neutre", icon: Minus, color: "text-gray-400", bg: "bg-gray-500/15 border-gray-500/30" },
];

const GRADE_OPTIONS = ["A+", "A", "B", "C", "D", "F"];

interface DailyPlan {
  id?: string;
  date: string;
  bias: string;
  notes: string;
  pairs: string;
  keyLevels: string;
  review: string;
  grade: string;
}

export default function DailyBiasPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [plan, setPlan] = useState<DailyPlan>({ date, bias: "", notes: "", pairs: "", keyLevels: "", review: "", grade: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { rules, addRule, deleteRule } = useTradingRules();
  const [checkedRules, setCheckedRules] = useState<Set<string>>(new Set());
  const [newRuleText, setNewRuleText] = useState("");
  const [showAddRule, setShowAddRule] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/daily-plan?date=${date}`);
        if (res.ok) {
          const data = await res.json();
          if (data) setPlan({ ...data, date });
          else setPlan({ date, bias: "", notes: "", pairs: "", keyLevels: "", review: "", grade: "" });
        }
      } catch { /* ignore */ }
    };
    load();
    setCheckedRules(new Set());
  }, [date]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const toggleRule = (id: string) => {
    setCheckedRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddRule = async () => {
    if (!newRuleText.trim()) return;
    await addRule(newRuleText.trim());
    setNewRuleText("");
    setShowAddRule(false);
  };

  const isToday = date === new Date().toISOString().slice(0, 10);
  const allChecked = rules.length > 0 && checkedRules.size === rules.length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Crosshair className="w-6 h-6 text-cyan-400" />
            Daily Bias
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Plan de trading et analyse pré-marché</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg transition" style={{ color: "var(--text-muted)" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className={`px-4 py-2 rounded-xl text-sm font-medium ${isToday ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" : ""}`}
            style={!isToday ? { background: "var(--bg-card-solid)", color: "var(--text-secondary)", border: "1px solid var(--border)" } : {}}>
            {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg transition" style={{ color: "var(--text-muted)" }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Checklist pré-trade */}
          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Checklist pré-trade
                {rules.length > 0 && (
                  <span className="ml-2 text-xs" style={{ color: allChecked ? "#10b981" : "var(--text-muted)" }}>
                    {checkedRules.size}/{rules.length}
                  </span>
                )}
              </h3>
              <button onClick={() => setShowAddRule(!showAddRule)} className="p-1.5 rounded-lg transition hover:bg-blue-500/10" style={{ color: "var(--text-muted)" }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showAddRule && (
              <div className="flex gap-2 mb-3">
                <input
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  className="input-field flex-1 text-sm"
                  placeholder="Nouvelle règle de trading..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddRule()}
                />
                <button onClick={handleAddRule} className="btn-primary text-white px-3 py-1 rounded-lg text-sm">OK</button>
              </div>
            )}

            {rules.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Ajoutez vos règles de trading pour créer votre checklist pré-trade.
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 p-2 rounded-xl transition group" style={{ background: checkedRules.has(rule.id) ? "rgba(16,185,129,0.05)" : "transparent" }}>
                    <button onClick={() => toggleRule(rule.id)} className="flex-shrink-0">
                      {checkedRules.has(rule.id) ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                      )}
                    </button>
                    <span className={`text-sm flex-1 ${checkedRules.has(rule.id) ? "line-through opacity-60" : ""}`} style={{ color: "var(--text-primary)" }}>
                      {rule.text}
                    </span>
                    <button onClick={() => deleteRule(rule.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded transition text-rose-400 hover:bg-rose-500/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bias directionnel */}
          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Biais directionnel</h3>
            <div className="flex gap-3">
              {BIAS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = plan.bias === opt.value;
                return (
                  <button key={opt.value} onClick={() => setPlan({ ...plan, bias: opt.value })}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition font-medium ${
                      isActive ? opt.bg : ""
                    }`}
                    style={!isActive ? { borderColor: "var(--border)", color: "var(--text-muted)" } : {}}>
                    <Icon className={`w-5 h-5 ${isActive ? opt.color : ""}`} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Paires à surveiller</h3>
            <input value={plan.pairs} onChange={(e) => setPlan({ ...plan, pairs: e.target.value })} placeholder="EUR/USD, GBP/USD, XAU/USD..."
              className="input-field" />
          </div>

          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Niveaux clés</h3>
            <textarea value={plan.keyLevels} onChange={(e) => setPlan({ ...plan, keyLevels: e.target.value })} placeholder="Support: 1.0850&#10;Résistance: 1.0920&#10;POI: 1.0880..." rows={4}
              className="input-field resize-none" />
          </div>

          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Notes pré-marché</h3>
            <textarea value={plan.notes} onChange={(e) => setPlan({ ...plan, notes: e.target.value })} placeholder="Contexte macro, catalyseurs, plan d'action..." rows={4}
              className="input-field resize-none" />
          </div>
        </div>

        {/* Right column - Review */}
        <div className="space-y-4">
          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Review post-session</h3>
            <textarea value={plan.review} onChange={(e) => setPlan({ ...plan, review: e.target.value })} placeholder="Comment s'est passée la journée ? Qu'as-tu bien fait ? Que peux-tu améliorer ?" rows={6}
              className="input-field resize-none" />
          </div>

          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Note de la journée</h3>
            <div className="flex gap-2">
              {GRADE_OPTIONS.map((g) => (
                <button key={g} onClick={() => setPlan({ ...plan, grade: g })}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition border ${
                    plan.grade === g
                      ? g.startsWith("A") ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : g === "B" ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        : g === "C" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      : ""
                  }`}
                  style={plan.grade !== g ? { borderColor: "var(--border)", color: "var(--text-muted)" } : {}}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving || (!allChecked && rules.length > 0)}
            className="w-full btn-primary py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="w-5 h-5" />
            {saved ? "Sauvegardé !" : saving ? "Enregistrement..." : !allChecked && rules.length > 0 ? "Complétez la checklist" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}
