"use client";

import { useEffect, useRef } from "react";

export default function ChartPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Clear previous widget
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "FX:EURUSD",
      interval: "60",
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
    widgetDiv.style.height = "calc(100vh - 120px)";
    widgetDiv.style.width = "100%";

    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, []);

  return (
    <div className="p-4">
      <div
        ref={containerRef}
        className="tradingview-widget-container rounded-2xl overflow-hidden"
        style={{
          height: "calc(100vh - 120px)",
          border: "1px solid var(--border)",
        }}
      />
    </div>
  );
}
