"use client";

import { useState, useEffect } from "react";
import { Save, ChevronLeft, ChevronRight, Crosshair, TrendingUp, TrendingDown, Minus, Plus, Trash2, CheckSquare, Square, Clock, Globe, MessageSquare, BarChart3 } from "lucide-react";
import { useTradingRules } from "@/hooks/useTradingRules";

const BIAS_OPTIONS = [
  { value: "bullish", label: "Haussier", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
  { value: "bearish", label: "Baissier", icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30" },
  { value: "neutral", label: "Neutre", icon: Minus, color: "text-[--text-secondary]", bg: "bg-gray-500/15 border-gray-500/30" },
];

const GRADE_OPTIONS = ["A+", "A", "B", "C", "D", "F"];

// Session definitions in UTC hours
const SESSIONS = [
  { name: "Asia", open: 0, close: 8, color: "bg-purple-500", activeColor: "text-purple-400", barColor: "#a855f7" },
  { name: "London", open: 8, close: 16, color: "bg-blue-500", activeColor: "text-blue-400", barColor: "#3b82f6" },
  { name: "New York", open: 13, close: 21, color: "bg-emerald-500", activeColor: "text-emerald-400", barColor: "#10b981" },
];

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

interface PriceItem {
  symbol: string;
  price: number;
  change: number;
}

interface MarketData {
  forex: PriceItem[];
  indices: PriceItem[];
  commodities: PriceItem[];
}

interface VixData {
  vix: { current: number; changePct: number };
}

function isSessionActive(open: number, close: number, utcHour: number): boolean {
  if (open < close) return utcHour >= open && utcHour < close;
  return utcHour >= open || utcHour < close;
}

// ---- Market Snapshot Bar ----
function MarketSnapshot() {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [vix, setVix] = useState<VixData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [priceRes, vixRes] = await Promise.all([
          fetch("/api/live-prices").then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch("/api/market-data/vix").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (priceRes) setMarket(priceRes);
        if (vixRes) setVix(vixRes);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="metric-card rounded-2xl p-4 animate-pulse">
        <div className="flex gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1">
              <div className="h-3 rounded w-16 mb-2" style={{ background: "var(--bg-secondary)" }} />
              <div className="h-5 rounded w-20" style={{ background: "var(--bg-secondary)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Extract key items
  const eurusd = market?.forex?.find((p) => p.symbol === "EUR/USD");
  const sp500 = market?.indices?.find((p) => p.symbol === "S&P 500");
  const dxy = market?.indices?.find((p) => p.symbol === "DXY");
  const vixVal = vix?.vix;

  const items: { label: string; value: string; change: number | null }[] = [];

  if (eurusd) items.push({ label: "EUR/USD", value: eurusd.price.toFixed(4), change: eurusd.change });
  if (sp500) items.push({ label: "S&P 500", value: sp500.price.toLocaleString(), change: sp500.change });
  if (vixVal) items.push({ label: "VIX", value: vixVal.current.toFixed(2), change: vixVal.changePct });
  if (dxy) items.push({ label: "DXY", value: dxy.price.toFixed(2), change: dxy.change });

  if (items.length === 0) return null;

  return (
    <div className="metric-card rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Market Snapshot
        </h3>
      </div>
      <div className="flex flex-wrap gap-4 md:gap-8">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
              {item.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold mono" style={{ color: "var(--text-primary)" }}>
                {item.value}
              </span>
              {item.change !== null && (
                <span className={`text-xs font-medium ${item.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Session Windows Indicator ----
function SessionWindows() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const totalMinutesInDay = 24 * 60;
  const currentMinutes = utcHour * 60 + utcMinute;
  const currentPositionPct = (currentMinutes / totalMinutesInDay) * 100;

  return (
    <div className="metric-card rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-amber-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Sessions de trading
        </h3>
        <span className="ml-auto text-[10px] mono" style={{ color: "var(--text-muted)" }}>
          {now.toUTCString().slice(17, 25)} UTC
        </span>
      </div>

      {/* Session labels + active indicator */}
      <div className="flex gap-4 mb-3">
        {SESSIONS.map((s) => {
          const active = isSessionActive(s.open, s.close, utcHour);
          return (
            <div key={s.name} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${active ? s.color : "bg-gray-600"} ${active ? "animate-pulse" : ""}`} />
              <span className={`text-xs font-medium ${active ? s.activeColor : ""}`} style={!active ? { color: "var(--text-muted)" } : {}}>
                {s.name}
              </span>
              <span className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
                {s.open}:00-{s.close}:00
              </span>
            </div>
          );
        })}
      </div>

      {/* Timeline bar */}
      <div className="relative h-6 rounded-lg overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
        {/* Hour markers */}
        {[0, 4, 8, 12, 16, 20].map((h) => (
          <div
            key={h}
            className="absolute top-0 h-full border-l"
            style={{ left: `${(h / 24) * 100}%`, borderColor: "rgba(255,255,255,0.05)" }}
          >
            <span className="absolute -top-0.5 left-0.5 text-[8px]" style={{ color: "var(--text-muted)" }}>
              {h}
            </span>
          </div>
        ))}

        {/* Session blocks */}
        {SESSIONS.map((s) => {
          const leftPct = (s.open / 24) * 100;
          const widthPct = ((s.close - s.open) / 24) * 100;
          const active = isSessionActive(s.open, s.close, utcHour);
          return (
            <div
              key={s.name}
              className="absolute top-1 h-4 rounded"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                background: active ? s.barColor : `${s.barColor}33`,
                opacity: active ? 0.7 : 0.25,
              }}
            />
          );
        })}

        {/* Current time marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white z-10"
          style={{ left: `${currentPositionPct}%`, boxShadow: "0 0 4px rgba(255,255,255,0.5)" }}
        />
      </div>
    </div>
  );
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
  const [commentDuJour, setCommentDuJour] = useState("");

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
    setCommentDuJour("");
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

  // Fix #1: Save enabled when there's ANY content
  const hasContent =
    plan.bias !== "" ||
    plan.notes.trim() !== "" ||
    plan.pairs.trim() !== "" ||
    plan.keyLevels.trim() !== "" ||
    plan.review.trim() !== "" ||
    plan.grade !== "" ||
    checkedRules.size > 0;

  // Fix #4: Execution quality metric
  const executionQuality = rules.length > 0 ? Math.round((checkedRules.size / rules.length) * 100) : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Crosshair className="w-6 h-6 text-cyan-400" />
            Daily Bias
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Plan de trading et analyse pre-marche</p>
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

      {/* Fix #2: Market Snapshot bar */}
      <MarketSnapshot />

      {/* Fix #3: Session Windows indicator */}
      <SessionWindows />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Checklist pre-trade */}
          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Checklist pre-trade
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
                  placeholder="Nouvelle regle de trading..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddRule()}
                />
                <button onClick={handleAddRule} className="btn-primary text-white px-3 py-1 rounded-lg text-sm">OK</button>
              </div>
            )}

            {rules.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Ajoutez vos regles de trading pour creer votre checklist pre-trade.
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

            {/* Fix #4: Execution quality metric */}
            {executionQuality !== null && (
              <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Qualite d&apos;execution</span>
                  </div>
                  <span className={`text-xs font-bold mono ${executionQuality === 100 ? "text-emerald-400" : executionQuality >= 70 ? "text-amber-400" : "text-rose-400"}`}>
                    {executionQuality}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${executionQuality === 100 ? "bg-emerald-500" : executionQuality >= 70 ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${executionQuality}%` }}
                  />
                </div>
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
            <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Paires a surveiller</h3>
            <input value={plan.pairs} onChange={(e) => setPlan({ ...plan, pairs: e.target.value })} placeholder="EUR/USD, GBP/USD, XAU/USD..."
              className="input-field" />
          </div>

          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Niveaux cles</h3>
            <textarea value={plan.keyLevels} onChange={(e) => setPlan({ ...plan, keyLevels: e.target.value })} placeholder="Support: 1.0850&#10;Resistance: 1.0920&#10;POI: 1.0880..." rows={4}
              className="input-field resize-none" />
          </div>

          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Notes pre-marche</h3>
            <textarea value={plan.notes} onChange={(e) => setPlan({ ...plan, notes: e.target.value })} placeholder="Contexte macro, catalyseurs, plan d'action..." rows={4}
              className="input-field resize-none" />
          </div>
        </div>

        {/* Right column - Review */}
        <div className="space-y-4">
          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Review post-session</h3>
            <textarea value={plan.review} onChange={(e) => setPlan({ ...plan, review: e.target.value })} placeholder="Comment s'est passee la journee ? Qu'as-tu bien fait ? Que peux-tu ameliorer ?" rows={6}
              className="input-field resize-none" />
          </div>

          {/* Fix #4: Comment du jour textarea */}
          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Comment du jour</h3>
            </div>
            <textarea
              value={commentDuJour}
              onChange={(e) => setCommentDuJour(e.target.value)}
              placeholder="Journal de fin de journee : emotions, lecons, observations personnelles..."
              rows={4}
              className="input-field resize-none"
            />
            <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
              Note personnelle (non sauvegardee en base)
            </p>
          </div>

          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Note de la journee</h3>
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

          {/* Fix #1: Save button always enabled when there's any content */}
          <button onClick={save} disabled={saving || !hasContent}
            className="w-full btn-primary py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="w-5 h-5" />
            {saved ? "Sauvegarde !" : saving ? "Enregistrement..." : !hasContent ? "Ajoutez du contenu" : allChecked || rules.length === 0 ? "Sauvegarder" : `Sauvegarder (checklist ${checkedRules.size}/${rules.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
