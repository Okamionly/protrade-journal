"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Maximize,
  Minimize,
  Plus,
  X,
  Camera,
  Eye,
  PanelRightOpen,
} from "lucide-react";
import { useTrades, type Trade } from "@/hooks/useTrades";
import { useStrategies } from "@/hooks/useStrategies";
import { useTranslation } from "@/i18n/context";

/* ── Constants ──────────────────────────────────────── */
const ASSETS_LEGACY = [
  "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD",
  "USD/CHF", "AUD/USD", "NZD/USD", "USD/CAD", "EUR/GBP",
  "EUR/JPY", "GBP/JPY",
];
const FALLBACK_STRATEGIES = [
  "Breakout", "Retracement", "Support/Resistance", "Trend Following", "Scalping",
];

const glassInputClass =
  "w-full rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors";

/* ── Helpers ─────────────────────────────────────────── */
function normalizeSymbol(s: string): string {
  return s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function fmtPrice(n: number | null): string {
  if (n === null || n === undefined) return "-";
  return n.toFixed(n >= 100 ? 2 : 5);
}

/* ── TradingView Widget Builder ──────────────────────── */
function buildTVWidget(
  container: HTMLElement,
  opts: { symbol: string; interval: string; theme: "dark" | "light" },
) {
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "tradingview-widget-container";
  wrapper.style.height = "100%";
  wrapper.style.width = "100%";

  const widgetDiv = document.createElement("div");
  widgetDiv.className = "tradingview-widget-container__widget";
  widgetDiv.style.height = "100%";
  widgetDiv.style.width = "100%";

  const isDark = opts.theme === "dark";
  const script = document.createElement("script");
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
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
    gridColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.06)",
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: true,
    calendar: false,
    hide_side_toolbar: false,
    details: false,
    hotlist: false,
    studies: [],
    withdateranges: false,
  });

  wrapper.appendChild(widgetDiv);
  wrapper.appendChild(script);
  container.appendChild(wrapper);
}

