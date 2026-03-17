"use client";

import { useState, useEffect, useMemo } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import {
  Play, Rewind, FastForward, Target, TrendingUp,
  TrendingDown, Camera, Edit3, Calculator, ArrowRight,
} from "lucide-react";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function PriceChart({ trade, whatIfSL, whatIfTP }: { trade: Trade; whatIfSL: number | null; whatIfTP: number | null }) {
  const isLong = trade.direction === "LONG";
  const prices = [trade.entry, trade.sl, trade.tp, trade.exit ?? trade.entry];
  if (whatIfSL !== null) prices.push(whatIfSL);
  if (whatIfTP !== null) prices.push(whatIfTP);
  const min = Math.min(...prices) * 0.9995;
  const max = Math.max(...prices) * 1.0005;
  const range = max - min || 1;
  const toY = (p: number) => 100 - ((p - min) / range) * 100;

  const markers = [
    { price: trade.entry, label: "Entrée", color: "#10b981", x: 15 },
    { price: trade.sl, label: "SL", color: "#f43f5e", x: 35 },
    { price: trade.tp, label: "TP", color: "#06b6d4", x: 60 },
    { price: trade.exit ?? trade.entry, label: "Sortie", color: "#eab308", x: 85 },
  ];

  return (
    <div className="metric-card p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
        <Play className="w-4 h-4 text-cyan-400" /> Visualisation du Trade
      </h3>
      <div className="relative h-56 rounded-lg" style={{ background: "var(--bg-hover)" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
          ))}
          {/* Entry to Exit path */}
          <line
            x1={markers[0].x} y1={toY(trade.entry)}
            x2={markers[3].x} y2={toY(trade.exit ?? trade.entry)}
            stroke={isLong ? "#10b981" : "#f43f5e"} strokeWidth="0.6" strokeDasharray="2,1" opacity="0.5"
          />
          {/* SL zone */}
          <rect x="5" y={Math.min(toY(trade.entry), toY(trade.sl))} width="90"
            height={Math.abs(toY(trade.entry) - toY(trade.sl))} fill="#f43f5e" opacity="0.06" />
          {/* TP zone */}
          <rect x="5" y={Math.min(toY(trade.entry), toY(trade.tp))} width="90"
            height={Math.abs(toY(trade.entry) - toY(trade.tp))} fill="#10b981" opacity="0.06" />
          {/* What-if SL line */}
          {whatIfSL !== null && (
            <line x1="5" y1={toY(whatIfSL)} x2="95" y2={toY(whatIfSL)}
              stroke="#f43f5e" strokeWidth="0.4" strokeDasharray="1.5,1" opacity="0.7" />
          )}
          {/* What-if TP line */}
          {whatIfTP !== null && (
            <line x1="5" y1={toY(whatIfTP)} x2="95" y2={toY(whatIfTP)}
              stroke="#06b6d4" strokeWidth="0.4" strokeDasharray="1.5,1" opacity="0.7" />
          )}
          {/* Markers */}
          {markers.map((m) => (
            <g key={m.label}>
              <circle cx={m.x} cy={toY(m.price)} r="2.2" fill={m.color} />
              <circle cx={m.x} cy={toY(m.price)} r="3.5" fill="none" stroke={m.color} strokeWidth="0.3" opacity="0.5" />
              <line x1={m.x} y1={toY(m.price) - 4} x2={m.x} y2={toY(m.price) + 4}
                stroke={m.color} strokeWidth="0.3" opacity="0.4" />
            </g>
          ))}
        </svg>
        {/* Price labels */}
        {markers.map((m) => (
          <div key={m.label} className="absolute text-[10px] font-mono"
            style={{ left: `${m.x}%`, top: `${toY(m.price)}%`, transform: "translate(-50%, -180%)", color: m.color }}>
            <span className="block text-center">{m.label}</span>
            <span className="block text-center opacity-75">{m.price.toFixed(5)}</span>
          </div>
        ))}
        {/* Y-axis price scale */}
        <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-between py-2">
          {[max, (max + min) / 2, min].map((p, i) => (
            <span key={i} className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>
              {p.toFixed(4)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReplayPage() {
  const { trades, loading } = useTrades();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [whatIfSL, setWhatIfSL] = useState<string>("");
  const [whatIfTP, setWhatIfTP] = useState<string>("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState(false);
  const [currentNote, setCurrentNote] = useState("");

  // Load notes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("replay-notes");
    if (saved) setNotes(JSON.parse(saved));
  }, []);

  const saveNote = (tradeId: string, text: string) => {
    const updated = { ...notes, [tradeId]: text };
    setNotes(updated);
    localStorage.setItem("replay-notes", JSON.stringify(updated));
    setEditingNote(false);
  };

  const closedTrades = useMemo(() => trades.filter((t) => t.exit !== null), [trades]);
  const selected = useMemo(() => closedTrades.find((t) => t.id === selectedId) ?? null, [closedTrades, selectedId]);

  // Auto-select first trade
  useEffect(() => {
    if (!selectedId && closedTrades.length > 0) setSelectedId(closedTrades[0].id);
  }, [closedTrades, selectedId]);

  // Reset what-if on trade change
  useEffect(() => {
    setWhatIfSL("");
    setWhatIfTP("");
    setEditingNote(false);
    if (selected) setCurrentNote(notes[selected.id] || "");
  }, [selectedId, selected, notes]);

  const navigate = (dir: number) => {
    const idx = closedTrades.findIndex((t) => t.id === selectedId);
    const next = idx + dir;
    if (next >= 0 && next < closedTrades.length) setSelectedId(closedTrades[next].id);
  };

  // What-if calculations
  const whatIfCalc = useMemo(() => {
    if (!selected) return null;
    const isLong = selected.direction === "LONG";
    const slNum = whatIfSL ? parseFloat(whatIfSL) : null;
    const tpNum = whatIfTP ? parseFloat(whatIfTP) : null;

    const originalPL = selected.result;
    let modifiedPL = originalPL;

    if (slNum !== null && !isNaN(slNum)) {
      const wouldHitSL = isLong
        ? (selected.exit ?? selected.entry) <= slNum
        : (selected.exit ?? selected.entry) >= slNum;
      if (wouldHitSL) {
        modifiedPL = isLong
          ? (slNum - selected.entry) * selected.lots * 100000
          : (selected.entry - slNum) * selected.lots * 100000;
      }
    }
    if (tpNum !== null && !isNaN(tpNum)) {
      const wouldHitTP = isLong
        ? (selected.exit ?? selected.entry) >= tpNum
        : (selected.exit ?? selected.entry) <= tpNum;
      if (wouldHitTP) {
        modifiedPL = isLong
          ? (tpNum - selected.entry) * selected.lots * 100000
          : (selected.entry - tpNum) * selected.lots * 100000;
      }
    }

    return { originalPL, modifiedPL, diff: modifiedPL - originalPL };
  }, [selected, whatIfSL, whatIfTP]);

  // Trade stats
  const stats = useMemo(() => {
    if (!selected) return null;
    const isLong = selected.direction === "LONG";
    const riskPips = Math.abs(selected.entry - selected.sl);
    const rewardPips = Math.abs(selected.tp - selected.entry);
    const rr = riskPips > 0 ? (rewardPips / riskPips).toFixed(2) : "N/A";
    const riskAmount = riskPips * selected.lots * 100000;
    const rewardAmount = rewardPips * selected.lots * 100000;
    return { rr, riskAmount, rewardAmount, isLong };
  }, [selected]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
        Chargement...
      </div>
    );
  }

  if (closedTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Rewind className="w-10 h-10 text-cyan-400 opacity-50" />
        <p style={{ color: "var(--text-muted)" }}>Aucun trade clôturé à rejouer</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <Play className="w-6 h-6 text-cyan-400" /> Replay de Trade
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Analysez et rejouez vos trades avec le simulateur What-If
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="glass p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: "var(--text-secondary)" }}>
            <Rewind className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-3" style={{ color: "var(--text-muted)" }}>
            {closedTrades.findIndex((t) => t.id === selectedId) + 1}/{closedTrades.length}
          </span>
          <button onClick={() => navigate(1)} className="glass p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: "var(--text-secondary)" }}>
            <FastForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trade Selector */}
      <div className="metric-card p-4">
        <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>
          Sélectionner un trade
        </label>
        <select
          value={selectedId || ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-mono outline-none border border-white/10 focus:border-cyan-400/50 transition-colors"
          style={{ background: "var(--bg-hover)", color: "var(--text-primary)" }}
        >
          {closedTrades.map((t) => (
            <option key={t.id} value={t.id}>
              {t.asset} — {formatDate(t.date)} — {t.direction} — {t.result >= 0 ? "+" : ""}{t.result.toFixed(2)}€
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <>
          {/* Visual Chart */}
          <PriceChart
            trade={selected}
            whatIfSL={whatIfSL ? parseFloat(whatIfSL) : null}
            whatIfTP={whatIfTP ? parseFloat(whatIfTP) : null}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trade Details */}
            <div className="metric-card p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Target className="w-4 h-4 text-cyan-400" /> Détails du Trade
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Actif", value: selected.asset },
                  { label: "Direction", value: selected.direction, color: selected.direction === "LONG" ? "text-emerald-400" : "text-rose-400" },
                  { label: "Date", value: formatDate(selected.date) },
                  { label: "Lots", value: selected.lots.toString() },
                  { label: "Entrée", value: selected.entry.toFixed(5) },
                  { label: "Sortie", value: (selected.exit ?? 0).toFixed(5) },
                  { label: "Stop Loss", value: selected.sl.toFixed(5) },
                  { label: "Take Profit", value: selected.tp.toFixed(5) },
                  { label: "Stratégie", value: selected.strategy || "—" },
                  { label: "Émotion", value: selected.emotion || "—" },
                  { label: "Tags", value: selected.tags || "—" },
                  { label: "Résultat", value: `${selected.result >= 0 ? "+" : ""}${selected.result.toFixed(2)}€`,
                    color: selected.result >= 0 ? "text-emerald-400" : "text-rose-400" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg p-2.5" style={{ background: "var(--bg-hover)" }}>
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                      {item.label}
                    </p>
                    <p className={`text-sm font-mono font-medium ${item.color || ""}`}
                      style={item.color ? undefined : { color: "var(--text-primary)" }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistics */}
            <div className="metric-card p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                {stats?.isLong ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
                Statistiques du Trade
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Ratio R:R", value: stats?.rr ?? "—", icon: Target },
                  { label: "Risque (€)", value: `${stats?.riskAmount.toFixed(2) ?? "0"}€`, icon: TrendingDown, color: "text-rose-400" },
                  { label: "Récompense (€)", value: `${stats?.rewardAmount.toFixed(2) ?? "0"}€`, icon: TrendingUp, color: "text-emerald-400" },
                  { label: "P&L réalisé", value: `${selected.result >= 0 ? "+" : ""}${selected.result.toFixed(2)}€`,
                    color: selected.result >= 0 ? "text-emerald-400" : "text-rose-400", icon: Target },
                  { label: "Émotion", value: selected.emotion || "Non renseigné", icon: Edit3 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg p-3"
                    style={{ background: "var(--bg-hover)" }}>
                    <div className="flex items-center gap-2">
                      <item.icon className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                    </div>
                    <span className={`text-sm font-mono font-semibold ${item.color || ""}`}
                      style={item.color ? undefined : { color: "var(--text-primary)" }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* What-If Calculator */}
          <div className="metric-card p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Calculator className="w-4 h-4 text-cyan-400" /> Calculateur What-If
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                  Si j&apos;avais déplacé mon SL à...
                </label>
                <input type="number" step="any" value={whatIfSL} onChange={(e) => setWhatIfSL(e.target.value)}
                  placeholder={selected.sl.toFixed(5)}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none border border-white/10 focus:border-rose-400/50 transition-colors"
                  style={{ background: "var(--bg-hover)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                  Si j&apos;avais déplacé mon TP à...
                </label>
                <input type="number" step="any" value={whatIfTP} onChange={(e) => setWhatIfTP(e.target.value)}
                  placeholder={selected.tp.toFixed(5)}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none border border-cyan-400/50 transition-colors"
                  style={{ background: "var(--bg-hover)", color: "var(--text-primary)" }} />
              </div>
            </div>
            {whatIfCalc && (whatIfSL || whatIfTP) && (
              <div className="rounded-lg p-4 flex items-center justify-between" style={{ background: "var(--bg-hover)" }}>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>P&L Original</p>
                  <p className={`text-lg font-mono font-bold ${whatIfCalc.originalPL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {whatIfCalc.originalPL >= 0 ? "+" : ""}{whatIfCalc.originalPL.toFixed(2)}€
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-cyan-400" />
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>P&L Modifié</p>
                  <p className={`text-lg font-mono font-bold ${whatIfCalc.modifiedPL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {whatIfCalc.modifiedPL >= 0 ? "+" : ""}{whatIfCalc.modifiedPL.toFixed(2)}€
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-cyan-400" />
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Différence</p>
                  <p className={`text-lg font-mono font-bold ${whatIfCalc.diff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {whatIfCalc.diff >= 0 ? "+" : ""}{whatIfCalc.diff.toFixed(2)}€
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Screenshots Gallery */}
          {selected.screenshots && selected.screenshots.length > 0 && (
            <div className="metric-card p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Camera className="w-4 h-4 text-cyan-400" /> Captures d&apos;écran
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {selected.screenshots.map((ss) => (
                  <a key={ss.id} href={ss.url} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg overflow-hidden border border-white/5 hover:border-cyan-400/30 transition-colors">
                    <img src={ss.url} alt="Screenshot" className="w-full h-32 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notes & Annotations */}
          <div className="metric-card p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Edit3 className="w-4 h-4 text-cyan-400" /> Notes & Annotations
            </h3>
            {selected.setup && (
              <div className="rounded-lg p-3 mb-3" style={{ background: "var(--bg-hover)" }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Setup du trade</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{selected.setup}</p>
              </div>
            )}
            {editingNote ? (
              <div className="space-y-2">
                <textarea value={currentNote} onChange={(e) => setCurrentNote(e.target.value)} rows={4}
                  placeholder="Ajoutez vos observations, leçons apprises..."
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-white/10 focus:border-cyan-400/50 resize-none transition-colors"
                  style={{ background: "var(--bg-hover)", color: "var(--text-primary)" }} />
                <div className="flex gap-2">
                  <button onClick={() => saveNote(selected.id, currentNote)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors">
                    Sauvegarder
                  </button>
                  <button onClick={() => setEditingNote(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ color: "var(--text-muted)" }}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {notes[selected.id] ? (
                  <div className="rounded-lg p-3 mb-3" style={{ background: "var(--bg-hover)" }}>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                      {notes[selected.id]}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                    Aucune note pour ce trade
                  </p>
                )}
                <button onClick={() => { setCurrentNote(notes[selected.id] || ""); setEditingNote(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 transition-colors"
                  style={{ color: "var(--text-secondary)" }}>
                  <Edit3 className="w-3 h-3" /> {notes[selected.id] ? "Modifier la note" : "Ajouter une note"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
