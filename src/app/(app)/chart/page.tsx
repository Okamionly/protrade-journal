"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Maximize,
  Minimize,
  TrendingUp,
  DollarSign,
  BarChart3,
  Bitcoin,
} from "lucide-react";

/* ── Symbol presets ──────────────────────────────────── */

interface SymbolDef {
  label: string;
  tv: string; // TradingView symbol
  category: "forex" | "indices" | "crypto";
}

const SYMBOLS: SymbolDef[] = [
  // Forex
  { label: "EUR/USD", tv: "FX:EURUSD", category: "forex" },
  { label: "GBP/USD", tv: "FX:GBPUSD", category: "forex" },
  { label: "USD/JPY", tv: "FX:USDJPY", category: "forex" },
  { label: "XAU/USD", tv: "TVC:GOLD", category: "forex" },
  // Indices
  { label: "US30", tv: "FOREXCOM:DJI", category: "indices" },
  { label: "NAS100", tv: "FOREXCOM:NSXUSD", category: "indices" },
  { label: "SPX500", tv: "FOREXCOM:SPXUSD", category: "indices" },
  // Crypto
  { label: "BTC/USD", tv: "BITSTAMP:BTCUSD", category: "crypto" },
  { label: "ETH/USD", tv: "BITSTAMP:ETHUSD", category: "crypto" },
];

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  forex: <DollarSign className="w-3 h-3" />,
  indices: <BarChart3 className="w-3 h-3" />,
  crypto: <Bitcoin className="w-3 h-3" />,
};

const CATEGORY_LABEL: Record<string, string> = {
  forex: "Forex",
  indices: "Indices",
  crypto: "Crypto",
};

/* ── Timeframe presets ───────────────────────────────── */

interface TimeframeDef {
  label: string;
  interval: string; // TradingView interval value
}

const TIMEFRAMES: TimeframeDef[] = [
  { label: "1M", interval: "1" },
  { label: "5M", interval: "5" },
  { label: "15M", interval: "15" },
  { label: "1H", interval: "60" },
  { label: "4H", interval: "240" },
  { label: "J", interval: "D" },
  { label: "S", interval: "W" },
];

/* ── Page ────────────────────────────────────────────── */

export default function ChartPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [activeSymbol, setActiveSymbol] = useState<SymbolDef>(SYMBOLS[0]);
  const [activeTimeframe, setActiveTimeframe] = useState<TimeframeDef>(
    TIMEFRAMES[3]
  ); // default 1H
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* ── Build / rebuild widget ──────────────────────── */

  const buildWidget = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: activeSymbol.tv,
      interval: activeTimeframe.interval,
      timezone: "Europe/Paris",
      theme: "dark",
      style: "1",
      locale: "fr",
      allow_symbol_change: true,
      support_host: "https://www.tradingview.com",
      backgroundColor: "rgba(15, 15, 20, 1)",
      gridColor: "rgba(255, 255, 255, 0.04)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      calendar: false,
      studies: ["Volume@tv-basicstudies"],
    });

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";

    el.appendChild(widgetDiv);
    el.appendChild(script);
  }, [activeSymbol, activeTimeframe]);

  useEffect(() => {
    buildWidget();
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [buildWidget]);

  /* ── Fullscreen toggle ───────────────────────────── */

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

  /* ── Render ──────────────────────────────────────── */

  const categories = ["forex", "indices", "crypto"] as const;

  return (
    <div
      ref={wrapperRef}
      className="flex flex-col h-full"
      style={{
        padding: isFullscreen ? 0 : "6px 8px 8px",
        background: isFullscreen ? "rgba(15,15,20,1)" : undefined,
      }}
    >
      {/* ── Top bar ─────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-2 mb-1.5"
        style={{ minHeight: 36 }}
      >
        {/* Current symbol name */}
        <div className="flex items-center gap-1.5 mr-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span
            className="text-sm font-bold tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            {activeSymbol.label}
          </span>
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            {activeTimeframe.label}
          </span>
        </div>

        {/* ── Symbol pills by category ──────────────── */}
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-1">
            <span
              className="flex items-center gap-0.5 text-[10px] uppercase tracking-wider mr-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {CATEGORY_ICON[cat]}
              {CATEGORY_LABEL[cat]}
            </span>
            {SYMBOLS.filter((s) => s.category === cat).map((sym) => {
              const isActive = sym.tv === activeSymbol.tv;
              return (
                <button
                  key={sym.tv}
                  onClick={() => setActiveSymbol(sym)}
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium transition-all duration-150 border"
                  style={{
                    background: isActive
                      ? "rgba(6,182,212,0.15)"
                      : "rgba(255,255,255,0.03)",
                    borderColor: isActive
                      ? "rgba(6,182,212,0.4)"
                      : "var(--border)",
                    color: isActive
                      ? "rgb(6,182,212)"
                      : "var(--text-primary)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {sym.label}
                </button>
              );
            })}
          </div>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── Timeframe pills ───────────────────────── */}
        <div className="flex items-center gap-1">
          <span
            className="text-[10px] uppercase tracking-wider mr-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            Intervalle
          </span>
          {TIMEFRAMES.map((tf) => {
            const isActive = tf.interval === activeTimeframe.interval;
            return (
              <button
                key={tf.interval}
                onClick={() => setActiveTimeframe(tf)}
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all duration-150 border"
                style={{
                  background: isActive
                    ? "rgba(6,182,212,0.15)"
                    : "rgba(255,255,255,0.03)",
                  borderColor: isActive
                    ? "rgba(6,182,212,0.4)"
                    : "var(--border)",
                  color: isActive
                    ? "rgb(6,182,212)"
                    : "var(--text-primary)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {tf.label}
              </button>
            );
          })}
        </div>

        {/* ── Fullscreen button ─────────────────────── */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Quitter le plein ecran" : "Plein ecran"}
          className="rounded-lg p-1.5 transition-all duration-150 border"
          style={{
            background: "rgba(255,255,255,0.03)",
            borderColor: "var(--border)",
            color: "var(--text-muted)",
            backdropFilter: "blur(8px)",
          }}
        >
          {isFullscreen ? (
            <Minimize className="w-3.5 h-3.5" />
          ) : (
            <Maximize className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* ── Chart container ─────────────────────────── */}
      <div
        ref={containerRef}
        className="tradingview-widget-container rounded-xl overflow-hidden flex-1"
        style={{
          height: isFullscreen ? "calc(100vh - 44px)" : "calc(100vh - 80px)",
          border: "1px solid var(--border)",
        }}
      />
    </div>
  );
}
