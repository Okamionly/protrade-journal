"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useTrades, useUser } from "@/hooks/useTrades";
import { Chart, registerables } from "chart.js";
import {
  AlertOctagon,
  TrendingDown,
  Lightbulb,
  Flame,
  Zap,
  ShieldOff,
  ShieldAlert,
  ScaleIcon,
  Timer,
  LogOut,
  BarChart3,
  TrendingUp,
  BookOpen,
  Save,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { useTheme } from "next-themes";

Chart.register(...registerables);

// ---- Types ----
interface MistakeCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  tip: string;
  autoDetect: boolean;
}

interface DetectedMistake {
  categoryId: string;
  tradeIds: string[];
  count: number;
  impactPnl: number;
  severity: "high" | "medium" | "low";
  description: string;
  date?: string;
}

interface WeeklyTrend {
  week: string;
  count: number;
}

// ---- Constants ----
const SEVERITY_CONFIG = {
  high: { label: "Critique", color: "#ef4444", bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
  medium: { label: "Important", color: "#f59e0b", bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  low: { label: "Mineur", color: "#eab308", bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30" },
};

const DEFAULT_OVERTRADING_THRESHOLD = 5;
const DEFAULT_RISK_PERCENT = 2;

export default function MistakesPage() {
  const { t } = useTranslation();
  const { trades, loading } = useTrades();
  const { user } = useUser();
  const { theme } = useTheme();

  // Settings
  const [overtradingThreshold, setOvertradingThreshold] = useState(DEFAULT_OVERTRADING_THRESHOLD);
  const [riskPercent, setRiskPercent] = useState(DEFAULT_RISK_PERCENT);
  const [showSettings, setShowSettings] = useState(false);

  // Manual tags stored in localStorage
  const [manualTags, setManualTags] = useState<Record<string, string[]>>({});
  const [lessons, setLessons] = useState<Record<string, string>>({});
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mistakes-manual-tags");
      if (saved) setManualTags(JSON.parse(saved));
      const savedLessons = localStorage.getItem("mistakes-lessons");
      if (savedLessons) setLessons(JSON.parse(savedLessons));
      const savedThreshold = localStorage.getItem("mistakes-overtrading-threshold");
      if (savedThreshold) setOvertradingThreshold(parseInt(savedThreshold));
      const savedRisk = localStorage.getItem("mistakes-risk-percent");
      if (savedRisk) setRiskPercent(parseFloat(savedRisk));
    } catch { /* ignore */ }
  }, []);

  // Save settings
  const saveSettings = useCallback(() => {
    localStorage.setItem("mistakes-overtrading-threshold", String(overtradingThreshold));
    localStorage.setItem("mistakes-risk-percent", String(riskPercent));
  }, [overtradingThreshold, riskPercent]);

  useEffect(() => { saveSettings(); }, [saveSettings]);

  // Categories definition
  const categories: MistakeCategory[] = useMemo(() => [
    {
      id: "revenge",
      label: "Revenge Trading",
      icon: <Flame className="w-5 h-5 text-rose-400" />,
      tip: t("tipRevengTrading"),
      autoDetect: true,
    },
    {
      id: "overtrading",
      label: "Overtrading",
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      tip: t("tipOvertrading"),
      autoDetect: true,
    },
    {
      id: "moving-sl",
      label: "SL deplace",
      icon: <ShieldAlert className="w-5 h-5 text-orange-400" />,
      tip: t("tipStopNotRespected"),
      autoDetect: false,
    },
    {
      id: "no-sl",
      label: "Pas de SL",
      icon: <ShieldOff className="w-5 h-5 text-red-500" />,
      tip: "Placez toujours un Stop Loss avant d'entrer en position. Aucune exception.",
      autoDetect: true,
    },
    {
      id: "oversizing",
      label: "Surexposition",
      icon: <ScaleIcon className="w-5 h-5 text-purple-400" />,
      tip: `Ne risquez jamais plus de ${riskPercent}% de votre capital par trade. Respectez votre money management.`,
      autoDetect: true,
    },
    {
      id: "fomo",
      label: "Entree FOMO",
      icon: <Timer className="w-5 h-5 text-cyan-400" />,
      tip: "Attendez toujours une confirmation avant d'entrer. Un trade manque vaut mieux qu'un trade en FOMO.",
      autoDetect: false,
    },
    {
      id: "early-exit",
      label: "Sortie prematuree",
      icon: <LogOut className="w-5 h-5 text-blue-400" />,
      tip: t("tipEarlyExit"),
      autoDetect: true,
    },
  ], [t, riskPercent]);

  // ---- Auto-detection engine ----
  const detectedMistakes = useMemo(() => {
    if (!trades.length) return [];

    const mistakes: DetectedMistake[] = [];
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. Revenge Trading: 2+ losses on same symbol within 1 hour
    const byAsset: Record<string, typeof trades> = {};
    sorted.forEach((t2) => {
      if (!byAsset[t2.asset]) byAsset[t2.asset] = [];
      byAsset[t2.asset].push(t2);
    });

    let revengeCount = 0;
    let revengeImpact = 0;
    const revengeIds: string[] = [];

    Object.values(byAsset).forEach((assetTrades) => {
      for (let i = 1; i < assetTrades.length; i++) {
        const prev = assetTrades[i - 1];
        const curr = assetTrades[i];
        const diffMin = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / 60000;
        if (prev.result < 0 && curr.result < 0 && diffMin <= 60) {
          revengeCount++;
          revengeImpact += curr.result;
          revengeIds.push(curr.id);
        }
      }
    });

    if (revengeCount > 0) {
      mistakes.push({
        categoryId: "revenge",
        tradeIds: revengeIds,
        count: revengeCount,
        impactPnl: revengeImpact,
        severity: "high",
        description: `${revengeCount} trade(s) perdant(s) sur le meme actif en moins d'1h`,
      });
    }

    // 2. Overtrading: more than threshold trades per day
    const tradeDays: Record<string, typeof trades> = {};
    sorted.forEach((t2) => {
      const day = t2.date.slice(0, 10);
      if (!tradeDays[day]) tradeDays[day] = [];
      tradeDays[day].push(t2);
    });
    const overtradeDays = Object.entries(tradeDays).filter(([, ts]) => ts.length > overtradingThreshold);
    if (overtradeDays.length > 0) {
      const impact = overtradeDays.reduce(
        (s, [, ts]) => s + ts.slice(overtradingThreshold).reduce((ss, t2) => ss + t2.result, 0),
        0
      );
      const ids = overtradeDays.flatMap(([, ts]) => ts.slice(overtradingThreshold).map((t2) => t2.id));
      mistakes.push({
        categoryId: "overtrading",
        tradeIds: ids,
        count: overtradeDays.length,
        impactPnl: impact,
        severity: "medium",
        description: `${overtradeDays.length} jour(s) avec +${overtradingThreshold} trades`,
      });
    }

    // 3. No SL set: trades where sl is 0 or undefined
    const noSlTrades = trades.filter((t2) => !t2.sl || t2.sl === 0);
    if (noSlTrades.length > 0) {
      mistakes.push({
        categoryId: "no-sl",
        tradeIds: noSlTrades.map((t2) => t2.id),
        count: noSlTrades.length,
        impactPnl: noSlTrades.reduce((s, t2) => s + (t2.result < 0 ? t2.result : 0), 0),
        severity: "high",
        description: `${noSlTrades.length} trade(s) sans Stop Loss defini`,
      });
    }

    // 4. Oversizing: risk > X% of capital
    const capital = user?.balance || 10000;
    const maxRisk = capital * (riskPercent / 100);
    const oversizedTrades = trades.filter((t2) => {
      if (!t2.sl || t2.sl === 0) return false;
      const riskPerTrade = Math.abs(t2.entry - t2.sl) * t2.lots;
      return riskPerTrade > maxRisk;
    });
    if (oversizedTrades.length > 0) {
      mistakes.push({
        categoryId: "oversizing",
        tradeIds: oversizedTrades.map((t2) => t2.id),
        count: oversizedTrades.length,
        impactPnl: oversizedTrades.reduce((s, t2) => s + (t2.result < 0 ? t2.result : 0), 0),
        severity: "high",
        description: `${oversizedTrades.length} trade(s) avec risque > ${riskPercent}% du capital`,
      });
    }

    // 5. Early exit: profitable trades closed at < 50% of TP potential
    const earlyExits = trades.filter((t2) => {
      if (!t2.exit || t2.result <= 0 || !t2.tp) return false;
      const potential = Math.abs(t2.tp - t2.entry);
      const actual = Math.abs(t2.exit - t2.entry);
      return potential > 0 && actual < potential * 0.5;
    });
    if (earlyExits.length > 0) {
      const missedProfit = earlyExits.reduce((s, t2) => {
        const potential = Math.abs(t2.tp - t2.entry) * t2.lots;
        return s + (potential - t2.result);
      }, 0);
      mistakes.push({
        categoryId: "early-exit",
        tradeIds: earlyExits.map((t2) => t2.id),
        count: earlyExits.length,
        impactPnl: -missedProfit,
        severity: "low",
        description: `${earlyExits.length} gain(s) coupe(s) avant 50% du TP`,
      });
    }

    // 6. Manual tags: FOMO and Moving SL from localStorage
    const fomoIds = manualTags["fomo"] || [];
    const fomoTrades = trades.filter((t2) => fomoIds.includes(t2.id));
    if (fomoTrades.length > 0) {
      mistakes.push({
        categoryId: "fomo",
        tradeIds: fomoIds,
        count: fomoTrades.length,
        impactPnl: fomoTrades.reduce((s, t2) => s + t2.result, 0),
        severity: "medium",
        description: `${fomoTrades.length} entree(s) FOMO identifiee(s)`,
      });
    }

    const movingSlIds = manualTags["moving-sl"] || [];
    const movingSlTrades = trades.filter((t2) => movingSlIds.includes(t2.id));
    if (movingSlTrades.length > 0) {
      mistakes.push({
        categoryId: "moving-sl",
        tradeIds: movingSlIds,
        count: movingSlTrades.length,
        impactPnl: movingSlTrades.reduce((s, t2) => s + (t2.result < 0 ? t2.result : 0), 0),
        severity: "high",
        description: `${movingSlTrades.length} SL deplace(s) contre le trade`,
      });
    }

    return mistakes.sort((a, b) => {
      const sev = { high: 3, medium: 2, low: 1 };
      return sev[b.severity] - sev[a.severity];
    });
  }, [trades, overtradingThreshold, riskPercent, manualTags, user?.balance]);

  // ---- Stats ----
  const totalImpact = detectedMistakes.reduce((s, m) => s + m.impactPnl, 0);
  const criticalCount = detectedMistakes.filter((m) => m.severity === "high").length;

  // ---- Category frequency data for bar chart (last 30 days) ----
  const categoryFrequency = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentTrades = trades.filter((t2) => new Date(t2.date) >= thirtyDaysAgo);

    if (!recentTrades.length) return [];

    const counts: Record<string, number> = {};
    categories.forEach((c) => (counts[c.id] = 0));

    detectedMistakes.forEach((m) => {
      const recentIds = m.tradeIds.filter((id) => {
        const trade = trades.find((t2) => t2.id === id);
        return trade && new Date(trade.date) >= thirtyDaysAgo;
      });
      counts[m.categoryId] = (counts[m.categoryId] || 0) + recentIds.length;
    });

    return categories
      .map((c) => ({ id: c.id, label: c.label, count: counts[c.id] || 0 }))
      .filter((c) => c.count > 0);
  }, [trades, detectedMistakes, categories]);

  // ---- Weekly trend data ----
  const weeklyTrend = useMemo((): WeeklyTrend[] => {
    if (!trades.length) return [];

    const weeks: Record<string, number> = {};
    const now = new Date();

    // Get last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const key = `S${getWeekNumber(weekStart)}`;
      weeks[key] = 0;
    }

    detectedMistakes.forEach((m) => {
      m.tradeIds.forEach((id) => {
        const trade = trades.find((t2) => t2.id === id);
        if (trade) {
          const key = `S${getWeekNumber(new Date(trade.date))}`;
          if (key in weeks) weeks[key]++;
        }
      });
    });

    return Object.entries(weeks).map(([week, count]) => ({ week, count }));
  }, [trades, detectedMistakes]);

  // ---- Chart refs ----
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstance = useRef<Chart | null>(null);
  const trendChartRef = useRef<HTMLCanvasElement>(null);
  const trendChartInstance = useRef<Chart | null>(null);

  // Bar chart: category frequency
  useEffect(() => {
    if (!barChartRef.current || !categoryFrequency.length) return;
    if (barChartInstance.current) barChartInstance.current.destroy();

    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";

    const colors = categoryFrequency.map((c) => {
      const cat = categories.find((cat2) => cat2.id === c.id);
      if (!cat) return "#6366f1";
      if (c.id === "revenge") return "#ef4444";
      if (c.id === "overtrading") return "#f59e0b";
      if (c.id === "no-sl") return "#ef4444";
      if (c.id === "oversizing") return "#a855f7";
      if (c.id === "fomo") return "#06b6d4";
      if (c.id === "early-exit") return "#3b82f6";
      if (c.id === "moving-sl") return "#f97316";
      return "#6366f1";
    });

    barChartInstance.current = new Chart(barChartRef.current, {
      type: "bar",
      data: {
        labels: categoryFrequency.map((c) => c.label),
        datasets: [{
          data: categoryFrequency.map((c) => c.count),
          backgroundColor: colors.map((c) => c + "33"),
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor, stepSize: 1 },
            grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
          },
          x: {
            ticks: { color: textColor, font: { size: 10 } },
            grid: { display: false },
          },
        },
      },
    });

    return () => { barChartInstance.current?.destroy(); };
  }, [categoryFrequency, theme, categories]);

  // Trend chart: weekly improvement
  useEffect(() => {
    if (!trendChartRef.current || !weeklyTrend.length) return;
    if (trendChartInstance.current) trendChartInstance.current.destroy();

    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";

    trendChartInstance.current = new Chart(trendChartRef.current, {
      type: "line",
      data: {
        labels: weeklyTrend.map((w) => w.week),
        datasets: [{
          data: weeklyTrend.map((w) => w.count),
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#8b5cf6",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor, stepSize: 1 },
            grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
          },
          x: {
            ticks: { color: textColor, font: { size: 10 } },
            grid: { display: false },
          },
        },
      },
    });

    return () => { trendChartInstance.current?.destroy(); };
  }, [weeklyTrend, theme]);

  // ---- Lessons handlers ----
  const saveLesson = (categoryId: string, text: string) => {
    const updated = { ...lessons, [categoryId]: text };
    setLessons(updated);
    localStorage.setItem("mistakes-lessons", JSON.stringify(updated));
  };

  // ---- Loading ----
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <AlertOctagon className="w-6 h-6 text-rose-400" /> {t("errorDetection")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {t("errorDetectionDesc")}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="metric-card rounded-xl p-2.5 hover:brightness-125 transition-all"
        >
          <Settings className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="metric-card rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Settings className="w-4 h-4" /> Parametres de detection
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Seuil overtrading (trades/jour)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={overtradingThreshold}
                onChange={(e) => setOvertradingThreshold(parseInt(e.target.value) || 5)}
                className="w-full mt-1 rounded-lg px-3 py-2 text-sm glass"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Risque max (% du capital)
              </label>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 2)}
                className="w-full mt-1 rounded-lg px-3 py-2 text-sm glass"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>
        </div>
      )}

      {trades.length === 0 ? (
        <div className="metric-card rounded-2xl p-12 text-center">
          <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>{t("noTradesToAnalyze")}</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{t("addTradesToDetect")}</p>
        </div>
      ) : detectedMistakes.length === 0 ? (
        <div className="metric-card rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-lg font-bold" style={{ color: "#10b981" }}>{t("noErrorsDetected")}</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{t("followingRules")}</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="metric-card rounded-2xl p-5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("errorsDetected")}</span>
              <div className="text-3xl font-bold text-rose-400 mt-1">{detectedMistakes.reduce((s, m) => s + m.count, 0)}</div>
            </div>
            <div className="metric-card rounded-2xl p-5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("totalImpact")}</span>
              <div className="text-3xl font-bold mono mt-1" style={{ color: totalImpact >= 0 ? "#f59e0b" : "#ef4444" }}>
                {totalImpact >= 0 ? "+" : ""}{totalImpact.toFixed(2)}&euro;
              </div>
            </div>
            <div className="metric-card rounded-2xl p-5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("criticalErrors")}</span>
              <div className="text-3xl font-bold mt-1" style={{ color: criticalCount > 0 ? "#ef4444" : "#10b981" }}>
                {criticalCount}
              </div>
            </div>
            <div className="metric-card rounded-2xl p-5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Categories touchees</span>
              <div className="text-3xl font-bold mt-1" style={{ color: "#8b5cf6" }}>
                {detectedMistakes.length}
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar chart: frequency by category (30 days) */}
            <div className="metric-card rounded-2xl p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
                <BarChart3 className="w-4 h-4 text-rose-400" /> Frequence par categorie (30j)
              </h3>
              {categoryFrequency.length > 0 ? (
                <div style={{ height: 220 }}>
                  <canvas ref={barChartRef} />
                </div>
              ) : (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  Aucune erreur dans les 30 derniers jours
                </p>
              )}
            </div>

            {/* Trend chart: improvement tracker */}
            <div className="metric-card rounded-2xl p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
                <TrendingUp className="w-4 h-4 text-purple-400" /> Tendance d&apos;amelioration (8 semaines)
              </h3>
              {weeklyTrend.some((w) => w.count > 0) ? (
                <div style={{ height: 220 }}>
                  <canvas ref={trendChartRef} />
                </div>
              ) : (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  Pas assez de donnees pour afficher la tendance
                </p>
              )}
            </div>
          </div>

          {/* Cost of mistakes breakdown */}
          <div className="metric-card rounded-2xl p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
              <TrendingDown className="w-4 h-4 text-rose-400" /> Cout des erreurs par categorie
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {detectedMistakes.map((m) => {
                const cat = categories.find((c) => c.id === m.categoryId);
                if (!cat) return null;
                return (
                  <div key={m.categoryId} className="glass rounded-xl p-3 text-center">
                    <div className="flex justify-center mb-2">{cat.icon}</div>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                      {cat.label}
                    </div>
                    <div
                      className="text-lg font-bold mono"
                      style={{ color: m.impactPnl >= 0 ? "#f59e0b" : "#ef4444" }}
                    >
                      {m.impactPnl >= 0 ? "+" : ""}{m.impactPnl.toFixed(0)}&euro;
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {m.count} {m.count > 1 ? t("occurrences") : t("occurrence")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed mistake cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Detail des erreurs detectees
            </h3>
            {detectedMistakes.map((m) => {
              const cat = categories.find((c) => c.id === m.categoryId);
              if (!cat) return null;
              const sevConfig = SEVERITY_CONFIG[m.severity];

              return (
                <div key={m.categoryId} className="metric-card rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl glass flex-shrink-0">{cat.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>{cat.label}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${sevConfig.bg} ${sevConfig.text} border ${sevConfig.border}`}
                        >
                          {sevConfig.label}
                        </span>
                        {!cat.autoDetect && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                            Manuel
                          </span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{m.description}</p>
                      <div className="flex items-center gap-6 mt-3">
                        <div className="flex items-center gap-1.5">
                          <TrendingDown className="w-4 h-4 text-rose-400" />
                          <span
                            className="text-sm font-bold mono"
                            style={{ color: m.impactPnl >= 0 ? "#f59e0b" : "#ef4444" }}
                          >
                            {m.impactPnl >= 0 ? "+" : ""}{m.impactPnl.toFixed(2)}&euro;
                          </span>
                        </div>
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {m.count} {m.count > 1 ? t("occurrences") : t("occurrence")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tip */}
                  <div className="mt-4 rounded-xl p-3 flex items-start gap-2" style={{ background: "var(--bg-hover)" }}>
                    <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{cat.tip}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lecons apprises section */}
          <div className="metric-card rounded-2xl p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
              <BookOpen className="w-4 h-4 text-emerald-400" /> Lecons apprises
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Ecrivez vos reflexions et lecons pour chaque categorie d&apos;erreur. Sauvegarde automatique.
            </p>
            <div className="space-y-3">
              {categories.map((cat) => {
                const isExpanded = expandedLesson === cat.id;
                const hasLesson = !!lessons[cat.id]?.trim();

                return (
                  <div key={cat.id} className="glass rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedLesson(isExpanded ? null : cat.id)}
                      className="w-full flex items-center gap-3 p-3 hover:brightness-125 transition-all"
                    >
                      {cat.icon}
                      <span className="text-sm font-medium flex-1 text-left" style={{ color: "var(--text-primary)" }}>
                        {cat.label}
                      </span>
                      {hasLesson && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Rempli
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      ) : (
                        <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <textarea
                          value={lessons[cat.id] || ""}
                          onChange={(e) => saveLesson(cat.id, e.target.value)}
                          placeholder={`Qu'avez-vous appris concernant "${cat.label}" ? Quelles actions correctives ?`}
                          rows={3}
                          className="w-full rounded-lg px-3 py-2 text-sm glass resize-none"
                          style={{ color: "var(--text-primary)" }}
                        />
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Save className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            Sauvegarde automatique (localStorage)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Helpers ----
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
