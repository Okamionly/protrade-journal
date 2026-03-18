"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import {
  Play,
  Pause,
  RotateCcw,
  Rewind,
  FastForward,
  Target,
  TrendingUp,
  TrendingDown,
  Camera,
  Edit3,
  Calculator,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Star,
  Zap,
  Shield,
  Award,
  Clock,
  BarChart3,
  Activity,
} from "lucide-react";

/* ─── Helpers ─── */

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateGroup(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupByDate(trades: Trade[]): Record<string, Trade[]> {
  const groups: Record<string, Trade[]> = {};
  for (const t of trades) {
    const key = t.date.slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return groups;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* ─── Animated Price Chart ─── */

function AnimatedPriceChart({
  trade,
  progress,
}: {
  trade: Trade;
  progress: number; // 0..1
}) {
  const isLong = trade.direction === "LONG";
  const exitPrice = trade.exit ?? trade.entry;
  const isWin = trade.result >= 0;

  const allPrices = [trade.entry, trade.sl, trade.tp, exitPrice];
  const min = Math.min(...allPrices) * 0.9998;
  const max = Math.max(...allPrices) * 1.0002;
  const range = max - min || 1;
  const toY = (p: number) => 10 + ((max - p) / range) * 80;

  // Generate a pseudo-random but deterministic price path
  const pathPoints = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    const steps = 60;
    const seed = trade.id
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = 5 + t * 90;
      // Interpolate from entry to exit with noise
      const basePrice = trade.entry + (exitPrice - trade.entry) * t;
      // Deterministic noise based on seed and step
      const noiseAmplitude = range * 0.15;
      const noise =
        Math.sin(seed * 0.1 + i * 1.7) * noiseAmplitude * 0.5 +
        Math.sin(seed * 0.3 + i * 3.1) * noiseAmplitude * 0.3 +
        Math.sin(seed * 0.7 + i * 0.5) * noiseAmplitude * 0.2;
      const price = clamp(basePrice + noise, min, max);
      points.push({ x, y: toY(price) });
    }
    return points;
  }, [trade.id, trade.entry, exitPrice, min, max, range, toY]);

  // Build the visible portion of the path based on progress
  const visibleCount = Math.max(1, Math.floor(progress * pathPoints.length));
  const visiblePoints = pathPoints.slice(0, visibleCount);
  const pathD = visiblePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const currentPoint = visiblePoints[visiblePoints.length - 1];

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-full"
      style={{ overflow: "visible" }}
    >
      {/* Background grid */}
      {[0, 20, 40, 60, 80, 100].map((y) => (
        <line
          key={`g-${y}`}
          x1="0"
          y1={y}
          x2="100"
          y2={y}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.2"
        />
      ))}
      {[0, 20, 40, 60, 80, 100].map((x) => (
        <line
          key={`gv-${x}`}
          x1={x}
          y1="0"
          x2={x}
          y2="100"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="0.2"
        />
      ))}

      {/* SL zone fill */}
      <rect
        x="0"
        y={isLong ? toY(trade.entry) : toY(trade.sl)}
        width="100"
        height={Math.abs(toY(trade.entry) - toY(trade.sl))}
        fill="#f43f5e"
        opacity="0.04"
      />

      {/* TP zone fill */}
      <rect
        x="0"
        y={isLong ? toY(trade.tp) : toY(trade.entry)}
        width="100"
        height={Math.abs(toY(trade.tp) - toY(trade.entry))}
        fill="#10b981"
        opacity="0.04"
      />

      {/* Entry line - cyan dashed */}
      <line
        x1="0"
        y1={toY(trade.entry)}
        x2="100"
        y2={toY(trade.entry)}
        stroke="#06b6d4"
        strokeWidth="0.3"
        strokeDasharray="2,1.5"
        opacity="0.7"
      />
      <text
        x="1"
        y={toY(trade.entry) - 1.5}
        fontSize="2.8"
        fill="#06b6d4"
        fontFamily="monospace"
      >
        Entrée {trade.entry.toFixed(5)}
      </text>

      {/* SL line - red dashed */}
      <line
        x1="0"
        y1={toY(trade.sl)}
        x2="100"
        y2={toY(trade.sl)}
        stroke="#f43f5e"
        strokeWidth="0.3"
        strokeDasharray="1.5,1"
        opacity="0.7"
      />
      <text
        x="1"
        y={toY(trade.sl) + 4}
        fontSize="2.8"
        fill="#f43f5e"
        fontFamily="monospace"
      >
        SL {trade.sl.toFixed(5)}
      </text>

      {/* TP line - green dashed */}
      <line
        x1="0"
        y1={toY(trade.tp)}
        x2="100"
        y2={toY(trade.tp)}
        stroke="#10b981"
        strokeWidth="0.3"
        strokeDasharray="1.5,1"
        opacity="0.7"
      />
      <text
        x="1"
        y={toY(trade.tp) - 1.5}
        fontSize="2.8"
        fill="#10b981"
        fontFamily="monospace"
      >
        TP {trade.tp.toFixed(5)}
      </text>

      {/* Exit line - green if win, red if loss */}
      {progress >= 1 && (
        <>
          <line
            x1="0"
            y1={toY(exitPrice)}
            x2="100"
            y2={toY(exitPrice)}
            stroke={isWin ? "#10b981" : "#f43f5e"}
            strokeWidth="0.35"
            strokeDasharray="1,1"
            opacity="0.6"
          />
          <text
            x="70"
            y={toY(exitPrice) + (isWin === isLong ? 4 : -1.5)}
            fontSize="2.8"
            fill={isWin ? "#10b981" : "#f43f5e"}
            fontFamily="monospace"
          >
            Sortie {exitPrice.toFixed(5)}
          </text>
        </>
      )}

      {/* Price path */}
      <path
        d={pathD}
        fill="none"
        stroke={isWin ? "#10b981" : "#f43f5e"}
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Glow effect on path */}
      <path
        d={pathD}
        fill="none"
        stroke={isWin ? "#10b981" : "#f43f5e"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.15"
      />

      {/* Current position dot */}
      {currentPoint && (
        <>
          <circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r="1.8"
            fill={isWin ? "#10b981" : "#f43f5e"}
          />
          <circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r="3.5"
            fill="none"
            stroke={isWin ? "#10b981" : "#f43f5e"}
            strokeWidth="0.25"
            opacity="0.5"
          >
            <animate
              attributeName="r"
              from="2"
              to="5"
              dur="1.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from="0.6"
              to="0"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}

      {/* Entry marker */}
      <circle cx="5" cy={toY(trade.entry)} r="1.5" fill="#06b6d4" />

      {/* Exit marker when complete */}
      {progress >= 1 && (
        <circle
          cx="95"
          cy={toY(exitPrice)}
          r="1.5"
          fill={isWin ? "#10b981" : "#f43f5e"}
        />
      )}
    </svg>
  );
}

