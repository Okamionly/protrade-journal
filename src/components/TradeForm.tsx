"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { X, ArrowUp, ArrowDown, Upload, Plus, Save, FolderOpen, Trash2, Pencil, TrendingUp, AlertTriangle, Info, Clock } from "lucide-react";
import { Trade, useTrades } from "@/hooks/useTrades";
import { useStrategies } from "@/hooks/useStrategies";
import { TagPicker } from "@/components/TagPicker";
import { useTranslation } from "@/i18n/context";

interface TradeTemplate {
  id: string;
  name: string;
  asset: string;
  direction: string;
  strategy: string;
  lots: number;
  sl: number;
  tp: number;
  entry?: number;
  emotion?: string;
}

function loadTemplates(): TradeTemplate[] {
  try {
    const raw = localStorage.getItem("trade-templates");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: TradeTemplate[]) {
  localStorage.setItem("trade-templates", JSON.stringify(templates));
}

// ── Emotion config for visual pills ──
interface EmotionOption {
  key: string;
  emoji: string;
  label: string;
  color: string;
  bgActive: string;
  borderActive: string;
}

const EMOTION_OPTIONS: EmotionOption[] = [
  { key: "confident",  emoji: "\u{1F60E}", label: "Confiant",   color: "text-emerald-400", bgActive: "bg-emerald-500/20", borderActive: "border-emerald-500" },
  { key: "neutral",    emoji: "\u{1F610}", label: "Neutre",     color: "text-gray-400",    bgActive: "bg-gray-500/20",    borderActive: "border-gray-500" },
  { key: "stressed",   emoji: "\u{1F630}", label: "Stress\u00e9",    color: "text-amber-400",   bgActive: "bg-amber-500/20",   borderActive: "border-amber-500" },
  { key: "frustrated", emoji: "\u{1F624}", label: "Frustr\u00e9",    color: "text-rose-400",    bgActive: "bg-rose-500/20",    borderActive: "border-rose-500" },
  { key: "euphoric",   emoji: "\u{1F929}", label: "Euphorique", color: "text-purple-400",  bgActive: "bg-purple-500/20",  borderActive: "border-purple-500" },
  { key: "fear",       emoji: "\u{1F631}", label: "Peur",       color: "text-blue-400",    bgActive: "bg-blue-500/20",    borderActive: "border-blue-500" },
  { key: "fomo",       emoji: "\u{1F525}", label: "FOMO",       color: "text-orange-400",  bgActive: "bg-orange-500/20",  borderActive: "border-orange-500" },
  { key: "boredom",    emoji: "\u{1F4A4}", label: "Ennui",      color: "text-gray-500",    bgActive: "bg-gray-600/20",    borderActive: "border-gray-600" },
];

// ── Session detection helper ──
type TradingSession = "Asian" | "London" | "New York";

function detectSession(dateStr: string): TradingSession[] {
  try {
    const d = new Date(dateStr);
    const utcHour = d.getUTCHours();
    const sessions: TradingSession[] = [];
    if (utcHour >= 0 && utcHour < 9) sessions.push("Asian");
    if (utcHour >= 7 && utcHour < 16) sessions.push("London");
    if (utcHour >= 12 && utcHour < 21) sessions.push("New York");
    if (sessions.length === 0) sessions.push("Asian"); // Late night fallback
    return sessions;
  } catch {
    return ["London"];
  }
}

const SESSION_COLORS: Record<TradingSession, string> = {
  "Asian": "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  "London": "bg-blue-500/20 text-blue-400 border-blue-500/40",
  "New York": "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
};

// ── AI Suggestions hook ──
interface AssetSuggestion {
  type: "success" | "warning" | "info";
  message: string;
}

function useAssetSuggestions(asset: string, allTrades: Trade[]): AssetSuggestion[] {
  return useMemo(() => {
    if (!asset || allTrades.length === 0) return [];

    const assetTrades = allTrades.filter((t) => t.asset === asset);
    if (assetTrades.length < 3) return [];

    const suggestions: AssetSuggestion[] = [];

    // Win rate
    const wins = assetTrades.filter((t) => t.result > 0).length;
    const wr = Math.round((wins / assetTrades.length) * 100);
    if (wr >= 60) {
      suggestions.push({
        type: "success",
        message: `Votre WR sur ${asset} est ${wr}% \u2014 continuez !`,
      });
    } else if (wr < 40) {
      suggestions.push({
        type: "warning",
        message: `Attention : WR de ${wr}% sur ${asset} \u2014 revoyez votre strat\u00e9gie`,
      });
    }

    // Day-of-week analysis
    const dayMap: Record<number, { wins: number; total: number }> = {};
    const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    for (const t of assetTrades) {
      const day = new Date(t.date).getDay();
      if (!dayMap[day]) dayMap[day] = { wins: 0, total: 0 };
      dayMap[day].total++;
      if (t.result > 0) dayMap[day].wins++;
    }
    for (const [dayIdx, stats] of Object.entries(dayMap)) {
      if (stats.total >= 3) {
        const dayWr = Math.round((stats.wins / stats.total) * 100);
        if (dayWr < 30) {
          suggestions.push({
            type: "warning",
            message: `Attention : vous perdez souvent le ${dayNames[Number(dayIdx)]} sur cet actif (${dayWr}% WR)`,
          });
        }
      }
    }

    // Average R:R
    const tradesWithRR = assetTrades.filter((t) => t.entry && t.sl && t.tp && t.sl !== t.entry);
    if (tradesWithRR.length >= 3) {
      const avgRR =
        tradesWithRR.reduce((acc, t) => {
          const risk = Math.abs(t.entry - t.sl);
          const reward = Math.abs(t.tp - t.entry);
          return acc + (risk > 0 ? reward / risk : 0);
        }, 0) / tradesWithRR.length;
      if (avgRR > 0) {
        suggestions.push({
          type: avgRR >= 2 ? "success" : "info",
          message: `Votre R:R moyen sur cet actif est ${avgRR.toFixed(1)} ${avgRR < 2 ? "\u2014 visez 2+" : "\u2014 excellent !"}`,
        });
      }
    }

    return suggestions.slice(0, 3);
  }, [asset, allTrades]);
}

// ── Position Calculator ──
interface PositionCalc {
  riskEur: number;
  rewardEur: number | null;
  rr: number | null;
}

function calcPosition(
  entry: number,
  sl: number,
  tp: number | null,
  lots: number,
  direction: string,
  asset: string
): PositionCalc | null {
  if (!entry || !sl || !lots || entry === sl) return null;

  // Pip value estimation: for most forex pairs, 1 standard lot = ~10$/pip
  // For XAU/USD, 1 lot = ~1$/0.01 move = ~100$/pip (pip = 0.1 for gold)
  // For BTC/USD, direct $ per unit
  let pipValue = 10; // default for forex
  let pipSize = 0.0001;
  if (asset?.includes("JPY")) {
    pipSize = 0.01;
    pipValue = 10;
  } else if (asset?.includes("XAU")) {
    pipSize = 0.1;
    pipValue = 10;
  } else if (asset?.includes("BTC")) {
    pipSize = 1;
    pipValue = 1;
  }

  const riskPips = Math.abs(entry - sl) / pipSize;
  const riskEur = riskPips * pipValue * lots;

  let rewardEur: number | null = null;
  let rr: number | null = null;

  if (tp && tp !== entry) {
    const rewardPips = Math.abs(tp - entry) / pipSize;
    rewardEur = rewardPips * pipValue * lots;
    rr = riskPips > 0 ? rewardPips / riskPips : null;
  }

  return { riskEur, rewardEur, rr };
}

interface TradeFormProps {
  onSubmit: (trade: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
  editTrade?: Trade | null;
}

const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "USD/CHF", "AUD/USD", "NZD/USD", "USD/CAD", "EUR/GBP", "EUR/JPY", "GBP/JPY"];
const FALLBACK_STRATEGIES = ["Breakout", "Retracement", "Support/Resistance", "Trend Following", "Scalping"];

export function TradeForm({ onSubmit, onClose, editTrade }: TradeFormProps) {
  const { strategies } = useStrategies();
  const { trades: allTrades } = useTrades();
  const { t } = useTranslation();
  const [direction, setDirection] = useState(editTrade?.direction || "LONG");
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [showNewStrategy, setShowNewStrategy] = useState(false);
  const [newStratName, setNewStratName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    editTrade?.tags ? editTrade.tags.split(",").map((tg) => tg.trim()).filter(Boolean) : []
  );

  // Smart feature state
  const [selectedAsset, setSelectedAsset] = useState(editTrade?.asset || ASSETS[0]);
  const [selectedEmotion, setSelectedEmotion] = useState<string>(
    editTrade?.emotion || "Confiant"
  );
  const [entryVal, setEntryVal] = useState<number>(editTrade?.entry || 0);
  const [slVal, setSlVal] = useState<number>(editTrade?.sl || 0);
  const [tpVal, setTpVal] = useState<number>(editTrade?.tp || 0);
  const [lotsVal, setLotsVal] = useState<number>(editTrade?.lots || 0);
  const [dateVal, setDateVal] = useState<string>(
    editTrade ? new Date(editTrade.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [detectedSessions, setDetectedSessions] = useState<TradingSession[]>([]);
  const [sessionOverride, setSessionOverride] = useState<string | null>(null);

  // Template state
  const [templates, setTemplates] = useState<TradeTemplate[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // AI suggestions
  const suggestions = useAssetSuggestions(selectedAsset, allTrades);

  // Position calculator
  const posCalc = useMemo(
    () => calcPosition(entryVal, slVal, tpVal || null, lotsVal, direction, selectedAsset),
    [entryVal, slVal, tpVal, lotsVal, direction, selectedAsset]
  );

  // Session auto-detection
  useEffect(() => {
    if (dateVal) {
      setDetectedSessions(detectSession(dateVal));
      setSessionOverride(null);
    }
  }, [dateVal]);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  // Map existing emotion value to our new pill system
  useEffect(() => {
    if (editTrade?.emotion) {
      // Try to match by label
      const match = EMOTION_OPTIONS.find(
        (e) => e.label.toLowerCase() === editTrade.emotion?.toLowerCase()
      );
      if (match) {
        setSelectedEmotion(match.label);
      } else {
        setSelectedEmotion(editTrade.emotion);
      }
    }
  }, [editTrade]);

  const handleSaveTemplate = () => {
    if (!formRef.current || !templateName.trim()) return;
    const form = new FormData(formRef.current);
    const tpl: TradeTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      asset: form.get("asset") as string,
      direction,
      strategy: form.get("strategy") as string,
      lots: parseFloat(form.get("lots") as string) || 0,
      sl: parseFloat(form.get("sl") as string) || 0,
      tp: parseFloat(form.get("tp") as string) || 0,
      entry: parseFloat(form.get("entry") as string) || undefined,
      emotion: selectedEmotion || undefined,
    };
    const updated = [...templates, tpl];
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateName("");
  };

  const handleLoadTemplate = (tplId: string) => {
    const tpl = templates.find((tp) => tp.id === tplId);
    if (!tpl || !formRef.current) return;
    const form = formRef.current;
    const setVal = (name: string, value: string | number) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (el) el.value = String(value);
    };
    setVal("asset", tpl.asset);
    setSelectedAsset(tpl.asset);
    setDirection(tpl.direction);
    setVal("strategy", tpl.strategy);
    setVal("lots", tpl.lots);
    setLotsVal(tpl.lots);
    setVal("sl", tpl.sl);
    setSlVal(tpl.sl);
    setVal("tp", tpl.tp);
    setTpVal(tpl.tp);
    if (tpl.entry) { setVal("entry", tpl.entry); setEntryVal(tpl.entry); }
    if (tpl.emotion) setSelectedEmotion(tpl.emotion);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((tp) => tp.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  };

  const handleRenameTemplate = (id: string) => {
    if (!renameValue.trim()) return;
    const updated = templates.map((tp) => tp.id === id ? { ...tp, name: renameValue.trim() } : tp);
    setTemplates(updated);
    saveTemplates(updated);
    setRenamingId(null);
    setRenameValue("");
  };

  const strategyNames = strategies.length > 0
    ? strategies.map((s) => s.name)
    : FALLBACK_STRATEGIES;

  useEffect(() => {
    if (editTrade?.screenshots?.length) {
      setScreenshots(editTrade.screenshots.map((s) => s.url));
    }
  }, [editTrade]);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setScreenshots((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateStrategy = async () => {
    if (!newStratName.trim()) return;
    try {
      await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStratName.trim() }),
      });
      setNewStratName("");
      setShowNewStrategy(false);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const trade = {
      date: form.get("date"),
      asset: form.get("asset"),
      direction,
      strategy: form.get("strategy"),
      entry: parseFloat(form.get("entry") as string),
      exit: parseFloat(form.get("exit") as string) || null,
      sl: parseFloat(form.get("sl") as string),
      tp: parseFloat(form.get("tp") as string),
      lots: parseFloat(form.get("lots") as string),
      result: parseFloat(form.get("result") as string) || 0,
      commission: parseFloat(form.get("commission") as string) || 0,
      swap: parseFloat(form.get("swap") as string) || 0,
      maePrice: parseFloat(form.get("maePrice") as string) || null,
      mfePrice: parseFloat(form.get("mfePrice") as string) || null,
      emotion: selectedEmotion,
      setup: form.get("setup"),
      tags: selectedTags.join(", "),
      screenshots,
    };

    const ok = await onSubmit(trade);
    setLoading(false);
    if (ok) onClose();
  };

  const formatDateTimeLocal = (date: string) => {
    return new Date(date).toISOString().slice(0, 16);
  };

  const handleSessionToggle = useCallback((session: TradingSession) => {
    setSessionOverride((prev) => (prev === session ? null : session));
  }, []);

  const rrColorClass = posCalc?.rr != null
    ? posCalc.rr >= 2
      ? "text-emerald-400"
      : posCalc.rr >= 1
        ? "text-amber-400"
        : "text-rose-400"
    : "text-gray-400";

  const rrBorderClass = posCalc?.rr != null
    ? posCalc.rr >= 2
      ? "border-emerald-500/40"
      : posCalc.rr >= 1
        ? "border-amber-500/40"
        : "border-rose-500/40"
    : "border-[var(--border)]";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {editTrade ? t("editTrade") : t("newTradeTitle")}
          </h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }} className="hover:opacity-80">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Template controls */}
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                <FolderOpen className="w-3 h-3 inline mr-1" />
                Charger un template
              </label>
              <select
                onChange={(e) => { if (e.target.value) handleLoadTemplate(e.target.value); e.target.value = ""; }}
                className="input-field text-sm"
                defaultValue=""
              >
                <option value="" disabled>-- S\u00e9lectionner --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                <Save className="w-3 h-3 inline mr-1" />
                Sauvegarder comme template
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="input-field text-sm flex-1"
                  placeholder="Nom du template..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSaveTemplate())}
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium btn-primary text-white disabled:opacity-40 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {templates.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTemplateManager(!showTemplateManager)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                G\u00e9rer ({templates.length})
              </button>
            )}
          </div>

          {/* Template manager */}
          {showTemplateManager && templates.length > 0 && (
            <div className="p-4 rounded-xl space-y-2" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <h4 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>G\u00e9rer les templates</h4>
              {templates.map((tpl) => (
                <div key={tpl.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                  {renamingId === tpl.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="input-field text-sm flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleRenameTemplate(tpl.id)}
                        autoFocus
                      />
                      <button type="button" onClick={() => handleRenameTemplate(tpl.id)} className="text-emerald-400 hover:text-emerald-300 text-xs">OK</button>
                      <button type="button" onClick={() => setRenamingId(null)} className="text-[--text-muted] hover:text-[--text-primary] text-xs">Annuler</button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{tpl.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">{tpl.asset}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${tpl.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>{tpl.direction}</span>
                      <button type="button" onClick={() => { setRenamingId(tpl.id); setRenameValue(tpl.name); }} className="text-blue-400 hover:text-blue-300">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDeleteTemplate(tpl.id)} className="text-rose-400 hover:text-rose-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Date / Asset row ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("dateTime")}</label>
              <input
                type="datetime-local"
                name="date"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                className="input-field"
                required
              />
              {/* ── Session Auto-Detection badges ── */}
              {detectedSessions.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Session :</span>
                  {detectedSessions.map((session) => (
                    <button
                      key={session}
                      type="button"
                      onClick={() => handleSessionToggle(session)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition cursor-pointer ${
                        sessionOverride === null || sessionOverride === session
                          ? SESSION_COLORS[session]
                          : "opacity-40 border-transparent text-gray-500"
                      } ${sessionOverride === session ? "ring-1 ring-offset-1 ring-offset-transparent" : ""}`}
                    >
                      {session}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("asset")}</label>
              <select
                name="asset"
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="input-field"
              >
                {ASSETS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>

              {/* ── AI-Powered Suggestions ── */}
              {suggestions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
                      style={{
                        background:
                          s.type === "success"
                            ? "rgba(16,185,129,0.1)"
                            : s.type === "warning"
                              ? "rgba(245,158,11,0.1)"
                              : "rgba(59,130,246,0.1)",
                        border: `1px solid ${
                          s.type === "success"
                            ? "rgba(16,185,129,0.3)"
                            : s.type === "warning"
                              ? "rgba(245,158,11,0.3)"
                              : "rgba(59,130,246,0.3)"
                        }`,
                      }}
                    >
                      {s.type === "success" && <TrendingUp className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />}
                      {s.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />}
                      {s.type === "info" && <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />}
                      <span
                        style={{
                          color:
                            s.type === "success"
                              ? "rgb(52,211,153)"
                              : s.type === "warning"
                                ? "rgb(251,191,36)"
                                : "rgb(96,165,250)",
                        }}
                      >
                        {s.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("direction")}</label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDirection("LONG")}
                  className={`flex-1 py-2 rounded-lg border transition flex items-center justify-center ${
                    direction === "LONG"
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  <ArrowUp className="w-4 h-4 mr-2" />
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("SHORT")}
                  className={`flex-1 py-2 rounded-lg border transition flex items-center justify-center ${
                    direction === "SHORT"
                      ? "border-rose-500 bg-rose-500/20 text-rose-400 ring-2 ring-rose-500"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  }`}
                >
                  <ArrowDown className="w-4 h-4 mr-2" />
                  SHORT
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("strategy")}</label>
              <div className="flex gap-2">
                <select name="strategy" defaultValue={editTrade?.strategy || strategyNames[0]} className="input-field flex-1">
                  {strategyNames.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewStrategy(!showNewStrategy)}
                  className="p-2 rounded-xl hover:bg-blue-500/10 transition"
                  style={{ border: "1px solid var(--border-input)", color: "var(--text-muted)" }}
                  title={t("newStrategy")}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {showNewStrategy && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={newStratName}
                    onChange={(e) => setNewStratName(e.target.value)}
                    className="input-field flex-1"
                    placeholder={t("strategyName")}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateStrategy())}
                  />
                  <button type="button" onClick={handleCreateStrategy} className="btn-primary text-white px-3 py-1 rounded-lg text-sm">
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("entryPrice")}</label>
              <input
                type="number"
                step="0.00001"
                name="entry"
                value={entryVal || ""}
                onChange={(e) => setEntryVal(parseFloat(e.target.value) || 0)}
                className="input-field mono"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("stopLoss")}</label>
              <input
                type="number"
                step="0.00001"
                name="sl"
                value={slVal || ""}
                onChange={(e) => setSlVal(parseFloat(e.target.value) || 0)}
                className="input-field mono"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("takeProfit")}</label>
              <input
                type="number"
                step="0.00001"
                name="tp"
                value={tpVal || ""}
                onChange={(e) => setTpVal(parseFloat(e.target.value) || 0)}
                className="input-field mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("lotSize")}</label>
              <input
                type="number"
                step="0.01"
                name="lots"
                value={lotsVal || ""}
                onChange={(e) => setLotsVal(parseFloat(e.target.value) || 0)}
                className="input-field mono"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("exitPrice")}</label>
              <input type="number" step="0.00001" name="exit" defaultValue={editTrade?.exit ?? undefined} className="input-field mono" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("resultEur")}</label>
              <input type="number" step="0.01" name="result" defaultValue={editTrade?.result} className="input-field mono" required />
            </div>
          </div>

          {/* ── Quick Position Calculator ── */}
          {posCalc && (entryVal > 0 && slVal > 0 && lotsVal > 0) && (
            <div
              className={`p-4 rounded-xl border ${rrBorderClass}`}
              style={{ background: "var(--bg-secondary)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Calculateur de position
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Risque</div>
                  <div className="text-lg font-bold mono text-rose-400">
                    {posCalc.riskEur.toFixed(2)} \u20ac
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>R\u00e9compense</div>
                  <div className="text-lg font-bold mono text-emerald-400">
                    {posCalc.rewardEur != null ? `${posCalc.rewardEur.toFixed(2)} \u20ac` : "\u2014"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>R:R</div>
                  <div className={`text-lg font-bold mono ${rrColorClass}`}>
                    {posCalc.rr != null ? `1:${posCalc.rr.toFixed(2)}` : "\u2014"}
                  </div>
                  {posCalc.rr != null && (
                    <div className={`text-xs mt-0.5 ${rrColorClass}`}>
                      {posCalc.rr >= 2 ? "Excellent" : posCalc.rr >= 1 ? "Acceptable" : "Risqu\u00e9"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Commission, Swap, MAE, MFE */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("commissionEur")}</label>
              <input type="number" step="0.01" name="commission" defaultValue={0} className="input-field mono" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("swapEur")}</label>
              <input type="number" step="0.01" name="swap" defaultValue={0} className="input-field mono" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("maePrice")}</label>
              <input type="number" step="0.00001" name="maePrice" className="input-field mono" placeholder="Optionnel" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("mfePrice")}</label>
              <input type="number" step="0.00001" name="mfePrice" className="input-field mono" placeholder="Optionnel" />
            </div>
          </div>

          <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{t("setupScreenshots")}</label>
            <div
              className={`screenshot-preview rounded-xl p-8 text-center cursor-pointer ${screenshots.length > 0 ? "has-image" : ""}`}
              onClick={() => document.getElementById("screenshotInput")?.click()}
            >
              <input type="file" id="screenshotInput" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} />
              {screenshots.length === 0 ? (
                <div>
                  <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("clickToAddScreenshots")}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{t("imageFormats")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {screenshots.map((src, i) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScreenshots((prev) => prev.filter((_, idx) => idx !== i));
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("setupDescription")}</label>
            <textarea name="setup" rows={3} defaultValue={editTrade?.setup || ""} className="input-field" placeholder={t("describeAnalysis")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ── Emotion Visual Pills ── */}
            <div>
              <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{t("emotionPsychology")}</label>
              {/* Hidden input to carry the selected emotion in the form */}
              <input type="hidden" name="emotion" value={selectedEmotion} />
              <div className="flex flex-wrap gap-2">
                {EMOTION_OPTIONS.map((opt) => {
                  const isActive = selectedEmotion === opt.label;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedEmotion(opt.label)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                        border transition-all duration-150 cursor-pointer
                        ${isActive
                          ? `${opt.bgActive} ${opt.borderActive} ${opt.color} ring-1 ring-offset-1 ring-offset-transparent`
                          : "border-[var(--border)] hover:border-[var(--text-muted)]"
                        }
                      `}
                      style={!isActive ? { color: "var(--text-muted)", background: "var(--bg-secondary)" } : undefined}
                    >
                      <span className="text-base leading-none">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("tags")}</label>
              <TagPicker selected={selectedTags} onChange={setSelectedTags} />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg transition" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {t("cancel")}
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-lg btn-primary text-white font-medium disabled:opacity-50">
              {loading ? t("saving") : editTrade ? t("saveChanges") : t("saveTrade")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
