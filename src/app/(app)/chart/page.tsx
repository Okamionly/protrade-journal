"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Maximize, Minimize } from "lucide-react";

export default function ChartPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { window.removeEventListener("storage", detect); observer.disconnect(); };
  }, []);

  /* ── Build widget ──────────────────────────────────── */
  const buildWidget = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = "";

    const isDark = theme === "dark";
    const h = isFullscreen ? "calc(100vh - 4px)" : "calc(100vh - 144px)";

    // TradingView requires this exact HTML structure:
    // <div class="tradingview-widget-container">
    //   <div class="tradingview-widget-container__widget" style="height:X;width:100%"></div>
    //   <script src="..." type="text/javascript">{ config }</script>
    // </div>

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = h;
    widgetDiv.style.width = "100%";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "FX:EURUSD",
      interval: "60",
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
      details: true,
      hotlist: true,
      studies: ["Volume@tv-basicstudies"],
      withdateranges: true,
    });

    wrapper.appendChild(widgetDiv);
    wrapper.appendChild(script);
    el.appendChild(wrapper);
  }, [theme, isFullscreen]);

  useEffect(() => {
    buildWidget();
    return () => { if (containerRef.current) containerRef.current.innerHTML = ""; };
  }, [buildWidget]);

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

  return (
    <div
      ref={wrapperRef}
      className="relative"
      style={{
        margin: 0,
        height: isFullscreen ? "100vh" : "calc(100vh - 140px)",
        background: theme === "dark" ? "#0a0a0f" : "#ffffff",
        borderRadius: isFullscreen ? 0 : "12px",
        overflow: "hidden",
        border: isFullscreen ? "none" : `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
      }}
    >
      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? "Quitter" : "Plein écran"}
        className="absolute top-2 right-2 z-10 rounded-lg p-1.5 transition-all hover:scale-110"
        style={{
          background: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          color: theme === "dark" ? "#a0a0a0" : "#666",
        }}
      >
        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
      </button>

      {/* Chart */}
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