/* ─── Trade Score Calculator ─── */

function computeTradeScore(trade: Trade): {
  total: number;
  entryQuality: number;
  discipline: number;
  rrAchieved: number;
  details: { label: string; score: number; max: number; desc: string }[];
} {
  const isLong = trade.direction === "LONG";
  const exitPrice = trade.exit ?? trade.entry;

  // Entry quality: how close was entry to the ideal (far from SL, close to best entry)
  const riskDistance = Math.abs(trade.entry - trade.sl);
  const rewardDistance = Math.abs(trade.tp - trade.entry);
  const totalRange = riskDistance + rewardDistance;

  // Higher score if entry is closer to SL (better entry for a long, worse for short but we flip)
  let entryRatio = totalRange > 0 ? riskDistance / totalRange : 0.5;
  // A small risk distance relative to reward means a good entry
  const entryQuality = Math.round(clamp((1 - entryRatio) * 10, 0, 10));

  // Discipline: did result align with the strategy direction?
  // If trade hit TP or exited between entry and TP, good discipline
  let disciplineScore = 5; // base
  const exitDistFromEntry = isLong
    ? exitPrice - trade.entry
    : trade.entry - exitPrice;
  const tpDistFromEntry = isLong
    ? trade.tp - trade.entry
    : trade.entry - trade.tp;
  const slDistFromEntry = isLong
    ? trade.entry - trade.sl
    : trade.sl - trade.entry;

  if (tpDistFromEntry > 0) {
    const exitRatio = exitDistFromEntry / tpDistFromEntry;
    if (exitRatio >= 0.9) disciplineScore = 9; // exited near TP
    else if (exitRatio >= 0.5) disciplineScore = 7;
    else if (exitRatio >= 0) disciplineScore = 5;
    else {
      // Exited at loss
      if (slDistFromEntry > 0) {
        const lossRatio = Math.abs(exitDistFromEntry) / slDistFromEntry;
        if (lossRatio <= 1.05) disciplineScore = 6; // respected SL
        else disciplineScore = 2; // went past SL
      } else {
        disciplineScore = 3;
      }
    }
  }

  // R:R achieved vs planned
  const plannedRR =
    riskDistance > 0 ? rewardDistance / riskDistance : 1;
  const achievedRR =
    riskDistance > 0 ? exitDistFromEntry / riskDistance : 0;
  let rrScore = 5;
  if (plannedRR > 0) {
    const rrRatio = achievedRR / plannedRR;
    if (rrRatio >= 1) rrScore = 10;
    else if (rrRatio >= 0.75) rrScore = 8;
    else if (rrRatio >= 0.5) rrScore = 6;
    else if (rrRatio >= 0) rrScore = 4;
    else rrScore = Math.max(0, Math.round(3 + rrRatio * 3));
  }
  rrScore = clamp(rrScore, 0, 10);

  const total = Math.round((entryQuality + disciplineScore + rrScore) / 3);

  return {
    total: clamp(total, 0, 10),
    entryQuality,
    discipline: disciplineScore,
    rrAchieved: rrScore,
    details: [
      {
        label: "Qualité d'entrée",
        score: entryQuality,
        max: 10,
        desc: "Proximité de l'entrée par rapport au SL/TP",
      },
      {
        label: "Discipline",
        score: disciplineScore,
        max: 10,
        desc: "Respect du plan et de la stratégie",
      },
      {
        label: "R:R réalisé",
        score: rrScore,
        max: 10,
        desc: "Ratio risque/récompense obtenu vs prévu",
      },
    ],
  };
}

