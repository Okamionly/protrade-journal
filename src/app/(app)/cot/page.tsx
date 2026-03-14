"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import { fetchCotData, type CotParsed } from "@/lib/market/cot";
import { COT_CONTRACTS, COT_CATEGORIES } from "@/lib/market/constants";
import { RefreshCw, Search } from "lucide-react";

Chart.register(...registerables);

export default function CotPage() {
  const [asset, setAsset] = useState("EUR");
  const [category, setCategory] = useState<string>("Tous");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<CotParsed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const netChartRef = useRef<HTMLCanvasElement>(null);
  const netChartInstance = useRef<Chart | null>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstance = useRef<Chart | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchCotData(asset);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [asset]);

  useEffect(() => { load(); }, [load]);

  const filteredContracts = Object.entries(COT_CONTRACTS).filter(([key, c]) => {
    const matchCategory = category === "Tous" || c.category === category;
    const matchSearch = !search || key.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  useEffect(() => {
    if (!netChartRef.current || data.length === 0) return;
    if (netChartInstance.current) netChartInstance.current.destroy();

    netChartInstance.current = new Chart(netChartRef.current, {
      type: "line",
      data: {
        labels: data.map((d) => d.date.slice(5)),
        datasets: [
          { label: "Non-Commercials (Net)", data: data.map((d) => d.nonCommNet), borderColor: "#0ea5e9", fill: false, tension: 0.3, pointRadius: 1 },
          { label: "Commercials (Net)", data: data.map((d) => d.commNet), borderColor: "#10b981", fill: false, tension: 0.3, pointRadius: 1 },
          { label: "Retail (Net)", data: data.map((d) => d.retailNet), borderColor: "#f59e0b", fill: false, tension: 0.3, pointRadius: 1 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#94a3b8" } } },
        scales: {
          y: { grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#94a3b8" } },
          x: { grid: { display: false }, ticks: { color: "#94a3b8", maxTicksLimit: 12 } },
        },
      },
    });
    return () => { netChartInstance.current?.destroy(); };
  }, [data]);

  useEffect(() => {
    if (!barChartRef.current || data.length === 0) return;
    if (barChartInstance.current) barChartInstance.current.destroy();
    const last = data[data.length - 1];
    if (!last) return;

    barChartInstance.current = new Chart(barChartRef.current, {
      type: "bar",
      data: {
        labels: ["Non-Comm", "Commercials", "Retail"],
        datasets: [
          { label: "Long", data: [last.nonCommLong, last.commLong, last.retailLong], backgroundColor: "#10b981", borderRadius: 4 },
          { label: "Short", data: [last.nonCommShort, last.commShort, last.retailShort], backgroundColor: "#ef4444", borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#94a3b8" } } },
        scales: {
          y: { grid: { color: "rgba(255,255,255,0.1)" }, ticks: { color: "#94a3b8" } },
          x: { grid: { display: false }, ticks: { color: "#94a3b8" } },
        },
      },
    });
    return () => { barChartInstance.current?.destroy(); };
  }, [data]);

  const currentContract = COT_CONTRACTS[asset];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">COT Report — Commitment of Traders</h1>
        <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition" title="Rafraichir">
          <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Category tabs + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {COT_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${category === cat ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50" : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un symbole..."
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm" />
        </div>
      </div>

      {/* Asset grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {filteredContracts.map(([key, c]) => (
          <button key={key} onClick={() => setAsset(key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition text-left ${asset === key ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 ring-1 ring-cyan-500/30" : "glass text-gray-400 hover:text-white hover:border-gray-600 border border-transparent"}`}>
            <div className="font-bold text-sm">{key}</div>
            <div className="text-[10px] opacity-60 truncate">{c.name}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-xs">{currentContract?.category}</span>
        <span>{asset} — {currentContract?.name}</span>
        <span className="text-gray-600">|</span>
        <span className="mono text-gray-500">CFTC #{currentContract?.code}</span>
      </div>

      {error && <div className="glass rounded-xl p-4 text-rose-400 text-sm">{error}</div>}

      {loading ? (
        <div className="glass rounded-2xl p-6 animate-pulse"><div className="h-[300px] bg-gray-700/30 rounded" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {data.length > 0 && (() => {
              const last = data[data.length - 1];
              const prev = data.length > 1 ? data[data.length - 2] : null;
              return [
                { label: "Non-Commercials Net", value: last.nonCommNet, prev: prev?.nonCommNet, color: "text-cyan-400" },
                { label: "Commercials Net", value: last.commNet, prev: prev?.commNet, color: "text-emerald-400" },
                { label: "Open Interest", value: last.openInterest, prev: prev?.openInterest, color: "text-amber-400" },
              ].map((m) => {
                const change = m.prev != null ? m.value - m.prev : 0;
                return (
                  <div key={m.label} className="glass rounded-xl p-4">
                    <p className="text-xs text-gray-400">{m.label}</p>
                    <p className={`text-2xl font-bold mono ${m.color}`}>{m.value.toLocaleString()}</p>
                    {change !== 0 && (
                      <p className={`text-xs mono ${change > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {change > 0 ? "+" : ""}{change.toLocaleString()} vs sem. préc.
                      </p>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Net Positioning (52 semaines)</h3>
              <div className="chart-container"><canvas ref={netChartRef} /></div>
            </div>
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Long vs Short (dernière semaine)</h3>
              <div className="chart-container"><canvas ref={barChartRef} /></div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Données brutes (dernières 10 semaines)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-3">Date</th><th className="pb-3">NC Long</th><th className="pb-3">NC Short</th>
                    <th className="pb-3">NC Net</th><th className="pb-3">Comm Net</th><th className="pb-3">Retail Net</th><th className="pb-3">OI</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(-10).reverse().map((r) => (
                    <tr key={r.date} className="border-b border-gray-800">
                      <td className="py-2 mono text-gray-400">{r.date}</td>
                      <td className="py-2 mono">{r.nonCommLong.toLocaleString()}</td>
                      <td className="py-2 mono">{r.nonCommShort.toLocaleString()}</td>
                      <td className={`py-2 mono font-bold ${r.nonCommNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.nonCommNet.toLocaleString()}</td>
                      <td className={`py-2 mono ${r.commNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.commNet.toLocaleString()}</td>
                      <td className={`py-2 mono ${r.retailNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.retailNet.toLocaleString()}</td>
                      <td className="py-2 mono text-gray-400">{r.openInterest.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
