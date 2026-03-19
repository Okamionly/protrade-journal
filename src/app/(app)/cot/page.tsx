"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import { fetchCotData, type CotParsed } from "@/lib/market/cot";
import { COT_CONTRACTS, COT_CATEGORIES } from "@/lib/market/constants";
import { RefreshCw, Search, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";

Chart.register(...registerables);

type ViewMode = "overview" | "detail";

interface CotOverviewRow {
  key: string;
  name: string;
  category: string;
  longPct: number;
  prevLongPct: number;
  shortPct: number;
  netPosition: number;
  prevNet: number;
  sentiment: "Haussier" | "Baissier";
  sentimentTrend: "up" | "down" | "flat";
  change: number;
}

export default function CotPage() {
  const [view, setView] = useState<ViewMode>("overview");
  const [asset, setAsset] = useState("EUR");
  const [category, setCategory] = useState<string>("Tous");
  const [search, setSearch] = useState("");
  const [overviewData, setOverviewData] = useState<CotOverviewRow[]>([]);
  const [detailData, setDetailData] = useState<CotParsed[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const netChartRef = useRef<HTMLCanvasElement>(null);
  const netChartInstance = useRef<Chart | null>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstance = useRef<Chart | null>(null);

  // Load overview data for all contracts
  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const keys = Object.keys(COT_CONTRACTS);
      const results = await Promise.allSettled(
        keys.map(async (key) => {
          const data = await fetchCotData(key, 4);
          return { key, data };
        })
      );

      const rows: CotOverviewRow[] = [];
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const { key, data } = result.value;
        if (data.length === 0) continue;
        const last = data[data.length - 1];
        const prev = data.length > 1 ? data[data.length - 2] : null;
        const contract = COT_CONTRACTS[key];
        const oi = last.openInterest || 1;
        const longPct = (last.nonCommLong / oi) * 100;
        const shortPct = (last.nonCommShort / oi) * 100;
        const prevLongPct = prev ? (prev.nonCommLong / (prev.openInterest || 1)) * 100 : longPct;
        const netPosition = last.nonCommNet;
        const prevNet = prev?.nonCommNet ?? netPosition;
        const changeNet = netPosition - prevNet;
        const sentiment = netPosition >= 0 ? "Haussier" : "Baissier";
        const sentimentTrend = changeNet > 0 ? "up" : changeNet < 0 ? "down" : "flat";

        rows.push({
          key,
          name: contract.name,
          category: contract.category,
          longPct,
          prevLongPct,
          shortPct,
          netPosition,
          prevNet,
          sentiment,
          sentimentTrend,
          change: prevNet !== 0 ? ((netPosition - prevNet) / Math.abs(prevNet)) * 100 : 0,
        });
      }
      setOverviewData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (key: string) => {
    setDetailLoading(true);
    try {
      const result = await fetchCotData(key, 52);
      setDetailData(result);
    } catch {
      setDetailData([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (view === "detail") loadDetail(asset);
  }, [view, asset, loadDetail]);

  const filteredRows = overviewData.filter((r) => {
    const matchCategory = category === "Tous" || r.category === category;
    const matchSearch = !search || r.key.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Detail charts
  useEffect(() => {
    if (view !== "detail" || !netChartRef.current || detailData.length === 0) return;
    if (netChartInstance.current) netChartInstance.current.destroy();

    netChartInstance.current = new Chart(netChartRef.current, {
      type: "line",
      data: {
        labels: detailData.map((d) => d.date.slice(5)),
        datasets: [
          { label: "Non-Commercials (Net)", data: detailData.map((d) => d.nonCommNet), borderColor: "#0ea5e9", fill: false, tension: 0.3, pointRadius: 1, borderWidth: 2 },
          { label: "Commercials (Net)", data: detailData.map((d) => d.commNet), borderColor: "#10b981", fill: false, tension: 0.3, pointRadius: 1, borderWidth: 2 },
          { label: "Retail (Net)", data: detailData.map((d) => d.retailNet), borderColor: "#f59e0b", fill: false, tension: 0.3, pointRadius: 1, borderWidth: 2 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#94a3b8" } } },
        scales: {
          y: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: "#94a3b8" } },
          x: { grid: { display: false }, ticks: { color: "#94a3b8", maxTicksLimit: 12 } },
        },
      },
    });
    return () => { netChartInstance.current?.destroy(); };
  }, [detailData, view]);

  useEffect(() => {
    if (view !== "detail" || !barChartRef.current || detailData.length === 0) return;
    if (barChartInstance.current) barChartInstance.current.destroy();
    const last = detailData[detailData.length - 1];
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
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#94a3b8" } } },
        scales: {
          y: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: "#94a3b8" } },
          x: { grid: { display: false }, ticks: { color: "#94a3b8" } },
        },
      },
    });
    return () => { barChartInstance.current?.destroy(); };
  }, [detailData, view]);

  const currentContract = COT_CONTRACTS[asset];

  const openDetail = (key: string) => {
    setAsset(key);
    setView("detail");
  };

  if (view === "detail") {
    const last = detailData.length > 0 ? detailData[detailData.length - 1] : null;
    const prev = detailData.length > 1 ? detailData[detailData.length - 2] : null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("overview")} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition">
            <ArrowLeft className="w-5 h-5 text-[--text-secondary]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{asset} — {currentContract?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-xs">{currentContract?.category}</span>
              <span className="mono text-xs text-[--text-muted]">CFTC #{currentContract?.code}</span>
            </div>
          </div>
          <button onClick={() => loadDetail(asset)} className="ml-auto p-2 rounded-lg hover:bg-[var(--bg-hover)] transition">
            <RefreshCw className={`w-5 h-5 text-[--text-secondary] ${detailLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {detailLoading ? (
          <div className="glass rounded-2xl p-6 animate-pulse"><div className="h-[300px] bg-[--bg-secondary]/30 rounded" /></div>
        ) : (
          <>
            {last && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Non-Comm Net", value: last.nonCommNet, prev: prev?.nonCommNet, color: "text-cyan-400" },
                  { label: "Commercials Net", value: last.commNet, prev: prev?.commNet, color: "text-emerald-400" },
                  { label: "Retail Net", value: last.retailNet, prev: prev?.retailNet, color: "text-amber-400" },
                  { label: "Open Interest", value: last.openInterest, prev: prev?.openInterest, color: "text-purple-400" },
                ].map((m) => {
                  const chg = m.prev != null ? m.value - m.prev : 0;
                  return (
                    <div key={m.label} className="glass rounded-xl p-4">
                      <p className="text-xs text-[--text-secondary] mb-1">{m.label}</p>
                      <p className={`text-xl font-bold mono ${m.color}`}>{m.value.toLocaleString()}</p>
                      {chg !== 0 && (
                        <p className={`text-xs mono mt-1 ${chg > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {chg > 0 ? "+" : ""}{chg.toLocaleString()} vs préc.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

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
              <h3 className="text-lg font-semibold mb-4">Données brutes (10 dernières semaines)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[--text-secondary] border-b border-[--border]">
                      <th className="pb-3 px-2">Date</th><th className="pb-3 px-2">NC Long</th><th className="pb-3 px-2">NC Short</th>
                      <th className="pb-3 px-2">NC Net</th><th className="pb-3 px-2">Comm Net</th><th className="pb-3 px-2">Retail Net</th><th className="pb-3 px-2">OI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.slice(-10).reverse().map((r) => (
                      <tr key={r.date} className="border-b border-[--border-subtle] hover:bg-[var(--bg-hover)]">
                        <td className="py-2.5 px-2 mono text-[--text-secondary]">{r.date}</td>
                        <td className="py-2.5 px-2 mono">{r.nonCommLong.toLocaleString()}</td>
                        <td className="py-2.5 px-2 mono">{r.nonCommShort.toLocaleString()}</td>
                        <td className={`py-2.5 px-2 mono font-bold ${r.nonCommNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.nonCommNet.toLocaleString()}</td>
                        <td className={`py-2.5 px-2 mono ${r.commNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.commNet.toLocaleString()}</td>
                        <td className={`py-2.5 px-2 mono ${r.retailNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.retailNet.toLocaleString()}</td>
                        <td className="py-2.5 px-2 mono text-[--text-secondary]">{r.openInterest.toLocaleString()}</td>
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

  // === OVERVIEW VIEW ===
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rapport COT</h1>
          <p className="text-sm text-[--text-secondary] mt-1">Analyse des positions des traders engagés</p>
        </div>
        <button onClick={loadOverview} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition" title="Rafraîchir">
          <RefreshCw className={`w-5 h-5 text-[--text-secondary] ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Category pills + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {COT_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                category === cat
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover] border border-[--border]"
              }`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher des symboles, des noms ou des secteurs..."
            className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg pl-10 pr-4 py-2 text-sm focus:border-cyan-500/50 focus:outline-none transition" />
        </div>
      </div>

      {error && <div className="glass rounded-xl p-4 text-rose-400 text-sm">{error}</div>}

      {loading ? (
        <div className="glass rounded-2xl p-6 animate-pulse">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 bg-[--bg-secondary]/30 rounded" />
            ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[--text-secondary] border-b border-[--border] text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Symbole</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Sentiment</th>
                  <th className="px-4 py-3">Long%</th>
                  <th className="px-4 py-3">Préc. Long%</th>
                  <th className="px-4 py-3">Court%</th>
                  <th className="px-4 py-3 text-right">Positif net</th>
                  <th className="px-4 py-3 text-right">Préc. Net</th>
                  <th className="px-4 py-3 text-right">Changement</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const changePct = r.change;
                  return (
                    <tr key={r.key}
                      onClick={() => openDetail(r.key)}
                      className="border-b border-[--border-subtle]/50 hover:bg-[var(--bg-hover)] cursor-pointer transition">
                      <td className="px-4 py-3 font-bold text-[--text-primary]">{r.key}</td>
                      <td className="px-4 py-3 text-[--text-secondary] text-xs">{r.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--bg-secondary]/50 text-[--text-secondary]">{r.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                          r.sentiment === "Haussier"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-rose-500/15 text-rose-400"
                        }`}>
                          {r.sentiment}
                        </span>
                        {r.sentimentTrend !== "flat" && (
                          <span className="ml-1.5">
                            {r.sentimentTrend === "up"
                              ? <TrendingUp className="w-3 h-3 text-emerald-400 inline" />
                              : <TrendingDown className="w-3 h-3 text-rose-400 inline" />}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(r.longPct, 100)}%` }} />
                          </div>
                          <span className="mono text-xs text-emerald-400">{r.longPct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 mono text-xs text-[--text-muted]">{r.prevLongPct.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-[--bg-secondary] rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(r.shortPct, 100)}%` }} />
                          </div>
                          <span className="mono text-xs text-rose-400">{r.shortPct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right mono font-bold ${r.netPosition >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {r.netPosition.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right mono text-xs text-[--text-muted]">{r.prevNet.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right mono text-xs font-medium ${changePct > 0 ? "text-emerald-400" : changePct < 0 ? "text-rose-400" : "text-[--text-muted]"}`}>
                        {changePct > 0 ? "+" : ""}{changePct.toFixed(2)}%
                        {changePct !== 0 && (
                          changePct > 0
                            ? <TrendingUp className="w-3 h-3 inline ml-1" />
                            : <TrendingDown className="w-3 h-3 inline ml-1" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && (
            <div className="p-8 text-center text-[--text-muted]">Aucun résultat avec ces filtres</div>
          )}
        </div>
      )}
    </div>
  );
}
