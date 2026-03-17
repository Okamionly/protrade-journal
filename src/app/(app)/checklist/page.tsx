"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Plus, Trash2, GripVertical, Shield, AlertTriangle, Save, RotateCcw, TrendingUp, Brain } from "lucide-react";

interface Rule {
  id: string;
  text: string;
  category: "risk" | "setup" | "mental" | "exit";
}

interface ChecklistEntry {
  date: string;
  checks: Record<string, boolean>;
  score: number;
  notes: string;
}

const CATEGORIES = {
  risk: { label: "Gestion du Risque", icon: Shield, color: "text-amber-400" },
  setup: { label: "Setup & Entrée", icon: TrendingUp, color: "text-cyan-400" },
  mental: { label: "Mental & Discipline", icon: Brain, color: "text-violet-400" },
  exit: { label: "Sortie & Gestion", icon: AlertTriangle, color: "text-rose-400" },
};

const DEFAULT_RULES: Rule[] = [
  { id: "r1", text: "Mon risque est <= 2% du capital", category: "risk" },
  { id: "r2", text: "Mon SL est placé à un niveau technique logique", category: "risk" },
  { id: "r3", text: "Mon R:R est >= 1:2", category: "risk" },
  { id: "r4", text: "J'ai identifié la tendance sur le timeframe supérieur", category: "setup" },
  { id: "r5", text: "Mon setup correspond à une stratégie du Playbook", category: "setup" },
  { id: "r6", text: "J'ai vérifié le calendrier économique", category: "setup" },
  { id: "r7", text: "Je ne suis pas en revenge trading", category: "mental" },
  { id: "r8", text: "J'ai respecté mon plan de trading", category: "mental" },
  { id: "r9", text: "Je suis dans un état émotionnel stable", category: "mental" },
  { id: "r10", text: "J'ai un TP clair ou un plan de sortie", category: "exit" },
  { id: "r11", text: "Je ne déplacerai pas mon SL dans le mauvais sens", category: "exit" },
];

