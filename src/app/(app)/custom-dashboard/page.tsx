"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import { useTranslation } from "@/i18n/context";
import {
  LayoutDashboard,
  Settings2,
  X,
  TrendingUp,
  Target,
  DollarSign,
  List,
  CalendarDays,
  Flame,
  BarChart3,
  Globe,
  Activity,
  Compass,
  Trophy,
  MessageSquare,
  Plus,
  RotateCcw,
  Lock,
  Crown,
  Check,
} from "lucide-react";

import { WidgetWrapper } from "@/components/widgets";
import { PnlTodayWidget } from "@/components/widgets";
import { WinRateWidget } from "@/components/widgets";
import { RecentTradesWidget } from "@/components/widgets";
import { EquityCurveMiniWidget } from "@/components/widgets";
import { CalendarMiniWidget } from "@/components/widgets";
import { TradingSessionsWidget } from "@/components/widgets";
import { QuickStatsWidget } from "@/components/widgets";
import { StreakWidget } from "@/components/widgets";
import { FearGreedWidget } from "@/components/widgets";
import { DailyBiasWidget } from "@/components/widgets";
import { GoalsProgressWidget } from "@/components/widgets";
import { ChatPreviewWidget } from "@/components/widgets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WidgetId =
  | "pnl-today"
  | "win-rate"
  | "recent-trades"
  | "equity-curve"
  | "calendar-mini"
  | "sessions-clock"
  | "quick-stats"
  | "streak"
  | "fear-greed"
  | "daily-bias"
  | "goals-progress"
  | "chat-preview";

