"use client";

import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { fetchMultipleFredSeries, type FredSeriesData } from "@/lib/market/fred";
import { TrendingUp, TrendingDown, Minus, X, RefreshCw } from "lucide-react";

Chart.register(...registerables);

export default function MacroPage() {
  const [series, setSeries] = useState<FredSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FredSeriesData | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMultipleFredSeries();
      setSeries(data);
    } catch {
      // silently fail — cards will be empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!chartRef.current || !selected) return;
    if (chartInstance.current) chartInstance.current.destroy();

    chartInstance.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels: selected.observations.map((o) => o.date),
        datasets: [{
          label: selected.label,
          data: selected.observations.map((o) => o.value),
          borderColor: "#0ea5e9",
          backgroundColor: "rgba(14,165,233,0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#94a3b8" } },
          x: { grid: { display: false }, ticks: { color: "#94a3b8", maxTicksLimit: 10 } },
        },
      },
    });

    return () => { chartInstance.current?.destroy(); };
  }, [selected]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Indicateurs Macro — FRED</h1>
        <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition" title="Rafraichir">
          <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-gray-700/50 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-700/50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {series.map((s) => (
            <button key={s.key} onClick={() => setSelected(s)}
              className={`glass rounded-2xl p-5 text-left transition hover:border-cyan-500/30 hover:ring-1 hover:ring-cyan-500/20 ${selected?.key === s.key ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">{s.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{s.frequency}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold mono">{s.latest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className="text-xs text-gray-500">{s.unit}</span>
              </div>
              <div className={`flex items-center gap-1 mt-1 text-xs ${s.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {s.change > 0 ? <TrendingUp className="w-3 h-3" /> : s.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                <span className="mono">{s.change >= 0 ? "+" : ""}{s.change.toFixed(2)} ({s.changePercent.toFixed(2)}%)</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail chart modal */}
      {selected && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{selected.label}</h3>
              <p className="text-xs text-gray-400">{selected.frequency} — {selected.unit} — {selected.observations.length} points</p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="chart-container"><canvas ref={chartRef} /></div>
        </div>
      )}
    </div>
  );
}
