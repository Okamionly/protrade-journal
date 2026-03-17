"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Bell, Star, Search } from "lucide-react";

interface WatchItem {
  symbol: string;
  name: string;
  alertPrice?: number;
  alertDirection?: "above" | "below";
  notes?: string;
}

interface Quote {
  symbol: string;
  last: number;
  change: number;
  changepct: number;
  volume: number;
  bid: number;
  ask: number;
  high52: number;
  low52: number;
  updated: number;
}

const POPULAR_SYMBOLS = [
  { symbol: "AAPL", name: "Apple" }, { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" }, { symbol: "AMZN", name: "Amazon" },
  { symbol: "NVDA", name: "NVIDIA" }, { symbol: "META", name: "Meta" },
  { symbol: "TSLA", name: "Tesla" }, { symbol: "AMD", name: "AMD" },
  { symbol: "SPY", name: "S&P 500 ETF" }, { symbol: "QQQ", name: "Nasdaq 100 ETF" },
  { symbol: "IWM", name: "Russell 2000" }, { symbol: "GLD", name: "Gold ETF" },
];

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addSymbol, setAddSymbol] = useState("");
  const [addName, setAddName] = useState("");
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertDir, setAlertDir] = useState<"above" | "below">("above");

  useEffect(() => {
    const saved = localStorage.getItem("watchlist-items");
    if (saved) setItems(JSON.parse(saved));
    else setItems(POPULAR_SYMBOLS.slice(0, 6));
  }, []);

  const saveItems = (newItems: WatchItem[]) => {
    setItems(newItems);
    localStorage.setItem("watchlist-items", JSON.stringify(newItems));
  };

  const fetchQuotes = useCallback(async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const symbols = items.map((i) => i.symbol).join(",");
      const res = await fetch(`/api/market-data/quotes?symbols=${symbols}`);
      if (res.ok) {
        const data = await res.json();
        if (data.s === "ok" && data.symbol) {
          const newQuotes: Record<string, Quote> = {};
          data.symbol.forEach((sym: string, idx: number) => {
            newQuotes[sym] = {
              symbol: sym,
              last: data.last?.[idx] || 0,
              change: data.change?.[idx] || 0,
              changepct: data.changepct?.[idx] || 0,
              volume: data.volume?.[idx] || 0,
              bid: data.bid?.[idx] || 0,
              ask: data.ask?.[idx] || 0,
              high52: data["52weekHigh"]?.[idx] || 0,
              low52: data["52weekLow"]?.[idx] || 0,
              updated: data.updated?.[idx] || 0,
            };
          });
          setQuotes(newQuotes);
        }
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [items]);

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  const addItem = () => {
    if (!addSymbol.trim()) return;
    const sym = addSymbol.trim().toUpperCase();
    if (items.some((i) => i.symbol === sym)) return;
    saveItems([...items, { symbol: sym, name: addName || sym }]);
    setAddSymbol("");
    setAddName("");
    setShowAdd(false);
  };

  const removeItem = (symbol: string) => {
    saveItems(items.filter((i) => i.symbol !== symbol));
  };

  const setAlert = (symbol: string) => {
    const price = parseFloat(alertPrice);
    if (isNaN(price)) return;
    saveItems(items.map((i) => i.symbol === symbol ? { ...i, alertPrice: price, alertDirection: alertDir } : i));
    setAlertSymbol(null);
    setAlertPrice("");
  };

  // Check alerts
  useEffect(() => {
    items.forEach((item) => {
      if (item.alertPrice && quotes[item.symbol]) {
        const q = quotes[item.symbol];
        if (item.alertDirection === "above" && q.last >= item.alertPrice) {
          if (Notification.permission === "granted") {
            new Notification(`${item.symbol} a atteint ${q.last}$`, { body: `Alerte: prix au-dessus de ${item.alertPrice}$` });
          }
        }
        if (item.alertDirection === "below" && q.last <= item.alertPrice) {
          if (Notification.permission === "granted") {
            new Notification(`${item.symbol} est tombé à ${q.last}$`, { body: `Alerte: prix en-dessous de ${item.alertPrice}$` });
          }
        }
      }
    });
  }, [quotes, items]);

  const filtered = search ? items.filter((i) => i.symbol.includes(search.toUpperCase()) || i.name.toLowerCase().includes(search.toLowerCase())) : items;

  const formatVolume = (v: number) => {
    if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
    return v.toString();
  };

  // Mini sparkline SVG
  const Sparkline = ({ change }: { change: number }) => {
    const isUp = change >= 0;
    const points = isUp ? "0,20 5,18 10,15 15,12 20,14 25,10 30,8 35,5 40,3" : "0,3 5,5 10,8 15,10 20,14 25,12 30,15 35,18 40,20";
    return (
      <svg width="40" height="20" viewBox="0 0 40 20" className="inline-block">
        <polyline points={points} fill="none" stroke={isUp ? "#10b981" : "#ef4444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Watchlist</h1>
          <p className="text-sm text-[--text-secondary]">Suivez vos instruments en temps réel</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchQuotes} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-[--text-secondary] hover:text-[--text-primary] text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Rafraîchir
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un symbole..."
          className="input-field pl-10"
        />
      </div>

      {/* Add Symbol */}
      {showAdd && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-[--text-primary] mb-3">Ajouter un instrument</h3>
          <div className="flex gap-3 mb-4">
            <input type="text" value={addSymbol} onChange={(e) => setAddSymbol(e.target.value.toUpperCase())} placeholder="Symbole (ex: AAPL)" className="input-field w-40" />
            <input type="text" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Nom (optionnel)" className="input-field flex-1" />
            <button onClick={addItem} className="px-6 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium text-sm">Ajouter</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SYMBOLS.filter((p) => !items.some((i) => i.symbol === p.symbol)).map((p) => (
              <button
                key={p.symbol}
                onClick={() => saveItems([...items, p])}
                className="px-3 py-1.5 rounded-lg text-xs glass text-[--text-secondary] hover:text-[--text-primary] hover:border-cyan-500/30"
              >
                + {p.symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[--border-subtle]">
              <th className="text-left text-xs font-semibold text-[--text-muted] p-4">Symbole</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Prix</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4">Change</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden md:table-cell">%</th>
              <th className="text-center text-xs font-semibold text-[--text-muted] p-4 hidden lg:table-cell">Tendance</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden lg:table-cell">Volume</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden xl:table-cell">Bid/Ask</th>
              <th className="text-right text-xs font-semibold text-[--text-muted] p-4 hidden xl:table-cell">52W Range</th>
              <th className="text-center text-xs font-semibold text-[--text-muted] p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const q = quotes[item.symbol];
              const isUp = q ? q.change >= 0 : true;
              return (
                <tr key={item.symbol} className="border-b border-[--border-subtle] hover:bg-[--bg-hover] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                        {item.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[--text-primary]">{item.symbol}</p>
                        <p className="text-xs text-[--text-muted]">{item.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-sm font-bold mono text-[--text-primary]">{q ? `$${q.last.toFixed(2)}` : "—"}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`text-sm font-medium mono ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                      {q ? `${isUp ? "+" : ""}${q.change.toFixed(2)}` : "—"}
                    </span>
                  </td>
                  <td className="p-4 text-right hidden md:table-cell">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {q ? `${isUp ? "+" : ""}${q.changepct.toFixed(2)}%` : "—"}
                    </span>
                  </td>
                  <td className="p-4 text-center hidden lg:table-cell">
                    {q ? <Sparkline change={q.change} /> : "—"}
                  </td>
                  <td className="p-4 text-right hidden lg:table-cell">
                    <span className="text-xs text-[--text-secondary] mono">{q ? formatVolume(q.volume) : "—"}</span>
                  </td>
                  <td className="p-4 text-right hidden xl:table-cell">
                    <span className="text-xs text-[--text-secondary] mono">{q ? `${q.bid.toFixed(2)} / ${q.ask.toFixed(2)}` : "—"}</span>
                  </td>
                  <td className="p-4 text-right hidden xl:table-cell">
                    <span className="text-xs text-[--text-secondary] mono">{q ? `${q.low52.toFixed(0)} — ${q.high52.toFixed(0)}` : "—"}</span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setAlertSymbol(item.symbol); setAlertPrice(q ? q.last.toFixed(2) : ""); }}
                        className={`p-1.5 rounded-lg hover:bg-[--bg-secondary] ${item.alertPrice ? "text-amber-400" : "text-[--text-muted]"}`}
                        title="Alerte prix"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeItem(item.symbol)} className="p-1.5 rounded-lg hover:bg-[--bg-secondary] text-[--text-muted] hover:text-rose-400" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[--text-muted]">
            <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Votre watchlist est vide</p>
            <p className="text-sm mt-1">Ajoutez des instruments pour commencer</p>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      {alertSymbol && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAlertSymbol(null)}>
          <div className="glass rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[--text-primary] mb-4">Alerte pour {alertSymbol}</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <select value={alertDir} onChange={(e) => setAlertDir(e.target.value as "above" | "below")} className="input-field w-40">
                  <option value="above">Au-dessus de</option>
                  <option value="below">En-dessous de</option>
                </select>
                <input type="number" value={alertPrice} onChange={(e) => setAlertPrice(e.target.value)} placeholder="Prix" className="input-field flex-1" step="0.01" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAlert(alertSymbol)} className="flex-1 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium text-sm">Définir l&apos;alerte</button>
                <button onClick={() => setAlertSymbol(null)} className="px-4 py-2 rounded-xl glass text-[--text-secondary] text-sm">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
