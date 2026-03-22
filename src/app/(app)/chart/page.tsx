"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Maximize,
  Minimize,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Camera,
  Columns2,
  Eye,
} from "lucide-react";
import { useTrades, type Trade } from "@/hooks/useTrades";
import { useStrategies } from "@/hooks/useStrategies";

/* ── Constants ──────────────────────────────────────── */
const ASSETS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD",
  "USD/CHF", "AUD/USD", "NZD/USD", "USD/CAD", "EUR/GBP",
  "EUR/JPY", "GBP/JPY",
];
const FALLBACK_STRATEGIES = [
  "Breakout", "Retracement", "Support/Resistance", "Trend Following", "Scalping",
];

/* ── Glassmorphism helpers ──────────────────────────── */
const glassStyle: React.CSSProperties = {
  background: "var(--glass-bg, rgba(15, 15, 30, 0.78))",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--glass-border, rgba(255,255,255,0.10))",
};

const glassInputClass =
  "w-full rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-colors";

/* ── Normalise symbol for matching ──────────────────── */
function normalizeSymbol(s: string): string {
  return s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/* ── Format date compact ───────────────────────────── */
function fmtDate(d: string): string {
  const dt = new Date(d);
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/* ── Format price ──────────────────────────────────── */
function fmtPrice(n: number | null): string {
  if (n === null || n === undefined) return "-";
  return n.toFixed(n >= 100 ? 2 : 5);
}

/* ══════════════════════════════════════════════════════
   TradingView Widget Builder
   ══════════════════════════════════════════════════════ */
function buildTVWidget(
  container: HTMLElement,
  opts: {
    symbol: string;
    interval: string;
    theme: "dark" | "light";
    height: string;
  },
) {
  container.innerHTML = "";
  const isDark = opts.theme === "dark";

  const wrapper = document.createElement("div");
  wrapper.className = "tradingview-widget-container";
  wrapper.style.height = "100%";
  wrapper.style.width = "100%";

  const widgetDiv = document.createElement("div");
  widgetDiv.className = "tradingview-widget-container__widget";
  widgetDiv.style.height = opts.height;
  widgetDiv.style.width = "100%";

  const script = document.createElement("script");
  script.src =
    "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
  script.type = "text/javascript";
  script.async = true;
  script.innerHTML = JSON.stringify({
    autosize: true,
    symbol: opts.symbol,
    interval: opts.interval,
    timezone: "Europe/Paris",
    theme: isDark ? "dark" : "light",
    style: "1",
    locale: "fr",
    allow_symbol_change: true,
    support_host: "https://www.tradingview.com",
    backgroundColor: isDark ? "rgba(10, 10, 15, 1)" : "rgba(255, 255, 255, 1)",
    gridColor: isDark
      ? "rgba(255, 255, 255, 0.03)"
      : "rgba(0, 0, 0, 0.06)",
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: true,
    calendar: false,
    hide_side_toolbar: false,
    details: true,
    hotlist: true,
    studies: [],
    withdateranges: true,
  });

  wrapper.appendChild(widgetDiv);
  wrapper.appendChild(script);
  container.appendChild(wrapper);
}

/* ══════════════════════════════════════════════════════
   TRADES PANEL (collapsible overlay, right side)
   ══════════════════════════════════════════════════════ */
function TradesPanel({
  symbol,
  theme,
}: {
  symbol: string;
  theme: "dark" | "light";
}) {
  const { trades } = useTrades();
  const [open, setOpen] = useState(false);

  const norm = normalizeSymbol(symbol);
  const filtered = useMemo(
    () =>
      trades
        .filter((t) => normalizeSymbol(t.asset) === norm)
        .slice(0, 20),
    [trades, norm],
  );

  return (
    <div
      className={`absolute top-12 right-2 z-20 transition-all duration-300 ${
        open ? "w-72" : "w-9"
      }`}
      style={{ maxHeight: "calc(100% - 60px)" }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="absolute top-0 left-0 z-30 w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
        style={{
          ...glassStyle,
          color: theme === "dark" ? "#a0a0a0" : "#666",
        }}
        title={open ? "Fermer le panneau" : "Voir les trades"}
      >
        {open ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Panel content */}
      {open && (
        <div
          className="mt-0 ml-0 rounded-xl overflow-hidden shadow-2xl"
          style={{
            ...glassStyle,
            maxHeight: "calc(100vh - 220px)",
          }}
        >
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-muted, #888)" }} />
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--text-primary, #fff)" }}
            >
              Trades {symbol}
            </span>
            <span
              className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/10"
              style={{ color: "var(--text-muted, #888)" }}
            >
              {filtered.length}
            </span>
          </div>

          {/* List */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            {filtered.length === 0 && (
              <div
                className="p-4 text-center text-xs"
                style={{ color: "var(--text-muted, #888)" }}
              >
                Aucun trade pour {symbol}
              </div>
            )}
            {filtered.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const isLong = trade.direction === "LONG";
  const pnl = trade.result;
  const pnlColor =
    pnl > 0 ? "#22c55e" : pnl < 0 ? "#ef4444" : "var(--text-muted, #888)";

  return (
    <div className="px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        {/* Direction badge */}
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{
            background: isLong ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: isLong ? "#22c55e" : "#ef4444",
          }}
        >
          {isLong ? "LONG" : "SHORT"}
        </span>
        {/* Date */}
        <span
          className="text-[10px]"
          style={{ color: "var(--text-muted, #888)" }}
        >
          {fmtDate(trade.date)}
        </span>
        {/* P&L */}
        <span className="ml-auto text-xs font-semibold" style={{ color: pnlColor }}>
          {pnl > 0 ? "+" : ""}
          {pnl.toFixed(2)} $
        </span>
      </div>
      <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-secondary, #aaa)" }}>
        <span>{fmtPrice(trade.entry)}</span>
        <span style={{ color: "var(--text-muted, #666)" }}>→</span>
        <span>{fmtPrice(trade.exit)}</span>
        <a
          href={`/journal`}
          className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
          style={{ color: "var(--accent, #6366f1)" }}
        >
          Voir
        </a>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MINI TRADE FORM (floating "+" at bottom-right)
   ══════════════════════════════════════════════════════ */
function MiniTradeForm({
  symbol,
  theme,
}: {
  symbol: string;
  theme: "dark" | "light";
}) {
  const { addTrade } = useTrades();
  const { strategies } = useStrategies();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState("LONG");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const strategyNames =
    strategies.length > 0
      ? strategies.map((s) => s.name)
      : FALLBACK_STRATEGIES;

  // Determine the default asset from the TradingView symbol
  const defaultAsset = useMemo(() => {
    const sym = normalizeSymbol(symbol);
    return (
      ASSETS.find((a) => normalizeSymbol(a) === sym) || ASSETS[0]
    );
  }, [symbol]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const timer = setTimeout(
      () => document.addEventListener("mousedown", handler),
      10,
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const entry = parseFloat(form.get("entry") as string);
    const exit = form.get("exit") as string;
    const exitVal = exit ? parseFloat(exit) : null;
    const lots = parseFloat(form.get("lots") as string);

    // Simple P&L calc
    let result = 0;
    if (exitVal !== null) {
      const diff =
        direction === "LONG" ? exitVal - entry : entry - exitVal;
      result = diff * lots * 100000; // rough forex
    }

    const trade = {
      date: new Date().toISOString(),
      asset: form.get("asset"),
      direction,
      strategy: form.get("strategy"),
      entry,
      exit: exitVal,
      sl: parseFloat(form.get("sl") as string),
      tp: parseFloat(form.get("tp") as string),
      lots,
      result,
      commission: 0,
      swap: 0,
      emotion: null,
      setup: null,
      tags: "",
      screenshots: [],
    };

    try {
      const ok = await addTrade(trade as Record<string, unknown>);
      if (ok) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 600);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`absolute bottom-4 right-4 z-20 w-11 h-11 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          open
            ? "rotate-45 bg-red-500/80 hover:bg-red-500"
            : "bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 hover:scale-110"
        }`}
        style={{
          backdropFilter: "blur(12px)",
          boxShadow: open
            ? "0 8px 24px rgba(239,68,68,0.35)"
            : "0 8px 24px rgba(59,130,246,0.35)",
        }}
        title="Ajouter un trade"
      >
        <Plus className="w-5 h-5 text-white transition-transform duration-300" />
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-18 right-4 z-20 w-80 rounded-2xl shadow-2xl overflow-hidden"
          style={glassStyle}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary, #fff)" }}
            >
              Trade rapide
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "var(--text-muted, #888)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {/* Asset (pre-filled from chart) */}
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: "var(--text-muted, #888)" }}
              >
                Symbole
              </label>
              <select
                name="asset"
                required
                defaultValue={defaultAsset}
                className={glassInputClass}
                style={{ color: "var(--text-primary, #fff)" }}
              >
                {ASSETS.map((a) => (
                  <option key={a} value={a} style={{ background: "var(--bg-card-solid)" }}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Direction */}
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: "var(--text-muted, #888)" }}
              >
                Direction
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("LONG")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    direction === "LONG"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                  style={direction !== "LONG" ? { color: "var(--text-muted, #888)" } : {}}
                >
                  Achat
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("SHORT")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    direction === "SHORT"
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                  style={direction !== "SHORT" ? { color: "var(--text-muted, #888)" } : {}}
                >
                  Vente
                </button>
              </div>
            </div>

            {/* Entry / Exit */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: "var(--text-muted, #888)" }}
                >
                  Entree
                </label>
                <input
                  name="entry"
                  type="number"
                  step="any"
                  required
                  className={glassInputClass}
                  style={{ color: "var(--text-primary, #fff)" }}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: "var(--text-muted, #888)" }}
                >
                  Sortie
                </label>
                <input
                  name="exit"
                  type="number"
                  step="any"
                  className={glassInputClass}
                  style={{ color: "var(--text-primary, #fff)" }}
                  placeholder="optionnel"
                />
              </div>
            </div>

            {/* SL / TP / Lots */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: "var(--text-muted, #888)" }}
                >
                  SL
                </label>
                <input
                  name="sl"
                  type="number"
                  step="any"
                  required
                  className={glassInputClass}
                  style={{ color: "var(--text-primary, #fff)" }}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: "var(--text-muted, #888)" }}
                >
                  TP
                </label>
                <input
                  name="tp"
                  type="number"
                  step="any"
                  required
                  className={glassInputClass}
                  style={{ color: "var(--text-primary, #fff)" }}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: "var(--text-muted, #888)" }}
                >
                  Lots
                </label>
                <input
                  name="lots"
                  type="number"
                  step="any"
                  required
                  className={glassInputClass}
                  style={{ color: "var(--text-primary, #fff)" }}
                  placeholder="0.01"
                />
              </div>
            </div>

            {/* Strategy */}
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: "var(--text-muted, #888)" }}
              >
                Strategie
              </label>
              <select
                name="strategy"
                required
                className={glassInputClass}
                style={{ color: "var(--text-primary, #fff)" }}
              >
                {strategyNames.map((s) => (
                  <option key={s} value={s} style={{ background: "var(--bg-card-solid)" }}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || success}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                success
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white shadow-lg hover:shadow-blue-500/25"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement...
                </span>
              ) : success ? (
                "Enregistre !"
              ) : (
                "Enregistrer le trade"
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SCREENSHOT BUTTON
   ══════════════════════════════════════════════════════ */
function ScreenshotButton({
  wrapperRef,
  theme,
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  theme: "dark" | "light";
}) {
  const [capturing, setCapturing] = useState(false);
  const [done, setDone] = useState(false);

  const capture = useCallback(async () => {
    if (!wrapperRef.current) return;
    setCapturing(true);
    try {
      // Dynamically import html2canvas only when needed
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(wrapperRef.current, {
        backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
        useCORS: true,
        allowTaint: true,
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `chart-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      // Fallback: inform user TradingView has its own screenshot feature
      alert(
        "Capture echouee. Utilisez le bouton screenshot integre de TradingView (icone appareil photo dans la barre d'outils).",
      );
    } finally {
      setCapturing(false);
    }
  }, [wrapperRef, theme]);

  return (
    <button
      onClick={capture}
      disabled={capturing}
      className="rounded-lg p-1.5 transition-all hover:scale-110"
      style={{
        ...glassStyle,
        color: done
          ? "#22c55e"
          : theme === "dark"
            ? "#a0a0a0"
            : "#666",
      }}
      title="Capturer le graphique"
    >
      <Camera className="w-4 h-4" />
    </button>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ══════════════════════════════════════════════════════ */
export default function ChartPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const container2Ref = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dualChart, setDualChart] = useState(false);

  // Current symbol tracked from widget config
  const [currentSymbol, setCurrentSymbol] = useState("FX:EURUSD");
  const [mainInterval] = useState("60");

  // Detect theme
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const detect = () => {
      const stored = localStorage.getItem("theme");
      if (stored === "light") setTheme("light");
      else setTheme("dark");
    };
    detect();
    window.addEventListener("storage", detect);
    const observer = new MutationObserver(detect);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      window.removeEventListener("storage", detect);
      observer.disconnect();
    };
  }, []);

  /* ── Symbol change detection is not supported by TradingView embed widget ── */

  /* ── Build main widget ──────────────────────────────── */
  const buildWidget = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = isFullscreen ? "calc(100vh - 4px)" : "calc(100vh - 144px)";
    buildTVWidget(el, {
      symbol: currentSymbol,
      interval: mainInterval,
      theme,
      height: h,
    });
  }, [theme, isFullscreen, currentSymbol, mainInterval]);

  useEffect(() => {
    buildWidget();
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [buildWidget]);

  /* ── Build second widget when dual chart ────────────── */
  useEffect(() => {
    const el = container2Ref.current;
    if (!el) return;
    if (!dualChart) {
      el.innerHTML = "";
      return;
    }
    const h = isFullscreen ? "calc(100vh - 4px)" : "calc(100vh - 144px)";
    // Second chart uses a different timeframe: if main is 1H (60), second is D
    const secondInterval = mainInterval === "60" ? "D" : "60";
    buildTVWidget(el, {
      symbol: currentSymbol,
      interval: secondInterval,
      theme,
      height: h,
    });
    return () => {
      if (el) el.innerHTML = "";
    };
  }, [dualChart, theme, isFullscreen, currentSymbol, mainInterval]);

  /* ── Fullscreen ────────────────────────────────────── */
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── Derive display symbol for filtering ───────────── */
  const displaySymbol = useMemo(() => {
    // TradingView symbols are like "FX:EURUSD" or "OANDA:EURUSD"
    const parts = currentSymbol.split(":");
    const raw = parts.length > 1 ? parts[1] : parts[0];
    // Try to match against ASSETS list
    const norm = normalizeSymbol(raw);
    const matched = ASSETS.find((a) => normalizeSymbol(a) === norm);
    return matched || raw;
  }, [currentSymbol]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      style={{
        margin: 0,
        height: isFullscreen ? "100vh" : "calc(100vh - 140px)",
        background: theme === "dark" ? "var(--bg-primary)" : "#ffffff",
        borderRadius: isFullscreen ? 0 : "12px",
        overflow: "hidden",
        border: isFullscreen
          ? "none"
          : `1px solid var(--border)`,
      }}
    >
      {/* ── Top-right toolbar (grouped) ─────────────────── */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
        <button
          onClick={() => setDualChart((v) => !v)}
          title={dualChart ? "Vue simple" : "Double graphique"}
          className="rounded-lg p-1.5 transition-all hover:scale-110"
          style={{
            ...glassStyle,
            color: dualChart ? "#6366f1" : theme === "dark" ? "#a0a0a0" : "#666",
          }}
        >
          <Columns2 className="w-4 h-4" />
        </button>
        <ScreenshotButton wrapperRef={wrapperRef} theme={theme} />
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Quitter" : "Plein écran"}
          className="rounded-lg p-1.5 transition-all hover:scale-110"
          style={{
            ...glassStyle,
            color: theme === "dark" ? "#a0a0a0" : "#666",
          }}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Chart area ──────────────────────────────────── */}
      <div
        className="flex h-full"
        style={{ gap: dualChart ? "2px" : 0 }}
      >
        <div
          ref={containerRef}
          style={{
            height: "100%",
            width: dualChart ? "50%" : "100%",
            transition: "width 0.3s ease",
          }}
        />
        {dualChart && (
          <div
            ref={container2Ref}
            style={{
              height: "100%",
              width: "50%",
              borderLeft: `1px solid var(--border)`,
            }}
          />
        )}
      </div>

      {/* ── Overlays ────────────────────────────────────── */}
      {/* Trades panel - right side overlay */}
      <TradesPanel symbol={displaySymbol} theme={theme} />

      {/* Quick trade form - bottom right */}
      <MiniTradeForm symbol={currentSymbol} theme={theme} />

      {/* Symbol indicator (bottom-left) */}
      <div
        className="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{
          ...glassStyle,
          color: "var(--text-muted, #888)",
        }}
      >
        {displaySymbol}
      </div>
    </div>
  );
}
