"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "@/i18n/context";
import {
  CheckSquare,
  Plus,
  Trash2,
  GripVertical,
  Shield,
  AlertTriangle,
  Save,
  RotateCcw,
  TrendingUp,
  Brain,
  Loader2,
  BookOpen,
  Flame,
  Clock,
  PlayCircle,
  ClipboardCheck,
  X,
} from "lucide-react";

interface Rule {
  id: string;
  text: string;
  category: "risk" | "setup" | "mental" | "exit";
  phase: "pre" | "during" | "post";
}

interface ChecklistEntry {
  date: string;
  checks: Record<string, boolean>;
  score: number;
  notes: string;
}

const CATEGORIES = {
  risk: { labelKey: "riskManagement", icon: Shield, color: "text-amber-400" },
  setup: { labelKey: "setupAndEntry", icon: TrendingUp, color: "text-cyan-400" },
  mental: { labelKey: "mentalAndDiscipline", icon: Brain, color: "text-violet-400" },
  exit: { labelKey: "exitAndManagement", icon: AlertTriangle, color: "text-rose-400" },
};

const PHASES = {
  pre: { labelKey: "phasePre", icon: ClipboardCheck, color: "#0ea5e9" },
  during: { labelKey: "phaseDuring", icon: PlayCircle, color: "#f59e0b" },
  post: { labelKey: "phasePost", icon: Clock, color: "#8b5cf6" },
};

interface TemplateRule {
  text: string;
  category: Rule["category"];
  phase: Rule["phase"];
}

const TEMPLATE_RULES: TemplateRule[] = [
  // Pre-trade
  { text: "Vérifier le calendrier éco", category: "setup", phase: "pre" },
  { text: "Confirmer le biais daily", category: "setup", phase: "pre" },
  { text: "Identifier support/résistance", category: "setup", phase: "pre" },
  { text: "Calculer la taille de position", category: "risk", phase: "pre" },
  { text: "Vérifier le R:R minimum", category: "risk", phase: "pre" },
  // During
  { text: "Ne pas déplacer le SL", category: "exit", phase: "during" },
  { text: "Respecter le plan initial", category: "mental", phase: "during" },
  { text: "Prendre des partiels au TP1", category: "exit", phase: "during" },
  { text: "Ne pas ajouter au perdant", category: "risk", phase: "during" },
  { text: "Surveiller les news", category: "setup", phase: "during" },
  // Post-trade
  { text: "Noter les émotions", category: "mental", phase: "post" },
  { text: "Capturer le screenshot", category: "setup", phase: "post" },
  { text: "Évaluer le respect du plan", category: "mental", phase: "post" },
  { text: "Identifier les erreurs", category: "mental", phase: "post" },
  { text: "Mettre à jour le journal", category: "setup", phase: "post" },
];

const DEFAULT_RULES: Rule[] = [
  { id: "r1", text: "Mon risque est <= 2% du capital", category: "risk", phase: "pre" },
  { id: "r2", text: "Mon SL est placé à un niveau technique logique", category: "risk", phase: "pre" },
  { id: "r3", text: "Mon R:R est >= 1:2", category: "risk", phase: "pre" },
  { id: "r4", text: "J'ai identifié la tendance sur le timeframe supérieur", category: "setup", phase: "pre" },
  { id: "r5", text: "Mon setup correspond à une stratégie du Playbook", category: "setup", phase: "pre" },
  { id: "r6", text: "J'ai vérifié le calendrier économique", category: "setup", phase: "pre" },
  { id: "r7", text: "Je ne suis pas en revenge trading", category: "mental", phase: "during" },
  { id: "r8", text: "J'ai respecté mon plan de trading", category: "mental", phase: "during" },
  { id: "r9", text: "Je suis dans un état émotionnel stable", category: "mental", phase: "pre" },
  { id: "r10", text: "J'ai un TP clair ou un plan de sortie", category: "exit", phase: "pre" },
  { id: "r11", text: "Je ne déplacerai pas mon SL dans le mauvais sens", category: "exit", phase: "during" },
];

function inferPhase(rule: { category: string; text: string; phase?: string }): Rule["phase"] {
  if (rule.phase && (rule.phase === "pre" || rule.phase === "during" || rule.phase === "post")) {
    return rule.phase;
  }
  const t = rule.text.toLowerCase();
  if (t.includes("journal") || t.includes("screenshot") || t.includes("émotion") || t.includes("erreur") || t.includes("évaluer")) return "post";
  if (t.includes("déplacer") || t.includes("revenge") || t.includes("respecter") || t.includes("partiel") || t.includes("ajouter")) return "during";
  return "pre";
}

