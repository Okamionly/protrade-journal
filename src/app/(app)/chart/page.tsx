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
    // Also watch for class changes on html
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

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";

    el.appendChild(widgetDiv);
    el.appendChild(script);
  }, [theme]);

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
      className="relative flex flex-col"
      style={{
        margin: isFullscreen ? 0 : "-1.5rem -1rem -2.5rem -1rem",
        height: isFullscreen ? "100vh" : "calc(100vh - 48px)",
        background: theme === "dark" ? "#0a0a0f" : "#ffffff",
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

      {/* Chart — takes 100% of space */}
      <div
        ref={containerRef}
        className="flex-1 w-full"
        style={{ height: "100%" }}
      />
    </div>
  );
}