export default function ChecklistPage() {
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<ChecklistEntry[]>([]);
  const [newRule, setNewRule] = useState("");
  const [newCategory, setNewCategory] = useState<Rule["category"]>("setup");
  const [showAddRule, setShowAddRule] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const savedRules = localStorage.getItem("checklist-rules");
    if (savedRules) setRules(JSON.parse(savedRules));
    const savedHistory = localStorage.getItem("checklist-history");
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    // Load today's checks if any
    const today = new Date().toISOString().split("T")[0];
    if (savedHistory) {
      const todayEntry = JSON.parse(savedHistory).find((e: ChecklistEntry) => e.date === today);
      if (todayEntry) {
        setChecks(todayEntry.checks);
        setNotes(todayEntry.notes);
      }
    }
  }, []);

  const saveRules = (newRules: Rule[]) => {
    setRules(newRules);
    localStorage.setItem("checklist-rules", JSON.stringify(newRules));
  };

  const toggleCheck = (ruleId: string) => {
    setChecks((prev) => ({ ...prev, [ruleId]: !prev[ruleId] }));
  };

  const checkedCount = rules.filter((r) => checks[r.id]).length;
  const score = rules.length > 0 ? Math.round((checkedCount / rules.length) * 100) : 0;
  const canTrade = score >= 80;

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-400";
    if (s >= 60) return "text-amber-400";
    return "text-rose-400";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 90) return "Excellent — Tradez !";
    if (s >= 80) return "Bon — OK pour trader";
    if (s >= 60) return "Attention — Risque élevé";
    return "STOP — Ne tradez pas";
  };

  const saveEntry = () => {
    const today = new Date().toISOString().split("T")[0];
    const entry: ChecklistEntry = { date: today, checks, score, notes };
    const newHistory = [entry, ...history.filter((h) => h.date !== today)].slice(0, 90);
    setHistory(newHistory);
    localStorage.setItem("checklist-history", JSON.stringify(newHistory));
  };

  const resetChecks = () => {
    setChecks({});
    setNotes("");
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    const rule: Rule = { id: `r${Date.now()}`, text: newRule.trim(), category: newCategory };
    saveRules([...rules, rule]);
    setNewRule("");
    setShowAddRule(false);
  };

  const removeRule = (id: string) => {
    saveRules(rules.filter((r) => r.id !== id));
  };

  // Group rules by category
  const grouped = Object.entries(CATEGORIES).map(([key, cat]) => ({
    key: key as Rule["category"],
    ...cat,
    rules: rules.filter((r) => r.category === key),
  }));

  // History stats
  const avgScore = history.length > 0 ? Math.round(history.reduce((s, h) => s + h.score, 0) / history.length) : 0;
  const perfectDays = history.filter((h) => h.score === 100).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Checklist Pré-Trade</h1>
          <p className="text-sm text-[--text-secondary]">Vérifiez vos règles avant chaque session de trading</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetChecks} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] hover:text-[--text-primary] text-sm">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={saveEntry} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium">
            <Save className="w-4 h-4" /> Sauvegarder
          </button>
        </div>
      </div>

      {/* Score Card */}
      <div className={`glass rounded-2xl p-6 border-2 transition-all ${canTrade ? "border-emerald-500/30" : score >= 60 ? "border-amber-500/30" : "border-rose-500/30"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[--text-muted]">Score de Discipline</p>
            <p className={`text-5xl font-bold mono mt-2 ${getScoreColor(score)}`}>{score}%</p>
            <p className={`text-sm font-medium mt-2 ${getScoreColor(score)}`}>{getScoreLabel(score)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[--text-muted]">{checkedCount}/{rules.length} règles</p>
            {/* Circular progress */}
            <div className="relative w-24 h-24 mt-2">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${score * 2.64} 264`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {canTrade ? (
                  <CheckSquare className="w-8 h-8 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {grouped.map(({ key, label, icon: Icon, color, rules: catRules }) => (
          <div key={key} className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon className={`w-5 h-5 ${color}`} />
              <h3 className="font-semibold text-[--text-primary]">{label}</h3>
              <span className="text-xs text-[--text-muted] ml-auto">
                {catRules.filter((r) => checks[r.id]).length}/{catRules.length}
              </span>
            </div>
            <div className="space-y-2">
              {catRules.map((rule) => (
                <div
                  key={rule.id}
                  onClick={() => !editMode && toggleCheck(rule.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    checks[rule.id]
                      ? "bg-emerald-500/10 border border-emerald-500/30"
                      : "bg-[--bg-secondary]/30 border border-[--border-subtle] hover:border-[--border]"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                    checks[rule.id] ? "bg-emerald-500 border-emerald-500" : "border-[--text-muted]"
                  }`}>
                    {checks[rule.id] && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className={`text-sm flex-1 ${checks[rule.id] ? "text-emerald-300 line-through opacity-70" : "text-[--text-primary]"}`}>
                    {rule.text}
                  </span>
                  {editMode && (
                    <button onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }} className="text-rose-400 hover:text-rose-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {catRules.length === 0 && (
                <p className="text-sm text-[--text-muted] text-center py-2">Aucune règle dans cette catégorie</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold text-[--text-primary] mb-3">Notes de Session</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notez votre état mental, les conditions de marché, etc..."
          className="input-field h-24 resize-none"
        />
      </div>

      {/* Add Rule / Edit Mode */}
      <div className="flex gap-3">
        <button
          onClick={() => setEditMode(!editMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${editMode ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "glass text-[--text-secondary] hover:text-[--text-primary]"}`}
        >
          <GripVertical className="w-4 h-4" /> {editMode ? "Terminer" : "Modifier les règles"}
        </button>
        <button
          onClick={() => setShowAddRule(!showAddRule)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] hover:text-[--text-primary] text-sm"
        >
          <Plus className="w-4 h-4" /> Ajouter une règle
        </button>
      </div>

      {showAddRule && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-[--text-primary] mb-3">Nouvelle Règle</h3>
          <div className="flex gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as Rule["category"])}
              className="input-field w-48"
            >
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <input
              type="text"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRule()}
              placeholder="Texte de la règle..."
              className="input-field flex-1"
            />
            <button onClick={addRule} className="px-6 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium text-sm">
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[--text-primary] mb-4">Historique de Discipline</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="metric-card rounded-xl p-4 text-center">
            <p className="text-xs text-[--text-muted]">Score Moyen</p>
            <p className={`text-2xl font-bold mono ${getScoreColor(avgScore)}`}>{avgScore}%</p>
          </div>
          <div className="metric-card rounded-xl p-4 text-center">
            <p className="text-xs text-[--text-muted]">Jours Parfaits</p>
            <p className="text-2xl font-bold text-emerald-400">{perfectDays}</p>
          </div>
          <div className="metric-card rounded-xl p-4 text-center">
            <p className="text-xs text-[--text-muted]">Sessions Loguées</p>
            <p className="text-2xl font-bold text-cyan-400">{history.length}</p>
          </div>
        </div>
        {/* Recent history bars */}
        <div className="flex items-end gap-1 h-24">
          {history.slice(0, 30).reverse().map((entry, i) => (
            <div
              key={i}
              className="flex-1 rounded-t transition-all"
              style={{
                height: `${entry.score}%`,
                background: entry.score >= 80 ? "rgba(16,185,129,0.5)" : entry.score >= 60 ? "rgba(245,158,11,0.5)" : "rgba(239,68,68,0.5)",
              }}
              title={`${entry.date}: ${entry.score}%`}
            />
          ))}
          {history.length === 0 && (
            <p className="text-sm text-[--text-muted] w-full text-center py-8">Aucun historique — sauvegardez votre première checklist !</p>
          )}
        </div>
      </div>
    </div>
  );
}