/* ── Action Toolbar (floating top-right, 3 icons) ──── */
function ActionToolbar({
  wrapperRef,
  theme,
  isFullscreen,
  tradesOpen,
  onToggleFullscreen,
  onToggleTrades,
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  theme: "dark" | "light";
  isFullscreen: boolean;
  tradesOpen: boolean;
  onToggleFullscreen: () => void;
  onToggleTrades: () => void;
}) {
  const { t } = useTranslation();
  const [capturing, setCapturing] = useState(false);
  const [capDone, setCapDone] = useState(false);

  const capture = useCallback(async () => {
    if (!wrapperRef.current) return;
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(wrapperRef.current, {
        backgroundColor: theme === "dark" ? "#0a0a0f" : "#ffffff",
        useCORS: true,
        allowTaint: true,
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `chart-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setCapDone(true);
      setTimeout(() => setCapDone(false), 2000);
    } catch {
      alert(t("chartCaptureFailed"));
    } finally {
      setCapturing(false);
    }
  }, [wrapperRef, theme, t]);

  const btnClass =
    "w-8 h-8 flex items-center justify-center rounded transition-all hover:bg-white/10";

  return (
    <div
      className="absolute top-2 right-2 z-30 flex items-center gap-0.5 rounded-lg px-1"
      style={{
        background: "rgba(10,10,18,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.06)",
        height: 36,
      }}
    >
      <button
        onClick={capture}
        disabled={capturing}
        className={btnClass}
        style={{ color: capDone ? "#22c55e" : "#666" }}
        title={t("chartScreenshot")}
      >
        <Camera className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onToggleFullscreen}
        className={btnClass}
        style={{ color: isFullscreen ? "#00e5ff" : "#666" }}
        title={t("chartToggleFullscreen")}
      >
        {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={onToggleTrades}
        className={btnClass}
        style={{ color: tradesOpen ? "#00e5ff" : "#666" }}
        title={t("chartToggleTrades")}
      >
        <PanelRightOpen className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ── Trades Panel (right side slide-in overlay) ──────── */
function TradesPanel({
  symbol,
  open,
  onClose,
}: {
  symbol: string;
  open: boolean;
  onClose: () => void;
}) {
  const { trades } = useTrades();
  const { t } = useTranslation();

  const norm = normalizeSymbol(symbol);
  const filtered = useMemo(
    () => trades.filter((tr) => normalizeSymbol(tr.asset) === norm).slice(0, 30),
    [trades, norm],
  );

  return (
    <div
      className="absolute top-0 right-0 z-20 h-full transition-transform duration-300"
      style={{
        width: 320,
        transform: open ? "translateX(0)" : "translateX(100%)",
        background: "rgba(10,10,18,0.92)",
        backdropFilter: "blur(24px)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center px-3 h-10 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Eye className="w-3.5 h-3.5 mr-2" style={{ color: "#666" }} />
        <span className="text-xs font-semibold" style={{ color: "#e0e0e0" }}>
          Trades — {symbol}
        </span>
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-white/10" style={{ color: "#666" }}>
          {filtered.length}
        </span>
        <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-white/10 transition-colors" style={{ color: "#666" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-y-auto" style={{ height: "calc(100% - 90px)" }}>
        {filtered.length === 0 && (
          <div className="p-6 text-center text-xs" style={{ color: "#666" }}>
            {t("chartNoTradesFor", { symbol })}
          </div>
        )}
        {filtered.map((trade) => (
          <TradeRow key={trade.id} trade={trade} />
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <a
          href="/journal"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium transition-all hover:bg-cyan-500/10"
          style={{ background: "rgba(0,229,255,0.12)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.2)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t("chartQuickAdd")}
        </a>
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const isLong = trade.direction === "LONG";
  const pnl = trade.result;
  const pnlColor = pnl > 0 ? "#22c55e" : pnl < 0 ? "#ef4444" : "#666";

  return (
    <div className="px-3 py-2 border-b hover:bg-white/[0.03] transition-colors" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{
            background: isLong ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: isLong ? "#22c55e" : "#ef4444",
          }}
        >
          {isLong ? "LONG" : "SHORT"}
        </span>
        <span className="text-[10px]" style={{ color: "#666" }}>{fmtDate(trade.date)}</span>
        <span className="ml-auto text-xs font-semibold" style={{ color: pnlColor }}>
          {pnl > 0 ? "+" : ""}{pnl.toFixed(2)} $
        </span>
      </div>
      <div className="flex items-center gap-1 text-[10px]" style={{ color: "#666" }}>
        <span>{fmtPrice(trade.entry)}</span>
        <span style={{ opacity: 0.4 }}>&rarr;</span>
        <span>{fmtPrice(trade.exit)}</span>
        <a href="/journal" className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors" style={{ color: "#00e5ff" }}>
          Voir
        </a>
      </div>
    </div>
  );
}

/* ── Quick Trade Form (floating FAB) ─────────────────── */
function MiniTradeForm({ symbol }: { symbol: string }) {
  const { addTrade } = useTrades();
  const { strategies } = useStrategies();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState("LONG");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const strategyNames = strategies.length > 0 ? strategies.map((s) => s.name) : FALLBACK_STRATEGIES;

  const defaultAsset = useMemo(() => {
    const sym = normalizeSymbol(symbol);
    return ASSETS_LEGACY.find((a) => normalizeSymbol(a) === sym) || ASSETS_LEGACY[0];
  }, [symbol]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 10);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
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
    let result = 0;
    if (exitVal !== null) {
      const diff = direction === "LONG" ? exitVal - entry : entry - exitVal;
      result = diff * lots * 100000;
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
        setTimeout(() => { setOpen(false); setSuccess(false); }, 600);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`absolute bottom-3 right-3 z-20 w-10 h-10 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          open
            ? "rotate-45 bg-red-500/80 hover:bg-red-500"
            : "bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 hover:scale-110"
        }`}
        style={{
          backdropFilter: "blur(12px)",
          boxShadow: open ? "0 6px 20px rgba(239,68,68,0.3)" : "0 6px 20px rgba(0,229,255,0.25)",
        }}
        title={t("chartAddTrade")}
      >
        <Plus className="w-4 h-4 text-white transition-transform duration-300" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-16 right-3 z-20 w-80 rounded-xl shadow-2xl overflow-hidden"
          style={{ background: "rgba(10,10,18,0.95)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="px-4 py-2.5 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#e0e0e0" }}>{t("chartQuickTrade")}</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors" style={{ color: "#666" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
            <div>
              <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "#666" }}>{t("chartSymbol")}</label>
              <select name="asset" required defaultValue={defaultAsset} className={glassInputClass} style={{ color: "#e0e0e0" }}>
                {ASSETS_LEGACY.map((a) => (<option key={a} value={a} style={{ background: "#0a0a0f" }}>{a}</option>))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "#666" }}>{t("chartDirection")}</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDirection("LONG")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${direction === "LONG" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}
                  style={direction !== "LONG" ? { color: "#666" } : {}}>{t("chartBuy")}</button>
                <button type="button" onClick={() => setDirection("SHORT")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${direction === "SHORT" ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}
                  style={direction !== "SHORT" ? { color: "#666" } : {}}>{t("chartSell")}</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "#666" }}>{t("chartEntry")}</label>
                <input name="entry" type="number" step="any" required className={glassInputClass} style={{ color: "#e0e0e0" }} placeholder="0.00" />
              </div>
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "#666" }}>{t("chartExit2")}</label>
                <input name="exit" type="number" step="any" className={glassInputClass} style={{ color: "#e0e0e0" }} placeholder={t("chartOptional")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "#666" }}>SL</label>
                <input name="sl" type="number" step="any" required className={glassInputClass} style={{ color: "#e0e0e0" }} placeholder="0.00" />
              </div>
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "#666" }}>TP</label>
                <input name="tp" type="number" step="any" required className={glassInputClass} style={{ color: "#e0e0e0" }} placeholder="0.00" />
              </div>
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "#666" }}>Lots</label>
                <input name="lots" type="number" step="any" required className={glassInputClass} style={{ color: "#e0e0e0" }} placeholder="0.01" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "#666" }}>{t("chartStrategy")}</label>
              <select name="strategy" required className={glassInputClass} style={{ color: "#e0e0e0" }}>
                {strategyNames.map((s) => (<option key={s} value={s} style={{ background: "#0a0a0f" }}>{s}</option>))}
              </select>
            </div>

            <button type="submit" disabled={loading || success}
              className={`w-full py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                success
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg hover:shadow-cyan-500/20"
              }`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("chartSaving")}
                </span>
              ) : success ? t("chartSaved") : t("chartSaveTrade")}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════ */
export default function ChartPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tradesOpen, setTradesOpen] = useState(false);

  /* ── Symbol & interval (persisted) ─────────────────── */
  const [currentSymbol, setCurrentSymbol] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("chart-symbol") || "FX:EURUSD";
    return "FX:EURUSD";
  });
  const [mainInterval, setMainInterval] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("chart-interval") || "60";
    return "60";
  });

  useEffect(() => { localStorage.setItem("chart-symbol", currentSymbol); }, [currentSymbol]);
  useEffect(() => { localStorage.setItem("chart-interval", mainInterval); }, [mainInterval]);

  /* ── Detect theme ──────────────────────────────────── */
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
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { window.removeEventListener("storage", detect); observer.disconnect(); };
  }, []);

  /* ── Build widget ──────────────────────────────────── */
  const buildWidget = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    buildTVWidget(el, { symbol: currentSymbol, interval: mainInterval, theme });
  }, [theme, currentSymbol, mainInterval]);

  useEffect(() => {
    buildWidget();
    return () => { if (containerRef.current) containerRef.current.innerHTML = ""; };
  }, [buildWidget]);

  /* ── Fullscreen ────────────────────────────────────── */
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) wrapperRef.current.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── Display symbol for trades panel ───────────────── */
  const displaySymbol = useMemo(() => {
    const parts = currentSymbol.split(":");
    const raw = parts.length > 1 ? parts[1] : parts[0];
    const norm = normalizeSymbol(raw);
    return ASSETS_LEGACY.find((a) => normalizeSymbol(a) === norm) || raw;
  }, [currentSymbol]);

  /* ── Listen for TradingView symbol/interval changes ── */
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        if (typeof e.data === "string" && e.data.includes("symbolChange")) {
          const data = JSON.parse(e.data);
          if (data?.name === "symbolChange" && data?.data) {
            setCurrentSymbol(data.data);
          }
        }
        if (typeof e.data === "string" && e.data.includes("intervalChange")) {
          const data = JSON.parse(e.data);
          if (data?.name === "intervalChange" && data?.data) {
            setMainInterval(data.data);
          }
        }
      } catch {
        // ignore non-TV messages
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      style={{
        height: isFullscreen ? "100vh" : "calc(100vh - 64px)",
        overflow: "hidden",
        margin: 0,
        borderRadius: 0,
      }}
    >
      {/* Chart — 100% of page */}
      <div
        ref={containerRef}
        style={{ height: "100%", width: "100%" }}
      />

      {/* Floating action bar (top-right) */}
      <ActionToolbar
        wrapperRef={wrapperRef}
        theme={theme}
        isFullscreen={isFullscreen}
        tradesOpen={tradesOpen}
        onToggleFullscreen={toggleFullscreen}
        onToggleTrades={() => setTradesOpen((v) => !v)}
      />

      {/* Trades panel (right side overlay) */}
      <TradesPanel
        symbol={displaySymbol}
        open={tradesOpen}
        onClose={() => setTradesOpen(false)}
      />

      {/* Quick trade form (bottom-right FAB) */}
      <MiniTradeForm symbol={currentSymbol} />
    </div>
  );
}