interface WidgetMeta {
  id: WidgetId;
  label: string;
  icon: React.ReactNode;
  wide: boolean;
  /** true = widget does NOT need trades prop (fetches own data) */
  standalone: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIDGETS: WidgetMeta[] = [
  { id: "pnl-today", label: "widgetTodayPnl", icon: <DollarSign size={16} />, wide: false, standalone: false },
  { id: "win-rate", label: "widgetWinRate", icon: <Target size={16} />, wide: false, standalone: false },
  { id: "recent-trades", label: "widgetRecentTrades", icon: <List size={16} />, wide: true, standalone: false },
  { id: "equity-curve", label: "widgetEquityCurve", icon: <TrendingUp size={16} />, wide: true, standalone: false },
  { id: "calendar-mini", label: "widgetCalendar", icon: <CalendarDays size={16} />, wide: true, standalone: false },
  { id: "sessions-clock", label: "widgetSessions", icon: <Globe size={16} />, wide: false, standalone: true },
  { id: "quick-stats", label: "widgetQuickStats", icon: <BarChart3 size={16} />, wide: false, standalone: false },
  { id: "streak", label: "widgetStreak", icon: <Flame size={16} />, wide: false, standalone: false },
  { id: "fear-greed", label: "widgetFearGreed", icon: <Activity size={16} />, wide: false, standalone: true },
  { id: "daily-bias", label: "widgetDailyBias", icon: <Compass size={16} />, wide: false, standalone: true },
  { id: "goals-progress", label: "widgetGoals", icon: <Trophy size={16} />, wide: false, standalone: false },
  { id: "chat-preview", label: "widgetChat", icon: <MessageSquare size={16} />, wide: false, standalone: true },
];

const DEFAULT_LAYOUT: WidgetId[] = [
  "pnl-today",
  "win-rate",
  "streak",
  "sessions-clock",
  "equity-curve",
  "recent-trades",
  "calendar-mini",
  "quick-stats",
];

const STORAGE_KEY = "protrade-dashboard-v2";

// ---------------------------------------------------------------------------
// Widget Renderers
// ---------------------------------------------------------------------------

function WidgetRenderer({ id, trades }: { id: WidgetId; trades: Trade[] }) {
  switch (id) {
    case "pnl-today":
      return <PnlTodayWidget trades={trades} />;
    case "win-rate":
      return <WinRateWidget trades={trades} />;
    case "recent-trades":
      return <RecentTradesWidget trades={trades} />;
    case "equity-curve":
      return <EquityCurveMiniWidget trades={trades} />;
    case "calendar-mini":
      return <CalendarMiniWidget trades={trades} />;
    case "sessions-clock":
      return <TradingSessionsWidget />;
    case "quick-stats":
      return <QuickStatsWidget trades={trades} />;
    case "streak":
      return <StreakWidget trades={trades} />;
    case "fear-greed":
      return <FearGreedWidget />;
    case "daily-bias":
      return <DailyBiasWidget />;
    case "goals-progress":
      return <GoalsProgressWidget trades={trades} />;
    case "chat-preview":
      return <ChatPreviewWidget />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CustomDashboardPage() {
  const { t } = useTranslation();
  const { trades } = useTrades();
  const [isVip, setIsVip] = useState<boolean | null>(null);
  const [layout, setLayout] = useState<WidgetId[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsVip(data?.role === "VIP" || data?.role === "PRO" || data?.role === "ADMIN");
      })
      .catch(() => setIsVip(false));
  }, []);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WidgetId[];
        // Validate widget IDs
        const validIds = new Set(WIDGETS.map((w) => w.id));
        const valid = parsed.filter((id) => validIds.has(id));
        setLayout(valid.length > 0 ? valid : [...DEFAULT_LAYOUT]);
      } else {
        setLayout([...DEFAULT_LAYOUT]);
      }
    } catch {
      setLayout([...DEFAULT_LAYOUT]);
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    }
  }, [layout, hydrated]);

  const addWidget = useCallback((id: WidgetId) => {
    setLayout((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const removeWidget = useCallback((id: WidgetId) => {
    setLayout((prev) => prev.filter((w) => w !== id));
  }, []);

  const moveWidget = useCallback((index: number, direction: "up" | "down") => {
    setLayout((prev) => {
      const next = [...prev];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout([...DEFAULT_LAYOUT]);
  }, []);

  // Available widgets not yet in layout
  const availableWidgets = useMemo(
    () => WIDGETS.filter((w) => !layout.includes(w.id)),
    [layout]
  );

  if (!hydrated || isVip === null) {
    return null;
  }

  if (!isVip) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-30 blur-sm pointer-events-none">
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
                <div className="h-3 rounded mb-2" style={{ background: "var(--border)", width: `${40 + i * 10}%` }} />
                <div className="h-3 rounded" style={{ background: "var(--border)", width: `${20 + i * 8}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 glass rounded-2xl p-8 md:p-12 max-w-lg mx-4 text-center" style={{ border: "1px solid rgba(6,182,212,0.2)", background: "rgba(var(--bg-card-rgb, 15,15,20), 0.85)", backdropFilter: "blur(20px)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Fonctionnalité VIP</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Créez un tableau de bord entièrement personnalisé
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Créez votre tableau de bord personnalisé",
              "Widgets drag & drop",
              "Layouts illimités",
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(6,182,212,0.15)" }}>
                  <Check className="w-3 h-3 text-cyan-400" />
                </div>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{b}</span>
              </div>
            ))}
          </div>
          <a href="/vip" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
            <Crown className="w-4 h-4" />
            Devenir VIP
          </a>
          <div className="mt-4">
            <a href="/vip" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Voir les offres</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", padding: "24px 24px 48px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LayoutDashboard size={22} color="#06b6d4" />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {t("customDashboard")}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Edit Mode Toggle */}
          <button
            onClick={() => {
              setEditMode(!editMode);
              if (editMode) setCatalogOpen(false);
            }}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 8,
              border: editMode ? "1px solid #06b6d4" : "1px solid var(--border)",
              backgroundColor: editMode ? "rgba(6,182,212,0.15)" : "transparent",
              color: editMode ? "#06b6d4" : "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.15s ease",
            }}
          >
            <Settings2 size={14} />
            {editMode ? t("done") || "Done" : t("edit") || "Edit"}
          </button>

          {/* Add Widget Button (visible in edit mode) */}
          {editMode && (
            <>
              <button
                onClick={() => setCatalogOpen(true)}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: "1px solid #10b981",
                  backgroundColor: "rgba(16,185,129,0.1)",
                  color: "#10b981",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.15s ease",
                }}
              >
                <Plus size={14} />
                {t("addWidget") || "Add Widget"}
              </button>

              <button
                onClick={resetLayout}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.15s ease",
                }}
              >
                <RotateCcw size={14} />
                {t("resetDefault") || "Reset"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit mode indicator */}
      {editMode && (
        <div
          style={{
            marginBottom: 16,
            padding: "8px 14px",
            borderRadius: 8,
            backgroundColor: "rgba(6,182,212,0.08)",
            border: "1px solid rgba(6,182,212,0.2)",
            fontSize: 12,
            color: "#06b6d4",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Settings2 size={14} />
          {t("editModeHint") || "Edit mode: reorder or remove widgets. Click \"Add Widget\" to add new ones."}
        </div>
      )}

      {/* Widget Catalog Modal */}
      {catalogOpen && (
        <>
          <div
            onClick={() => setCatalogOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(480px, 90vw)",
              maxHeight: "80vh",
              overflowY: "auto",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              zIndex: 50,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {t("widgetCatalog") || "Widget Catalog"}
              </h2>
              <button
                onClick={() => setCatalogOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {availableWidgets.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 0",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                {t("allWidgetsActive") || "All widgets are already active!"}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                {availableWidgets.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      addWidget(w.id);
                      if (availableWidgets.length <= 1) setCatalogOpen(false);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "16px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "#06b6d4";
                      (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(6,182,212,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }}
                  >
                    <span style={{ color: "#06b6d4" }}>{w.icon}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        textAlign: "center",
                      }}
                    >
                      {t(w.label) || w.label}
                    </span>
                    {w.wide && (
                      <span
                        style={{
                          fontSize: 9,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        wide
                      </span>
                    )}
                    <Plus size={14} color="#10b981" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Widget Grid */}
      {layout.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            gap: 12,
          }}
        >
          <LayoutDashboard size={40} color="var(--text-muted)" />
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            {t("noActiveWidgets")}
          </p>
          {editMode && (
            <button
              onClick={() => setCatalogOpen(true)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
                border: "1px solid #10b981",
                backgroundColor: "rgba(16,185,129,0.1)",
                color: "#10b981",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 8,
              }}
            >
              <Plus size={14} />
              {t("addWidget") || "Add Widget"}
            </button>
          )}
        </div>
      ) : (
        <div
          className="widget-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          {layout.map((id, index) => {
            const meta = WIDGETS.find((w) => w.id === id);
            if (!meta) return null;

            return (
              <WidgetWrapper
                key={id}
                title={t(meta.label) || meta.label}
                icon={meta.icon}
                wide={meta.wide}
                editMode={editMode}
                onRemove={editMode ? () => removeWidget(id) : undefined}
                onMoveUp={editMode && index > 0 ? () => moveWidget(index, "up") : undefined}
                onMoveDown={
                  editMode && index < layout.length - 1
                    ? () => moveWidget(index, "down")
                    : undefined
                }
              >
                <WidgetRenderer id={id} trades={trades} />
              </WidgetWrapper>
            );
          })}
        </div>
      )}

      {/* Responsive CSS */}
      <style>{`
        .widget-grid {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        .widget-card.widget-wide {
          grid-column: span 2 !important;
        }
        @media (max-width: 1024px) {
          .widget-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .widget-card.widget-wide {
            grid-column: span 2 !important;
          }
        }
        @media (max-width: 640px) {
          .widget-grid {
            grid-template-columns: 1fr !important;
          }
          .widget-card.widget-wide {
            grid-column: span 1 !important;
          }
        }
        /* Glass card dark mode support */
        @media (prefers-color-scheme: dark) {
          .widget-card {
            --widget-bg: rgba(17, 24, 39, 0.8) !important;
          }
        }
        :root[class*="dark"] .widget-card,
        .dark .widget-card {
          --widget-bg: rgba(17, 24, 39, 0.8) !important;
        }
        .widget-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
      `}</style>
    </div>
  );
}