function getScoreColor(score: number) {
  if (score >= 8) return "#10b981";
  if (score >= 5) return "#eab308";
  return "#f43f5e";
}

function getScoreLabel(score: number) {
  if (score >= 9) return "Excellent";
  if (score >= 7) return "Bon";
  if (score >= 5) return "Moyen";
  if (score >= 3) return "Faible";
  return "Mauvais";
}

/* ─── Main Page ─── */

export default function ReplayPage() {
  const { trades, loading } = useTrades();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState(false);
  const [currentNote, setCurrentNote] = useState("");

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Load notes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("replay-notes");
      if (saved) setNotes(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const saveNote = (tradeId: string, text: string) => {
    const updated = { ...notes, [tradeId]: text };
    setNotes(updated);
    localStorage.setItem("replay-notes", JSON.stringify(updated));
    setEditingNote(false);
  };

  const closedTrades = useMemo(
    () =>
      trades
        .filter((t) => t.exit !== null)
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
    [trades]
  );

  const grouped = useMemo(() => groupByDate(closedTrades), [closedTrades]);
  const dateKeys = useMemo(
    () =>
      Object.keys(grouped).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      ),
    [grouped]
  );

  const selected = useMemo(
    () => closedTrades.find((t) => t.id === selectedId) ?? null,
    [closedTrades, selectedId]
  );

  const currentIndex = useMemo(
    () => closedTrades.findIndex((t) => t.id === selectedId),
    [closedTrades, selectedId]
  );

  // Auto-select first trade
  useEffect(() => {
    if (!selectedId && closedTrades.length > 0)
      setSelectedId(closedTrades[0].id);
  }, [closedTrades, selectedId]);

  // Reset on trade change
  useEffect(() => {
    setEditingNote(false);
    setIsPlaying(false);
    setProgress(0);
    if (selected) setCurrentNote(notes[selected.id] || "");
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      setProgress((prev) => {
        const next = prev + (delta / (4000 / speed));
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, speed]);

  const handlePlay = () => {
    if (progress >= 1) setProgress(0);
    setIsPlaying(true);
  };
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const navigate = useCallback(
    (dir: number) => {
      const idx = closedTrades.findIndex((t) => t.id === selectedId);
      const next = idx + dir;
      if (next >= 0 && next < closedTrades.length)
        setSelectedId(closedTrades[next].id);
    },
    [closedTrades, selectedId]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigate(1);
      } else if (e.key === " ") {
        e.preventDefault();
        if (isPlaying) handlePause();
        else handlePlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trade stats
  const stats = useMemo(() => {
    if (!selected) return null;
    const isLong = selected.direction === "LONG";
    const exitPrice = selected.exit ?? selected.entry;
    const riskPips = Math.abs(selected.entry - selected.sl);
    const rewardPips = Math.abs(selected.tp - selected.entry);
    const rr = riskPips > 0 ? rewardPips / riskPips : 0;
    const achievedPips = isLong
      ? exitPrice - selected.entry
      : selected.entry - exitPrice;
    const achievedRR = riskPips > 0 ? achievedPips / riskPips : 0;
    const riskAmount = riskPips * selected.lots * 100000;
    const rewardAmount = rewardPips * selected.lots * 100000;
    return { rr, achievedRR, riskAmount, rewardAmount, isLong, riskPips, rewardPips };
  }, [selected]);

  // What Would Have Happened - alternatives
  const alternatives = useMemo(() => {
    if (!selected || !stats) return null;
    const isLong = selected.direction === "LONG";
    const riskPips = stats.riskPips;
    const lotMultiplier = selected.lots * 100000;

    // 1R cut scenario
    const oneRTarget = isLong
      ? selected.entry + riskPips
      : selected.entry - riskPips;
    const oneRPL = riskPips * lotMultiplier;

    // Let it run to TP
    const tpPips = Math.abs(selected.tp - selected.entry);
    const tpPL = tpPips * lotMultiplier;

    // Double position
    const doublePL = selected.result * 2;

    return {
      cutAt1R: {
        label: "Si tu avais coupé à 1R",
        price: oneRTarget,
        pl: oneRPL,
      },
      letRunToTP: {
        label: "Si tu avais laissé courir au TP",
        price: selected.tp,
        pl: tpPL,
      },
      doublePosition: {
        label: "Si tu avais doublé ta position",
        lots: selected.lots * 2,
        pl: doublePL,
      },
    };
  }, [selected, stats]);

  // Trade score
  const score = useMemo(() => {
    if (!selected) return null;
    return computeTradeScore(selected);
  }, [selected]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        style={{ color: "var(--text-muted)" }}
      >
        <Activity className="w-5 h-5 animate-spin mr-2" />
        Chargement...
      </div>
    );
  }

  if (closedTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Rewind className="w-10 h-10 text-cyan-400 opacity-50" />
        <p style={{ color: "var(--text-muted)" }}>
          Aucun trade clôturé à rejouer
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-3"
            style={{ color: "var(--text-primary)" }}
          >
            <Play className="w-6 h-6 text-cyan-400" /> Replay de Trade
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Rejouez, analysez et scorez vos trades &mdash; Raccourcis: &larr;
            &rarr; naviguer, Espace play/pause
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            disabled={currentIndex <= 0}
            className="glass p-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-30"
            style={{ color: "var(--text-secondary)" }}
            title="Trade précédent (\←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className="text-xs mono px-3 py-1 rounded"
            style={{
              color: "var(--text-muted)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            {currentIndex + 1} / {closedTrades.length}
          </span>
          <button
            onClick={() => navigate(1)}
            disabled={currentIndex >= closedTrades.length - 1}
            className="glass p-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-30"
            style={{ color: "var(--text-secondary)" }}
            title="Trade suivant (\→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trade Selector - Grouped by Date */}
      <div className="glass rounded-xl p-4">
        <label
          className="text-xs font-medium mb-2 block"
          style={{ color: "var(--text-muted)" }}
        >
          Sélectionner un trade
        </label>
        <select
          value={selectedId || ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg px-4 py-2.5 text-sm mono outline-none transition-colors"
          style={{
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          {dateKeys.map((dateKey) => (
            <optgroup key={dateKey} label={formatDateGroup(dateKey)}>
              {grouped[dateKey].map((t) => (
                <option key={t.id} value={t.id}>
                  {t.asset} {t.direction === "LONG" ? "\▲" : "\▼"}{" "}
                  {t.direction} &mdash;{" "}
                  {t.result >= 0 ? "+" : ""}
                  {t.result.toFixed(2)}€
                  {t.strategy ? ` \— ${t.strategy}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {selected && (
        <>
          {/* Visual Trade Chart with Animation */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <BarChart3 className="w-4 h-4 text-cyan-400" /> Simulation du
                prix
              </h3>
              <div className="flex items-center gap-2">
                {/* Speed control */}
                <div className="flex items-center gap-1 mr-2">
                  <Gauge
                    className="w-3.5 h-3.5"
                    style={{ color: "var(--text-muted)" }}
                  />
                  {[1, 2, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className="px-2 py-0.5 rounded text-xs mono transition-all"
                      style={{
                        background:
                          speed === s
                            ? "rgba(6,182,212,0.2)"
                            : "rgba(255,255,255,0.05)",
                        color:
                          speed === s ? "#06b6d4" : "var(--text-muted)",
                        border:
                          speed === s
                            ? "1px solid rgba(6,182,212,0.3)"
                            : "1px solid transparent",
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                {/* Playback controls */}
                <button
                  onClick={handleReset}
                  className="glass p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-secondary)" }}
                  title="Réinitialiser"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                {isPlaying ? (
                  <button
                    onClick={handlePause}
                    className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                    style={{
                      background: "rgba(6,182,212,0.2)",
                      color: "#06b6d4",
                    }}
                    title="Pause"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handlePlay}
                    className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                    style={{
                      background: "rgba(6,182,212,0.2)",
                      color: "#06b6d4",
                    }}
                    title="Lecture (Espace)"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div
              className="w-full h-1 rounded-full mb-4 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress * 100}%`,
                  background:
                    selected.result >= 0
                      ? "linear-gradient(90deg, #06b6d4, #10b981)"
                      : "linear-gradient(90deg, #06b6d4, #f43f5e)",
                  transition: isPlaying ? "none" : "width 0.3s",
                }}
              />
            </div>

            {/* Chart */}
            <div
              className="relative rounded-lg overflow-hidden"
              style={{
                height: "280px",
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)",
              }}
            >
              <AnimatedPriceChart trade={selected} progress={progress} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trade Details Panel */}
            <div className="lg:col-span-1 glass rounded-xl p-5">
              <h3
                className="text-sm font-semibold mb-4 flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Target className="w-4 h-4 text-cyan-400" /> Détails du
                Trade
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: "Actif", value: selected.asset },
                  {
                    label: "Direction",
                    value: selected.direction,
                    color:
                      selected.direction === "LONG"
                        ? "#10b981"
                        : "#f43f5e",
                  },
                  { label: "Date", value: formatDate(selected.date) },
                  { label: "Lots", value: selected.lots.toString() },
                  {
                    label: "Entrée",
                    value: selected.entry.toFixed(5),
                    mono: true,
                  },
                  {
                    label: "Sortie",
                    value: (selected.exit ?? 0).toFixed(5),
                    mono: true,
                  },
                  {
                    label: "Stop Loss",
                    value: selected.sl.toFixed(5),
                    mono: true,
                    color: "#f43f5e",
                  },
                  {
                    label: "Take Profit",
                    value: selected.tp.toFixed(5),
                    mono: true,
                    color: "#10b981",
                  },
                  {
                    label: "R:R planifié",
                    value: stats ? stats.rr.toFixed(2) : "\—",
                    mono: true,
                  },
                  {
                    label: "R:R réalisé",
                    value: stats ? stats.achievedRR.toFixed(2) + "R" : "\—",
                    mono: true,
                    color: stats
                      ? stats.achievedRR >= 0
                        ? "#10b981"
                        : "#f43f5e"
                      : undefined,
                  },
                  {
                    label: "Résultat",
                    value: `${selected.result >= 0 ? "+" : ""}${selected.result.toFixed(2)}€`,
                    color:
                      selected.result >= 0 ? "#10b981" : "#f43f5e",
                    mono: true,
                  },
                  {
                    label: "Stratégie",
                    value: selected.strategy || "\—",
                  },
                  {
                    label: "Émotion",
                    value: selected.emotion || "\—",
                  },
                  { label: "Tags", value: selected.tags || "\—" },
                  {
                    label: "Setup",
                    value: selected.setup || "\—",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1.5 px-2 rounded"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`text-sm font-medium ${item.mono ? "mono" : ""}`}
                      style={{
                        color: item.color || "var(--text-primary)",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: Score + Alternatives */}
            <div className="lg:col-span-2 space-y-6">
              {/* Trade Score */}
              {score && (
                <div className="glass rounded-xl p-5">
                  <h3
                    className="text-sm font-semibold mb-4 flex items-center gap-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <Award className="w-4 h-4 text-cyan-400" /> Score du Trade
                  </h3>

                  {/* Overall score */}
                  <div className="flex items-center gap-6 mb-5">
                    <div
                      className="relative flex items-center justify-center"
                      style={{ width: 80, height: 80 }}
                    >
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        {/* Background circle */}
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="3"
                        />
                        {/* Score arc */}
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={getScoreColor(score.total)}
                          strokeWidth="3"
                          strokeDasharray={`${score.total * 10}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center"
                      >
                        <span
                          className="text-xl font-bold mono"
                          style={{ color: getScoreColor(score.total) }}
                        >
                          {score.total}
                        </span>
                        <span
                          className="text-[9px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          /10
                        </span>
                      </div>
                    </div>
                    <div>
                      <p
                        className="text-lg font-semibold"
                        style={{ color: getScoreColor(score.total) }}
                      >
                        {getScoreLabel(score.total)}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Évaluation automatique basée sur l&apos;exécution
                      </p>
                    </div>
                  </div>

                  {/* Score breakdown */}
                  <div className="space-y-3">
                    {score.details.map((d) => (
                      <div key={d.label}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {d.label.includes("entrée") ? (
                              <Target
                                className="w-3 h-3"
                                style={{
                                  color: getScoreColor(d.score),
                                }}
                              />
                            ) : d.label.includes("Discipline") ? (
                              <Shield
                                className="w-3 h-3"
                                style={{
                                  color: getScoreColor(d.score),
                                }}
                              />
                            ) : (
                              <Zap
                                className="w-3 h-3"
                                style={{
                                  color: getScoreColor(d.score),
                                }}
                              />
                            )}
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {d.label}
                            </span>
                          </div>
                          <span
                            className="text-xs mono font-semibold"
                            style={{ color: getScoreColor(d.score) }}
                          >
                            {d.score}/{d.max}
                          </span>
                        </div>
                        <div
                          className="w-full h-1.5 rounded-full overflow-hidden"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                          }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(d.score / d.max) * 100}%`,
                              background: getScoreColor(d.score),
                            }}
                          />
                        </div>
                        <p
                          className="text-[10px] mt-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {d.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What Would Have Happened */}
              {alternatives && (
                <div className="glass rounded-xl p-5">
                  <h3
                    className="text-sm font-semibold mb-4 flex items-center gap-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <Calculator className="w-4 h-4 text-cyan-400" /> Et si...
                    ?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Cut at 1R */}
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="text-xs mb-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {alternatives.cutAt1R.label}
                      </p>
                      <p
                        className="text-lg font-bold mono"
                        style={{
                          color:
                            alternatives.cutAt1R.pl >= 0
                              ? "#10b981"
                              : "#f43f5e",
                        }}
                      >
                        {alternatives.cutAt1R.pl >= 0 ? "+" : ""}
                        {alternatives.cutAt1R.pl.toFixed(2)}€
                      </p>
                      <p
                        className="text-[10px] mono mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Sortie à{" "}
                        {alternatives.cutAt1R.price.toFixed(5)}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <span
                          className="text-[10px] mono"
                          style={{
                            color:
                              alternatives.cutAt1R.pl -
                                selected.result >=
                              0
                                ? "#10b981"
                                : "#f43f5e",
                          }}
                        >
                          {alternatives.cutAt1R.pl - selected.result >= 0
                            ? "+"
                            : ""}
                          {(
                            alternatives.cutAt1R.pl - selected.result
                          ).toFixed(2)}
                          € vs réel
                        </span>
                      </div>
                    </div>

                    {/* Let run to TP */}
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="text-xs mb-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {alternatives.letRunToTP.label}
                      </p>
                      <p
                        className="text-lg font-bold mono"
                        style={{
                          color:
                            alternatives.letRunToTP.pl >= 0
                              ? "#10b981"
                              : "#f43f5e",
                        }}
                      >
                        {alternatives.letRunToTP.pl >= 0 ? "+" : ""}
                        {alternatives.letRunToTP.pl.toFixed(2)}€
                      </p>
                      <p
                        className="text-[10px] mono mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Sortie à{" "}
                        {alternatives.letRunToTP.price.toFixed(5)}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <span
                          className="text-[10px] mono"
                          style={{
                            color:
                              alternatives.letRunToTP.pl -
                                selected.result >=
                              0
                                ? "#10b981"
                                : "#f43f5e",
                          }}
                        >
                          {alternatives.letRunToTP.pl - selected.result >=
                          0
                            ? "+"
                            : ""}
                          {(
                            alternatives.letRunToTP.pl - selected.result
                          ).toFixed(2)}
                          € vs réel
                        </span>
                      </div>
                    </div>

                    {/* Double position */}
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="text-xs mb-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {alternatives.doublePosition.label}
                      </p>
                      <p
                        className="text-lg font-bold mono"
                        style={{
                          color:
                            alternatives.doublePosition.pl >= 0
                              ? "#10b981"
                              : "#f43f5e",
                        }}
                      >
                        {alternatives.doublePosition.pl >= 0 ? "+" : ""}
                        {alternatives.doublePosition.pl.toFixed(2)}€
                      </p>
                      <p
                        className="text-[10px] mono mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {alternatives.doublePosition.lots} lots au lieu de{" "}
                        {selected.lots}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <span
                          className="text-[10px] mono"
                          style={{
                            color:
                              alternatives.doublePosition.pl -
                                selected.result >=
                              0
                                ? "#10b981"
                                : "#f43f5e",
                          }}
                        >
                          {alternatives.doublePosition.pl -
                            selected.result >=
                          0
                            ? "+"
                            : ""}
                          {(
                            alternatives.doublePosition.pl -
                            selected.result
                          ).toFixed(2)}
                          € vs réel
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comparison bar */}
                  <div
                    className="mt-4 rounded-lg p-3 flex items-center justify-between flex-wrap gap-3"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Star
                        className="w-4 h-4"
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Résultat réel
                      </span>
                    </div>
                    <span
                      className="text-sm mono font-bold"
                      style={{
                        color:
                          selected.result >= 0 ? "#10b981" : "#f43f5e",
                      }}
                    >
                      {selected.result >= 0 ? "+" : ""}
                      {selected.result.toFixed(2)}€
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Screenshots Gallery */}
          {selected.screenshots && selected.screenshots.length > 0 && (
            <div className="glass rounded-xl p-5">
              <h3
                className="text-sm font-semibold mb-4 flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Camera className="w-4 h-4 text-cyan-400" /> Captures
                d&apos;écran
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {selected.screenshots.map((ss) => (
                  <a
                    key={ss.id}
                    href={ss.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg overflow-hidden hover:ring-2 ring-cyan-400/30 transition-all"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <img
                      src={ss.url}
                      alt="Screenshot"
                      className="w-full h-32 object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notes & Annotations */}
          <div className="glass rounded-xl p-5">
            <h3
              className="text-sm font-semibold mb-4 flex items-center gap-2"
              style={{ color: "var(--text-primary)" }}
            >
              <Edit3 className="w-4 h-4 text-cyan-400" /> Notes &amp;
              Annotations
            </h3>
            {selected.setup && (
              <div
                className="rounded-lg p-3 mb-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Setup du trade
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {selected.setup}
                </p>
              </div>
            )}
            {editingNote ? (
              <div className="space-y-2">
                <textarea
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  rows={4}
                  placeholder="Ajoutez vos observations, leçons apprises..."
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none transition-colors"
                  style={{
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveNote(selected.id, currentNote)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: "rgba(6,182,212,0.15)",
                      color: "#06b6d4",
                    }}
                  >
                    Sauvegarder
                  </button>
                  <button
                    onClick={() => setEditingNote(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {notes[selected.id] ? (
                  <div
                    className="rounded-lg p-3 mb-3"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <p
                      className="text-sm whitespace-pre-wrap"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {notes[selected.id]}
                    </p>
                  </div>
                ) : (
                  <p
                    className="text-sm mb-3"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Aucune note pour ce trade
                  </p>
                )}
                <button
                  onClick={() => {
                    setCurrentNote(notes[selected.id] || "");
                    setEditingNote(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <Edit3 className="w-3 h-3" />{" "}
                  {notes[selected.id]
                    ? "Modifier la note"
                    : "Ajouter une note"}
                </button>
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div
            className="flex items-center justify-between py-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              onClick={() => navigate(-1)}
              disabled={currentIndex <= 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-30"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--text-secondary)",
              }}
            >
              <ArrowLeft className="w-4 h-4" /> Trade précédent
            </button>
            <div
              className="text-xs mono"
              style={{ color: "var(--text-muted)" }}
            >
              {selected.asset} &bull; {formatDate(selected.date)} &bull;{" "}
              <span
                style={{
                  color:
                    selected.result >= 0 ? "#10b981" : "#f43f5e",
                }}
              >
                {selected.result >= 0 ? "+" : ""}
                {selected.result.toFixed(2)}€
              </span>
            </div>
            <button
              onClick={() => navigate(1)}
              disabled={currentIndex >= closedTrades.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-30"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--text-secondary)",
              }}
            >
              Trade suivant <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