export default function ChecklistPage() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<Rule[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<ChecklistEntry[]>([]);
  const [newRule, setNewRule] = useState("");
  const [newCategory, setNewCategory] = useState<Rule["category"]>("setup");
  const [newPhase, setNewPhase] = useState<Rule["phase"]>("pre");
  const [showAddRule, setShowAddRule] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activePhase, setActivePhase] = useState<Rule["phase"] | "all">("all");

  // Fetch rules from API
  const fetchRules = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/trading-rules");
      if (!res.ok) {
        throw new Error(t("loadRulesError"));
      }
      const data = await res.json();
      if (data.length === 0) {
        await seedDefaultRules();
      } else {
        setRules(
          data.map((r: { id: string; text: string; category?: string; phase?: string }) => {
            const withCategory = { ...r, category: r.category || "setup" };
            return {
              id: r.id,
              text: r.text,
              category: withCategory.category,
              phase: inferPhase(withCategory),
            };
          })
        );
      }
    } catch (err) {
      console.error("Failed to fetch rules:", err);
      setError(t("cannotLoadRules"));
    } finally {
      setLoading(false);
    }
  }, []);

  const seedDefaultRules = async () => {
    try {
      const created: Rule[] = [];
      for (const rule of DEFAULT_RULES) {
        const res = await fetch("/api/trading-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rule.text, category: rule.category }),
        });
        if (res.ok) {
          const data = await res.json();
          created.push({
            id: data.id,
            text: data.text,
            category: data.category || "setup",
            phase: inferPhase({ ...rule, category: data.category || rule.category, text: data.text }),
          });
        }
      }
      setRules(created);
    } catch (err) {
      console.error("Failed to seed default rules:", err);
      setError(t("cannotCreateDefaultRules"));
    }
  };

  useEffect(() => {
    fetchRules();
    const savedHistory = localStorage.getItem("checklist-history");
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      setHistory(parsed);
      const today = new Date().toISOString().split("T")[0];
      const todayEntry = parsed.find((e: ChecklistEntry) => e.date === today);
      if (todayEntry) {
        setChecks(todayEntry.checks);
        setNotes(todayEntry.notes);
      }
    }
  }, [fetchRules]);

  const toggleCheck = (ruleId: string) => {
    setChecks((prev) => ({ ...prev, [ruleId]: !prev[ruleId] }));
  };

  const checkedCount = rules.filter((r) => checks[r.id]).length;
  const score = rules.length > 0 ? Math.round((checkedCount / rules.length) * 100) : 0;
  const canTrade = score >= 80;

  // Compliance score per phase
  const phaseScores = useMemo(() => {
    const result: Record<string, { checked: number; total: number; pct: number }> = {};
    for (const phase of ["pre", "during", "post"] as const) {
      const phaseRules = rules.filter((r) => r.phase === phase);
      const checked = phaseRules.filter((r) => checks[r.id]).length;
      result[phase] = {
        checked,
        total: phaseRules.length,
        pct: phaseRules.length > 0 ? Math.round((checked / phaseRules.length) * 100) : 0,
      };
    }
    return result;
  }, [rules, checks]);

  // Streak counter: consecutive 100% days
  const streak = useMemo(() => {
    let count = 0;
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
    for (const entry of sorted) {
      if (entry.score === 100) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [history]);

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-400";
    if (s >= 60) return "text-amber-400";
    return "text-rose-400";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 90) return t("scoreLabelExcellent");
    if (s >= 80) return t("scoreLabelGood");
    if (s >= 60) return t("scoreLabelWarning");
    return t("scoreLabelStop");
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

  const addRule = async () => {
    if (!newRule.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trading-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newRule.trim(), category: newCategory }),
      });
      if (!res.ok) {
        throw new Error(t("createRuleError"));
      }
      const data = await res.json();
      setRules((prev) => [...prev, { id: data.id, text: data.text, category: data.category || newCategory, phase: newPhase }]);
      setNewRule("");
      setShowAddRule(false);
    } catch (err) {
      console.error("Failed to add rule:", err);
      setError(t("cannotAddRule"));
    } finally {
      setSaving(false);
    }
  };

  const addTemplateRule = async (template: TemplateRule) => {
    if (saving) return;
    // Check if rule text already exists
    if (rules.some((r) => r.text === template.text)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trading-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: template.text, category: template.category }),
      });
      if (!res.ok) throw new Error(t("createRuleError"));
      const data = await res.json();
      setRules((prev) => [...prev, { id: data.id, text: data.text, category: data.category || template.category, phase: template.phase }]);
    } catch (err) {
      console.error("Failed to add template rule:", err);
      setError(t("cannotAddRule"));
    } finally {
      setSaving(false);
    }
  };

  const removeRule = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/trading-rules/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(t("deleteError"));
      }
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete rule:", err);
      setError(t("cannotDeleteRule"));
    }
  };

  // Group rules by phase then category
  const filteredRules = activePhase === "all" ? rules : rules.filter((r) => r.phase === activePhase);

  const grouped = Object.entries(CATEGORIES).map(([key, cat]) => ({
    key: key as Rule["category"],
    label: t(cat.labelKey),
    icon: cat.icon,
    color: cat.color,
    rules: filteredRules.filter((r) => r.category === key),
  }));

  // History stats
  const avgScore = history.length > 0 ? Math.round(history.reduce((s, h) => s + h.score, 0) / history.length) : 0;
  const perfectDays = history.filter((h) => h.score === 100).length;

  // Template rules grouped by phase
  const templatesByPhase = {
    pre: TEMPLATE_RULES.filter((r) => r.phase === "pre"),
    during: TEMPLATE_RULES.filter((r) => r.phase === "during"),
    post: TEMPLATE_RULES.filter((r) => r.phase === "post"),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm text-[--text-secondary]">{t("loadingRules")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">{t("preTradeChecklist")}</h1>
          <p className="text-sm text-[--text-secondary]">{t("preTradeChecklistDesc")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetChecks} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] hover:text-[--text-primary] text-sm">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={saveEntry} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium">
            <Save className="w-4 h-4" /> {t("save")}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Score Card + Streak + Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Score */}
        <div className={`glass rounded-2xl p-6 border-2 transition-all lg:col-span-2 ${canTrade ? "border-emerald-500/30" : score >= 60 ? "border-amber-500/30" : "border-rose-500/30"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[--text-muted]">{t("disciplineScore")}</p>
              <p className={`text-5xl font-bold mono mt-2 ${getScoreColor(score)}`}>{score}%</p>
              <p className={`text-sm font-medium mt-2 ${getScoreColor(score)}`}>{getScoreLabel(score)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[--text-muted]">{checkedCount}/{rules.length} {t("rules")}</p>
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

        {/* Streak + Phase Compliance */}
        <div className="space-y-4">
          {/* Streak Counter */}
          <div className="glass rounded-2xl p-5 border border-[--border-subtle]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-[--text-muted]">{t("streakPerfectDays")}</p>
                <p className="text-2xl font-bold mono text-orange-400">{streak}</p>
              </div>
            </div>
            {streak > 0 && (
              <p className="text-xs text-orange-300/70 mt-2">
                {streak} {t("streakDaysMessage")}
              </p>
            )}
            {streak === 0 && (
              <p className="text-xs text-[--text-muted] mt-2">{t("streakStartToday")}</p>
            )}
          </div>

          {/* Phase Compliance Mini */}
          <div className="glass rounded-2xl p-5 border border-[--border-subtle]">
            <p className="text-xs text-[--text-muted] mb-3">{t("complianceByPhase")}</p>
            <div className="space-y-2">
              {(["pre", "during", "post"] as const).map((phase) => {
                const ps = phaseScores[phase];
                const phaseInfo = PHASES[phase];
                return (
                  <div key={phase} className="flex items-center gap-2">
                    <span className="text-[10px] font-medium w-16 truncate" style={{ color: phaseInfo.color }}>{t(phaseInfo.labelKey)}</span>
                    <div className="flex-1 h-2 rounded-full bg-[--bg-secondary]">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${ps.pct}%`, background: phaseInfo.color }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[--text-muted] w-10 text-right">{ps.pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Phase Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActivePhase("all")}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activePhase === "all"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
              : "glass text-[--text-secondary] hover:text-[--text-primary]"
          }`}
        >
          {t("phaseAll")}
        </button>
        {(["pre", "during", "post"] as const).map((phase) => {
          const phaseInfo = PHASES[phase];
          const PhaseIcon = phaseInfo.icon;
          const ps = phaseScores[phase];
          return (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                activePhase === phase
                  ? "border"
                  : "glass text-[--text-secondary] hover:text-[--text-primary]"
              }`}
              style={activePhase === phase ? {
                background: `${phaseInfo.color}15`,
                borderColor: `${phaseInfo.color}50`,
                color: phaseInfo.color,
              } : undefined}
            >
              <PhaseIcon className="w-3.5 h-3.5" />
              {t(phaseInfo.labelKey)}
              <span className="text-[10px] opacity-70">({ps.checked}/{ps.total})</span>
            </button>
          );
        })}
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
                  {/* Phase badge */}
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0"
                    style={{
                      background: `${PHASES[rule.phase].color}15`,
                      color: PHASES[rule.phase].color,
                    }}
                  >
                    {rule.phase}
                  </span>
                  {editMode && (
                    <button onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }} className="text-rose-400 hover:text-rose-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {catRules.length === 0 && (
                <p className="text-sm text-[--text-muted] text-center py-2">{t("noRulesInCategory")}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold text-[--text-primary] mb-3">{t("sessionNotes")}</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("sessionNotesPlaceholder")}
          className="input-field h-24 resize-none"
        />
      </div>

      {/* Add Rule / Edit Mode / Templates */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setEditMode(!editMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${editMode ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "glass text-[--text-secondary] hover:text-[--text-primary]"}`}
        >
          <GripVertical className="w-4 h-4" /> {editMode ? t("done") : t("editRules")}
        </button>
        <button
          onClick={() => setShowAddRule(!showAddRule)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] hover:text-[--text-primary] text-sm"
        >
          <Plus className="w-4 h-4" /> {t("addRule")}
        </button>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            showTemplates
              ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
              : "glass text-[--text-secondary] hover:text-[--text-primary]"
          }`}
        >
          <BookOpen className="w-4 h-4" /> {t("templatesButton")}
        </button>
      </div>

      {/* Add Rule Form */}
      {showAddRule && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-[--text-primary] mb-3">{t("newRule")}</h3>
          <div className="flex gap-3 flex-wrap">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as Rule["category"])}
              className="input-field w-44"
            >
              {Object.entries(CATEGORIES).map(([key, { labelKey }]) => (
                <option key={key} value={key}>{t(labelKey)}</option>
              ))}
            </select>
            <select
              value={newPhase}
              onChange={(e) => setNewPhase(e.target.value as Rule["phase"])}
              className="input-field w-36"
            >
              {(["pre", "during", "post"] as const).map((p) => (
                <option key={p} value={p}>{t(PHASES[p].labelKey)}</option>
              ))}
            </select>
            <input
              type="text"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRule()}
              placeholder={t("ruleTextPlaceholder")}
              className="input-field flex-1 min-w-[200px]"
            />
            <button
              onClick={addRule}
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium text-sm disabled:opacity-50"
            >
              {saving ? "..." : t("add")}
            </button>
          </div>
        </div>
      )}

      {/* Templates Library */}
      {showTemplates && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-[--text-primary] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-400" />
              {t("templatesLibrary")}
            </h3>
            <button onClick={() => setShowTemplates(false)} className="text-[--text-muted] hover:text-[--text-primary]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[--text-muted] mb-4">{t("templatesDesc")}</p>
          <div className="space-y-5">
            {(["pre", "during", "post"] as const).map((phase) => {
              const phaseInfo = PHASES[phase];
              const PhaseIcon = phaseInfo.icon;
              const templates = templatesByPhase[phase];
              return (
                <div key={phase}>
                  <div className="flex items-center gap-2 mb-3">
                    <PhaseIcon className="w-4 h-4" style={{ color: phaseInfo.color }} />
                    <span className="text-sm font-semibold" style={{ color: phaseInfo.color }}>{t(phaseInfo.labelKey)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {templates.map((tmpl) => {
                      const alreadyAdded = rules.some((r) => r.text === tmpl.text);
                      return (
                        <button
                          key={tmpl.text}
                          onClick={() => !alreadyAdded && addTemplateRule(tmpl)}
                          disabled={alreadyAdded || saving}
                          className={`text-left p-3 rounded-xl text-xs transition-all ${
                            alreadyAdded
                              ? "opacity-40 cursor-not-allowed bg-[--bg-secondary]/30 border border-[--border-subtle]"
                              : "bg-[--bg-secondary]/30 border border-[--border-subtle] hover:border-violet-500/40 hover:bg-violet-500/5 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {alreadyAdded ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                            )}
                            <span className="text-[--text-primary]">{tmpl.text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[--text-primary] mb-4">{t("disciplineHistory")}</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="metric-card rounded-xl p-4 text-center">
            <p className="text-xs text-[--text-muted]">{t("averageScore")}</p>
            <p className={`text-2xl font-bold mono ${getScoreColor(avgScore)}`}>{avgScore}%</p>
          </div>
          <div className="metric-card rounded-xl p-4 text-center">
            <p className="text-xs text-[--text-muted]">{t("perfectDays")}</p>
            <p className="text-2xl font-bold text-emerald-400">{perfectDays}</p>
          </div>
          <div className="metric-card rounded-xl p-4 text-center">
            <p className="text-xs text-[--text-muted]">{t("loggedSessions")}</p>
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
            <p className="text-sm text-[--text-muted] w-full text-center py-8">{t("noHistorySaveFirst")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
