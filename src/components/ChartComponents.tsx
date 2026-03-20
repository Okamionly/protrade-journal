"use client";

import { useEffect, useRef } from "react";
import { Chart, registerables, Filler } from "chart.js";
import { Trade } from "@/hooks/useTrades";
import { useTheme } from "next-themes";
import { MonthlyData, EmotionPerformance } from "@/lib/utils";

Chart.register(...registerables, Filler);

interface EquityChartProps {
  trades: Trade[];
  startingBalance: number;
}

export function EquityChart({ trades, startingBalance }: EquityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const equityData = sorted.reduce<number[]>((acc, trade, i) => {
      const prev = i > 0 ? acc[i - 1] : startingBalance;
      acc.push(prev + trade.result);
      return acc;
    }, []);

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: sorted.map((t) => new Date(t.date).toLocaleDateString("fr-FR")),
        datasets: [
          {
            label: "Equity",
            data: equityData,
            borderColor: "#0ea5e9",
            backgroundColor: "rgba(14, 165, 233, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: gridColor }, ticks: { color: textColor } },
          x: { grid: { display: false }, ticks: { color: textColor } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [trades, startingBalance, theme]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
}

export function StrategyChart({ trades }: { trades: Trade[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";

    const strategies: Record<string, number> = {};
    trades.forEach((t) => {
      strategies[t.strategy] = (strategies[t.strategy] || 0) + 1;
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: Object.keys(strategies),
        datasets: [
          {
            data: Object.values(strategies),
            backgroundColor: ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "right", labels: { color: textColor } } },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [trades, theme]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
}

export function WeekdayChart({ trades }: { trades: Trade[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

    const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
    const weekdayData = [0, 0, 0, 0, 0];
    trades.forEach((t) => {
      const day = new Date(t.date).getDay();
      if (day >= 1 && day <= 5) weekdayData[day - 1] += t.result;
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: weekdays,
        datasets: [
          {
            label: "P&L (€)",
            data: weekdayData,
            backgroundColor: weekdayData.map((v) => (v >= 0 ? "#10b981" : "#ef4444")),
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: gridColor }, ticks: { color: textColor } },
          x: { grid: { display: false }, ticks: { color: textColor } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [trades, theme]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
}

export function MonthlyComparisonChart({ data }: { data: MonthlyData[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: "P&L (€)",
            data: data.map((d) => d.pnl),
            backgroundColor: data.map((d) => (d.pnl >= 0 ? "#10b981" : "#ef4444")),
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: gridColor }, ticks: { color: textColor, callback: (v) => `€${v}` } },
          x: { grid: { display: false }, ticks: { color: textColor } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [data, theme]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
}

export function EmotionChart({ data }: { data: EmotionPerformance[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: data.map((d) => d.emotion),
        datasets: [
          {
            label: "P&L Moyen (€)",
            data: data.map((d) => d.avgPnL),
            backgroundColor: data.map((d) => (d.avgPnL >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)")),
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: gridColor }, ticks: { color: textColor, callback: (v) => `€${v}` } },
          x: { grid: { display: false }, ticks: { color: textColor } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [data, theme]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
}

export function AdvancedEquityChart({ trades }: { trades: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvasRef.current || trades.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const isDark = theme === "dark" || theme === "oled";
    const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const textColor = isDark ? "rgba(255,255,255,0.6)" : "#64748b";

    const sorted = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Compute cumulative equity brute (raw P&L)
    const equityBrute: number[] = [];
    // Compute cumulative equity nette (P&L minus commissions and swaps)
    const equityNette: number[] = [];

    sorted.forEach((trade, i) => {
      const prevBrute = i > 0 ? equityBrute[i - 1] : 0;
      const prevNette = i > 0 ? equityNette[i - 1] : 0;
      equityBrute.push(prevBrute + (trade.result ?? 0));
      const commission = trade.commission ?? 0;
      const swap = trade.swap ?? 0;
      equityNette.push(prevNette + (trade.result ?? 0) - Math.abs(commission) - Math.abs(swap));
    });

    // Compute drawdown % based on equity brute
    const drawdownPct: number[] = [];
    let peak = 0;
    equityBrute.forEach((eq) => {
      if (eq > peak) peak = eq;
      const dd = peak > 0 ? ((eq - peak) / peak) * 100 : 0;
      drawdownPct.push(dd);
    });

    // High watermark value (peak equity)
    const highWatermark = Math.max(...equityBrute, 0);

    const labels = sorted.map((t) =>
      new Date(t.date).toLocaleDateString("fr-FR")
    );

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Equity Brute",
            data: equityBrute,
            borderColor: "#10b981",
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            yAxisID: "y",
          },
          {
            label: "Equity Nette",
            data: equityNette,
            borderColor: "#06b6d4",
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            yAxisID: "y",
          },
          {
            label: "Drawdown %",
            data: drawdownPct,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.2)",
            borderWidth: 1,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            yAxisID: "y1",
          },
          {
            label: "High Watermark",
            data: Array(labels.length).fill(highWatermark),
            borderColor: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.25)",
            borderDash: [6, 4],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            yAxisID: "y",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: textColor,
            },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor },
          },
          y: {
            type: "linear",
            position: "left",
            title: {
              display: true,
              text: "Equity (€)",
              color: textColor,
            },
            grid: { color: gridColor },
            ticks: { color: textColor },
          },
          y1: {
            type: "linear",
            position: "right",
            title: {
              display: true,
              text: "Drawdown (%)",
              color: textColor,
            },
            grid: { drawOnChartArea: false },
            ticks: {
              color: textColor,
              callback: (v: string | number) => `${v}%`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [trades, theme]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
}
