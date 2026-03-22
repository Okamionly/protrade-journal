"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import { useTranslation } from "@/i18n/context";
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
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Crosshair,
  Flag,
  SkipBack,
  SkipForward,
} from "lucide-react";

/* ─── Types ─── */

interface PricePoint {
  t: number; // 0..1 normalized time
  open: number;
  high: number;
  low: number;
  close: number;
}

interface KeyMoment {
  t: number;
  price: number;
  type: "entry" | "mae" | "mfe" | "exit";
  label: string;
  color: string;
  icon: "entry" | "down" | "up" | "exit";
}

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

/** Seeded PRNG for deterministic per-trade randomness */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/* ─── Price Data Generation ─── */

function generateCandleData(trade: Trade): {
  candles: PricePoint[];
  keyMoments: KeyMoment[];
} {
  const isLong = trade.direction === "LONG";
  const exitPrice = trade.exit ?? trade.entry;
  const seed = hashString(trade.id);
  const rng = seededRandom(seed);

  const entryPrice = trade.entry;
  const slPrice = trade.sl;
  const tpPrice = trade.tp;

  const riskDistance = Math.abs(entryPrice - slPrice);
  const totalRange =
    Math.max(entryPrice, slPrice, tpPrice, exitPrice) -
    Math.min(entryPrice, slPrice, tpPrice, exitPrice);
  const volatility = totalRange * 0.08;

  const totalCandles = 80;
  const entryCandle = Math.floor(totalCandles * 0.15); // Entry at ~15%
  const exitCandle = Math.floor(totalCandles * 0.85); // Exit at ~85%

  // MAE / MFE from trade data or simulate
  const maePrice =
    trade.maePrice ??
    (isLong
      ? entryPrice - riskDistance * (0.3 + rng() * 0.5)
      : entryPrice + riskDistance * (0.3 + rng() * 0.5));
  const mfePrice =
    trade.mfePrice ??
    (isLong
      ? entryPrice + Math.abs(tpPrice - entryPrice) * (0.5 + rng() * 0.4)
      : entryPrice - Math.abs(entryPrice - tpPrice) * (0.5 + rng() * 0.4));

  // Determine when MAE and MFE occur
  const isWin = trade.result >= 0;
  const maeCandle = isWin
    ? entryCandle + Math.floor((exitCandle - entryCandle) * (0.15 + rng() * 0.25))
    : entryCandle + Math.floor((exitCandle - entryCandle) * (0.5 + rng() * 0.3));
  const mfeCandle = isWin
    ? entryCandle + Math.floor((exitCandle - entryCandle) * (0.55 + rng() * 0.3))
    : entryCandle + Math.floor((exitCandle - entryCandle) * (0.2 + rng() * 0.2));

  const candles: PricePoint[] = [];
  let currentPrice = entryPrice + (rng() - 0.5) * volatility * 2;

  for (let i = 0; i < totalCandles; i++) {
    const t = i / (totalCandles - 1);

    // Determine target price based on phase
    let targetPrice: number;
    if (i < entryCandle) {
      // Pre-entry: meander near entry
      const preT = i / entryCandle;
      targetPrice =
        entryPrice +
        (rng() - 0.5) * riskDistance * 0.4 +
        Math.sin(preT * Math.PI * 2) * volatility;
    } else if (i === entryCandle) {
      targetPrice = entryPrice;
    } else if (i <= maeCandle && i <= mfeCandle) {
      // Between entry and first key moment
      const firstMoment = Math.min(maeCandle, mfeCandle);
      const firstPrice = firstMoment === maeCandle ? maePrice : mfePrice;
      const localT = (i - entryCandle) / (firstMoment - entryCandle || 1);
      targetPrice =
        entryPrice + (firstPrice - entryPrice) * localT + (rng() - 0.5) * volatility;
    } else if (i <= Math.max(maeCandle, mfeCandle)) {
      const secondMoment = Math.max(maeCandle, mfeCandle);
      const firstMoment = Math.min(maeCandle, mfeCandle);
      const firstPrice = firstMoment === maeCandle ? maePrice : mfePrice;
      const secondPrice = secondMoment === maeCandle ? maePrice : mfePrice;
      const localT = (i - firstMoment) / (secondMoment - firstMoment || 1);
      targetPrice =
        firstPrice +
        (secondPrice - firstPrice) * localT +
        (rng() - 0.5) * volatility;
    } else if (i <= exitCandle) {
      const lastKeyMoment = Math.max(maeCandle, mfeCandle);
      const lastPrice = lastKeyMoment === maeCandle ? maePrice : mfePrice;
      const localT = (i - lastKeyMoment) / (exitCandle - lastKeyMoment || 1);
      targetPrice =
        lastPrice +
        (exitPrice - lastPrice) * localT +
        (rng() - 0.5) * volatility * 0.8;
    } else if (i === exitCandle) {
      targetPrice = exitPrice;
    } else {
      // Post-exit drift
      targetPrice =
        exitPrice + (rng() - 0.5) * volatility * 1.5;
    }

    // Smooth approach
    currentPrice = currentPrice * 0.6 + targetPrice * 0.4;

    // Generate candle OHLC
    const open = currentPrice;
    const bodySize = volatility * (0.2 + rng() * 0.6);
    const direction = rng() > 0.5 ? 1 : -1;
    const close = open + direction * bodySize;
    const wickUp = Math.max(open, close) + rng() * volatility * 0.5;
    const wickDown = Math.min(open, close) - rng() * volatility * 0.5;

    candles.push({
      t,
      open,
      high: wickUp,
      low: wickDown,
      close,
    });

    currentPrice = close;
  }

  // Force key prices at exact moments
  if (candles[entryCandle]) candles[entryCandle].close = entryPrice;
  if (candles[exitCandle]) candles[exitCandle].close = exitPrice;

  // Key moments
  const keyMoments: KeyMoment[] = [
    {
      t: entryCandle / (totalCandles - 1),
      price: entryPrice,
      type: "entry",
      label: "Entrée",
      color: "#06b6d4",
      icon: "entry",
    },
    {
      t: maeCandle / (totalCandles - 1),
      price: maePrice,
      type: "mae",
      label: "MAE",
      color: "#f43f5e",
      icon: "down",
    },
    {
      t: mfeCandle / (totalCandles - 1),
      price: mfePrice,
      type: "mfe",
      label: "MFE",
      color: "#10b981",
      icon: "up",
    },
    {
      t: exitCandle / (totalCandles - 1),
      price: exitPrice,
      type: "exit",
      label: "Sortie",
      color: trade.result >= 0 ? "#10b981" : "#f43f5e",
      icon: "exit",
    },
  ];

  return { candles, keyMoments };
}

/* ─── Animated Candle Chart ─── */

function AnimatedCandleChart({
  trade,
  progress,
  candles,
  keyMoments,
  onSeek,
}: {
  trade: Trade;
  progress: number;
  candles: PricePoint[];
  keyMoments: KeyMoment[];
  onSeek: (t: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isLong = trade.direction === "LONG";
  const exitPrice = trade.exit ?? trade.entry;
  const isWin = trade.result >= 0;

  // Calculate price range for scaling
  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  allPrices.push(trade.entry, trade.sl, trade.tp, exitPrice);
  const priceMin = Math.min(...allPrices);
  const priceMax = Math.max(...allPrices);
  const padding = (priceMax - priceMin) * 0.08;
  const chartMin = priceMin - padding;
  const chartMax = priceMax + padding;
  const chartRange = chartMax - chartMin || 1;

  // SVG dimensions
  const W = 900;
  const H = 340;
  const PAD_L = 75;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 30;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const toX = (t: number) => PAD_L + t * chartW;
  const toY = (price: number) =>
    PAD_T + ((chartMax - price) / chartRange) * chartH;

  const visibleCount = Math.max(1, Math.floor(progress * candles.length));
  const visibleCandles = candles.slice(0, visibleCount);
  const lastCandle = visibleCandles[visibleCandles.length - 1];

  // Build line path from close prices
  const linePath = visibleCandles
    .map(
      (c, i) =>
        `${i === 0 ? "M" : "L"} ${toX(c.t).toFixed(1)} ${toY(c.close).toFixed(1)}`
    )
    .join(" ");

  // Area fill path
  const areaPath = linePath
    ? `${linePath} L ${toX(lastCandle.t).toFixed(1)} ${(PAD_T + chartH).toFixed(1)} L ${toX(visibleCandles[0].t).toFixed(1)} ${(PAD_T + chartH).toFixed(1)} Z`
    : "";

  // Visible key moments
  const visibleMoments = keyMoments.filter((m) => m.t <= progress + 0.01);

  // Price labels for Y axis
  const priceSteps = 5;
  const priceLabels: number[] = [];
  for (let i = 0; i <= priceSteps; i++) {
    priceLabels.push(chartMin + (chartRange * i) / priceSteps);
  }

  // Click handler for seeking
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const svgX = (x / rect.width) * W;
    const t = clamp((svgX - PAD_L) / chartW, 0, 1);
    onSeek(t);
  };

  // Decimal places based on asset
  const decimals = trade.entry > 100 ? 2 : trade.entry > 10 ? 3 : 5;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full cursor-crosshair"
      style={{ overflow: "visible" }}
      onClick={handleClick}
    >
      <defs>
        <linearGradient id="areaGradWin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="areaGradLose" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background grid */}
      {priceLabels.map((p, i) => {
        const y = toY(p);
        return (
          <g key={`grid-${i}`}>
            <line
              x1={PAD_L}
              y1={y}
              x2={W - PAD_R}
              y2={y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
            <text
              x={PAD_L - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="rgba(255,255,255,0.3)"
              fontFamily="monospace"
            >
              {p.toFixed(decimals)}
            </text>
          </g>
        );
      })}

      {/* SL zone */}
      <rect
        x={PAD_L}
        y={isLong ? toY(trade.entry) : toY(trade.sl)}
        width={chartW}
        height={Math.abs(toY(trade.entry) - toY(trade.sl))}
        fill="#f43f5e"
        opacity="0.04"
      />

      {/* TP zone */}
      <rect
        x={PAD_L}
        y={isLong ? toY(trade.tp) : toY(trade.entry)}
        width={chartW}
        height={Math.abs(toY(trade.tp) - toY(trade.entry))}
        fill="#10b981"
        opacity="0.04"
      />

      {/* Entry level */}
      <line
        x1={PAD_L}
        y1={toY(trade.entry)}
        x2={W - PAD_R}
        y2={toY(trade.entry)}
        stroke="#06b6d4"
        strokeWidth="1"
        strokeDasharray="6,4"
        opacity="0.6"
      />
      <rect
        x={PAD_L}
        y={toY(trade.entry) - 10}
        width={60}
        height={18}
        rx="3"
        fill="rgba(6,182,212,0.15)"
        stroke="#06b6d4"
        strokeWidth="0.5"
        opacity="0.8"
      />
      <text
        x={PAD_L + 30}
        y={toY(trade.entry) + 3}
        textAnchor="middle"
        fontSize="9"
        fill="#06b6d4"
        fontFamily="monospace"
        fontWeight="bold"
      >
        ENTRY
      </text>

      {/* SL level */}
      <line
        x1={PAD_L}
        y1={toY(trade.sl)}
        x2={W - PAD_R}
        y2={toY(trade.sl)}
        stroke="#f43f5e"
        strokeWidth="1"
        strokeDasharray="4,3"
        opacity="0.5"
      />
      <rect
        x={W - PAD_R - 50}
        y={toY(trade.sl) - 10}
        width={50}
        height={18}
        rx="3"
        fill="rgba(244,63,94,0.12)"
        stroke="#f43f5e"
        strokeWidth="0.5"
        opacity="0.8"
      />
      <text
        x={W - PAD_R - 25}
        y={toY(trade.sl) + 3}
        textAnchor="middle"
        fontSize="9"
        fill="#f43f5e"
        fontFamily="monospace"
        fontWeight="bold"
      >
        SL
      </text>

      {/* TP level */}
      <line
        x1={PAD_L}
        y1={toY(trade.tp)}
        x2={W - PAD_R}
        y2={toY(trade.tp)}
        stroke="#10b981"
        strokeWidth="1"
        strokeDasharray="4,3"
        opacity="0.5"
      />
      <rect
        x={W - PAD_R - 50}
        y={toY(trade.tp) - 10}
        width={50}
        height={18}
        rx="3"
        fill="rgba(16,185,129,0.12)"
        stroke="#10b981"
        strokeWidth="0.5"
        opacity="0.8"
      />
      <text
        x={W - PAD_R - 25}
        y={toY(trade.tp) + 3}
        textAnchor="middle"
        fontSize="9"
        fill="#10b981"
        fontFamily="monospace"
        fontWeight="bold"
      >
        TP
      </text>

      {/* Exit level when visible */}
      {progress >= 0.85 && (
        <>
          <line
            x1={PAD_L}
            y1={toY(exitPrice)}
            x2={W - PAD_R}
            y2={toY(exitPrice)}
            stroke={isWin ? "#10b981" : "#f43f5e"}
            strokeWidth="1.2"
            strokeDasharray="2,2"
            opacity="0.7"
          />
          <rect
            x={PAD_L + chartW * 0.4}
            y={toY(exitPrice) - 10}
            width={50}
            height={18}
            rx="3"
            fill={isWin ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)"}
            stroke={isWin ? "#10b981" : "#f43f5e"}
            strokeWidth="0.5"
            opacity="0.9"
          />
          <text
            x={PAD_L + chartW * 0.4 + 25}
            y={toY(exitPrice) + 3}
            textAnchor="middle"
            fontSize="9"
            fill={isWin ? "#10b981" : "#f43f5e"}
            fontFamily="monospace"
            fontWeight="bold"
          >
            EXIT
          </text>
        </>
      )}

      {/* Candles */}
      {visibleCandles.map((c, i) => {
        const x = toX(c.t);
        const candleW = Math.max(2, chartW / candles.length * 0.6);
        const isBull = c.close >= c.open;
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyBottom = toY(Math.min(c.open, c.close));
        const bodyH = Math.max(1, bodyBottom - bodyTop);
        const color = isBull ? "#10b981" : "#f43f5e";

        return (
          <g key={i} opacity={0.7}>
            {/* Wick */}
            <line
              x1={x}
              y1={toY(c.high)}
              x2={x}
              y2={toY(c.low)}
              stroke={color}
              strokeWidth="1"
            />
            {/* Body */}
            <rect
              x={x - candleW / 2}
              y={bodyTop}
              width={candleW}
              height={bodyH}
              fill={isBull ? color : color}
              stroke={color}
              strokeWidth="0.5"
              opacity={isBull ? 0.3 : 0.6}
            />
          </g>
        );
      })}

      {/* Price line overlay */}
      {linePath && (
        <>
          <path
            d={areaPath}
            fill={isWin ? "url(#areaGradWin)" : "url(#areaGradLose)"}
          />
          <path
            d={linePath}
            fill="none"
            stroke={isWin ? "#10b981" : "#f43f5e"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
          {/* Glow */}
          <path
            d={linePath}
            fill="none"
            stroke={isWin ? "#10b981" : "#f43f5e"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.08"
          />
        </>
      )}

      {/* Key moment markers */}
      {visibleMoments.map((m) => {
        const cx = toX(m.t);
        const cy = toY(m.price);
        return (
          <g key={m.type}>
            {/* Vertical dashed line */}
            <line
              x1={cx}
              y1={PAD_T}
              x2={cx}
              y2={PAD_T + chartH}
              stroke={m.color}
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.25"
            />
            {/* Diamond marker */}
            <polygon
              points={`${cx},${cy - 7} ${cx + 5},${cy} ${cx},${cy + 7} ${cx - 5},${cy}`}
              fill={m.color}
              opacity="0.9"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="0.5"
            />
            {/* Label */}
            <rect
              x={cx - 18}
              y={cy - 22}
              width={36}
              height={14}
              rx="3"
              fill="rgba(0,0,0,0.6)"
              stroke={m.color}
              strokeWidth="0.5"
            />
            <text
              x={cx}
              y={cy - 12}
              textAnchor="middle"
              fontSize="8"
              fill={m.color}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {m.label}
            </text>
          </g>
        );
      })}

      {/* Current price dot */}
      {lastCandle && (
        <g>
          <circle
            cx={toX(lastCandle.t)}
            cy={toY(lastCandle.close)}
            r="5"
            fill={isWin ? "#10b981" : "#f43f5e"}
          >
            <animate
              attributeName="r"
              from="4"
              to="8"
              dur="1.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from="0.9"
              to="0.3"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx={toX(lastCandle.t)}
            cy={toY(lastCandle.close)}
            r="3"
            fill="white"
            opacity="0.9"
          />
          {/* Current price label */}
          <rect
            x={toX(lastCandle.t) + 10}
            y={toY(lastCandle.close) - 9}
            width={65}
            height={18}
            rx="3"
            fill="rgba(0,0,0,0.7)"
            stroke={isWin ? "#10b981" : "#f43f5e"}
            strokeWidth="0.5"
          />
          <text
            x={toX(lastCandle.t) + 42}
            y={toY(lastCandle.close) + 4}
            textAnchor="middle"
            fontSize="9"
            fill="white"
            fontFamily="monospace"
          >
            {lastCandle.close.toFixed(decimals)}
          </text>
        </g>
      )}

      {/* Time axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <text
          key={`time-${t}`}
          x={toX(t)}
          y={H - 5}
          textAnchor="middle"
          fontSize="9"
          fill="rgba(255,255,255,0.25)"
          fontFamily="monospace"
        >
          {Math.round(t * 100)}%
        </text>
      ))}
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

  const riskDistance = Math.abs(trade.entry - trade.sl);
  const rewardDistance = Math.abs(trade.tp - trade.entry);
  const totalRange = riskDistance + rewardDistance;

  let entryRatio = totalRange > 0 ? riskDistance / totalRange : 0.5;
  const entryQuality = Math.round(clamp((1 - entryRatio) * 10, 0, 10));

  let disciplineScore = 5;
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
    if (exitRatio >= 0.9) disciplineScore = 9;
    else if (exitRatio >= 0.5) disciplineScore = 7;
    else if (exitRatio >= 0) disciplineScore = 5;
    else {
      if (slDistFromEntry > 0) {
        const lossRatio = Math.abs(exitDistFromEntry) / slDistFromEntry;
        if (lossRatio <= 1.05) disciplineScore = 6;
        else disciplineScore = 2;
      } else {
        disciplineScore = 3;
      }
    }
  }

  const plannedRR = riskDistance > 0 ? rewardDistance / riskDistance : 1;
  const achievedRR = riskDistance > 0 ? exitDistFromEntry / riskDistance : 0;
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
        label: "replayEntryQuality",
        score: entryQuality,
        max: 10,
        desc: "replayEntryQualityDesc",
      },
      {
        label: "replayDiscipline",
        score: disciplineScore,
        max: 10,
        desc: "replayDisciplineDesc",
      },
      {
        label: "replayRrAchieved",
        score: rrScore,
        max: 10,
        desc: "replayRrAchievedDesc",
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
  if (score >= 9) return "replayScoreExcellent";
  if (score >= 7) return "replayScoreGood";
  if (score >= 5) return "replayScoreAverage";
  if (score >= 3) return "replayScorePoor";
  return "replayScoreBad";
}

/* ─── Post-Replay Analysis ─── */

function computePostReplayStats(trade: Trade, keyMoments: KeyMoment[]) {
  const isLong = trade.direction === "LONG";
  const exitPrice = trade.exit ?? trade.entry;
  const riskDist = Math.abs(trade.entry - trade.sl);
  const rewardDist = Math.abs(trade.tp - trade.entry);

  const mae = keyMoments.find((m) => m.type === "mae");
  const mfe = keyMoments.find((m) => m.type === "mfe");

  const maeFromEntry = mae
    ? Math.abs(mae.price - trade.entry)
    : 0;
  const mfeFromEntry = mfe
    ? Math.abs(mfe.price - trade.entry)
    : 0;

  // How close to SL did it get?
  const slProximity = riskDist > 0 ? (maeFromEntry / riskDist) * 100 : 0;

  // Did price hit SL zone before TP?
  const hitSlZone = slProximity > 90;

  // How close to TP did it get?
  const tpProximity = rewardDist > 0 ? (mfeFromEntry / rewardDist) * 100 : 0;

  // Was entry optimal? (entry close to best possible price)
  const entryEfficiency =
    rewardDist + riskDist > 0
      ? (rewardDist / (rewardDist + riskDist)) * 100
      : 50;

  // Exit efficiency: how much of MFE was captured?
  const exitPnl = isLong
    ? exitPrice - trade.entry
    : trade.entry - exitPrice;
  const mfePnl = mfeFromEntry;
  const exitEfficiency = mfePnl > 0 ? (exitPnl / mfePnl) * 100 : 0;

  // R multiple achieved
  const rMultiple = riskDist > 0 ? exitPnl / riskDist : 0;

  return {
    maeFromEntry,
    mfeFromEntry,
    slProximity: Math.min(slProximity, 100),
    tpProximity: Math.min(tpProximity, 100),
    hitSlZone,
    entryEfficiency: clamp(entryEfficiency, 0, 100),
    exitEfficiency: clamp(exitEfficiency, 0, 100),
    rMultiple,
  };
}

/* ─── Key Moment Badge Component ─── */

function MomentBadge({
  moment,
  trade,
  onJump,
}: {
  moment: KeyMoment;
  trade: Trade;
  onJump: (t: number) => void;
}) {
  const decimals = trade.entry > 100 ? 2 : trade.entry > 10 ? 3 : 5;
  const IconComponent =
    moment.icon === "entry"
      ? Crosshair
      : moment.icon === "down"
        ? TrendingDown
        : moment.icon === "up"
          ? TrendingUp
          : Flag;

  return (
    <button
      onClick={() => onJump(moment.t)}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all hover:scale-[1.02]"
      style={{
        background: "var(--bg-secondary)",
        border: `1px solid ${moment.color}33`,
      }}
    >
      <div
        className="flex items-center justify-center w-7 h-7 rounded-md"
        style={{ background: `${moment.color}15` }}
      >
        <IconComponent className="w-3.5 h-3.5" style={{ color: moment.color }} />
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: moment.color }}>
          {moment.label}
        </p>
        <p
          className="text-[10px] mono"
          style={{ color: "var(--text-muted)" }}
        >
          {moment.price.toFixed(decimals)}
        </p>
      </div>
    </button>
  );
}

/* ─── Main Page ─── */

export default function ReplayPage() {
  const { t } = useTranslation();
  const { trades, loading } = useTrades();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState(false);
  const [currentNote, setCurrentNote] = useState("");

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showAnalysis, setShowAnalysis] = useState(false);
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

  // Generate candle data for selected trade
  const { candles, keyMoments } = useMemo(() => {
    if (!selected) return { candles: [], keyMoments: [] };
    return generateCandleData(selected);
  }, [selected]);

  // Post-replay analysis
  const postReplayStats = useMemo(() => {
    if (!selected || keyMoments.length === 0) return null;
    return computePostReplayStats(selected, keyMoments);
  }, [selected, keyMoments]);

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
    setShowAnalysis(false);
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
        const next = prev + delta / (5000 / speed);
        if (next >= 1) {
          setIsPlaying(false);
          setShowAnalysis(true);
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
    if (progress >= 1) {
      setProgress(0);
      setShowAnalysis(false);
    }
    setIsPlaying(true);
  };
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
    setShowAnalysis(false);
  };
  const handleSeek = (t: number) => {
    setIsPlaying(false);
    setProgress(clamp(t, 0, 1));
    if (t >= 0.98) setShowAnalysis(true);
  };
  const handleStepBack = () => {
    setIsPlaying(false);
    setProgress((p) => clamp(p - 0.05, 0, 1));
  };
  const handleStepForward = () => {
    setIsPlaying(false);
    setProgress((p) => {
      const next = clamp(p + 0.05, 0, 1);
      if (next >= 0.98) setShowAnalysis(true);
      return next;
    });
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

      if (e.key === "ArrowLeft" && e.shiftKey) {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === "ArrowRight" && e.shiftKey) {
        e.preventDefault();
        navigate(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleStepBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleStepForward();
      } else if (e.key === " ") {
        e.preventDefault();
        if (isPlaying) handlePause();
        else handlePlay();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleReset();
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
    return {
      rr,
      achievedRR,
      riskAmount,
      rewardAmount,
      isLong,
      riskPips,
      rewardPips,
    };
  }, [selected]);

  // What Would Have Happened
  const alternatives = useMemo(() => {
    if (!selected || !stats) return null;
    const isLong = selected.direction === "LONG";
    const riskPips = stats.riskPips;
    const exitPrice = selected.exit ?? selected.entry;
    const priceDiff = isLong
      ? exitPrice - selected.entry
      : selected.entry - exitPrice;
    // Derive monetary value per price unit from actual result to avoid hardcoded multipliers
    const moneyPerUnit = priceDiff !== 0 ? selected.result / priceDiff : 0;

    const oneRTarget = isLong
      ? selected.entry + riskPips
      : selected.entry - riskPips;
    const oneRPL = riskPips * moneyPerUnit;
    const tpPips = Math.abs(selected.tp - selected.entry);
    const tpPL = tpPips * moneyPerUnit;
    const doublePL = selected.result * 2;

    return {
      cutAt1R: {
        labelKey: "replayAltCutAt1R",
        price: oneRTarget,
        pl: oneRPL,
      },
      letRunToTP: {
        labelKey: "replayAltLetRun",
        price: selected.tp,
        pl: tpPL,
      },
      doublePosition: {
        labelKey: "replayAltDouble",
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
        {t("loading")}
      </div>
    );
  }

  if (closedTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Rewind className="w-10 h-10 text-cyan-400 opacity-50" />
        <p style={{ color: "var(--text-muted)" }}>
          {t("replayNoClosedTrades")}
        </p>
      </div>
    );
  }

  const decimals =
    selected && selected.entry > 100
      ? 2
      : selected && selected.entry > 10
        ? 3
        : 5;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-3"
            style={{ color: "var(--text-primary)" }}
          >
            <Play className="w-6 h-6 text-cyan-400" /> {t("replayTitle")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {t("replaySubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            disabled={currentIndex <= 0}
            className="glass p-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-30"
            style={{ color: "var(--text-secondary)" }}
            title={t("replayPrevTrade")}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className="text-xs mono px-3 py-1 rounded"
            style={{
              color: "var(--text-muted)",
              background: "var(--bg-secondary)",
            }}
          >
            {currentIndex + 1} / {closedTrades.length}
          </span>
          <button
            onClick={() => navigate(1)}
            disabled={currentIndex >= closedTrades.length - 1}
            className="glass p-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-30"
            style={{ color: "var(--text-secondary)" }}
            title={t("replayNextTrade")}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trade Selector */}
      <div className="glass rounded-xl p-4">
        <label
          className="text-xs font-medium mb-2 block"
          style={{ color: "var(--text-muted)" }}
        >
          {t("replaySelectTrade")}
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
                  {t.asset} {t.direction === "LONG" ? "\u25B2" : "\u25BC"}{" "}
                  {t.direction} &mdash;{" "}
                  {t.result >= 0 ? "+" : ""}
                  {t.result.toFixed(2)}€
                  {t.strategy ? ` \u2014 ${t.strategy}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {selected && (
        <>
          {/* Visual Candle Chart with Animation */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <BarChart3 className="w-4 h-4 text-cyan-400" />{" "}
                {t("replayPriceSimulation")}
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
                  title="Reset (R)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleStepBack}
                  className="glass p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-secondary)" }}
                  title="Reculer"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                {isPlaying ? (
                  <button
                    onClick={handlePause}
                    className="p-2 rounded-lg hover:opacity-80 transition-opacity"
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
                    className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                    style={{
                      background: "rgba(6,182,212,0.2)",
                      color: "#06b6d4",
                    }}
                    title={t("replayPlay")}
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleStepForward}
                  className="glass p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-secondary)" }}
                  title="Avancer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Clickable progress bar */}
            <div
              className="w-full h-2 rounded-full mb-4 overflow-hidden cursor-pointer relative group"
              style={{ background: "var(--bg-secondary)" }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const t = clamp((e.clientX - rect.left) / rect.width, 0, 1);
                handleSeek(t);
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  background:
                    selected.result >= 0
                      ? "linear-gradient(90deg, #06b6d4, #10b981)"
                      : "linear-gradient(90deg, #06b6d4, #f43f5e)",
                  transition: isPlaying ? "none" : "width 0.15s",
                }}
              />
              {/* Key moment markers on progress bar */}
              {keyMoments.map((m) => (
                <div
                  key={m.type}
                  className="absolute top-0 h-full w-0.5"
                  style={{
                    left: `${m.t * 100}%`,
                    background: m.color,
                    opacity: 0.6,
                  }}
                  title={m.label}
                />
              ))}
            </div>

            {/* Keyboard hints */}
            <div className="flex items-center gap-4 mb-3">
              <span
                className="text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                <kbd
                  className="px-1.5 py-0.5 rounded text-[9px]"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Espace
                </kbd>{" "}
                Lecture &nbsp;
                <kbd
                  className="px-1.5 py-0.5 rounded text-[9px]"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  \u2190 \u2192
                </kbd>{" "}
                Pas &nbsp;
                <kbd
                  className="px-1.5 py-0.5 rounded text-[9px]"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  R
                </kbd>{" "}
                Reset &nbsp;
                <kbd
                  className="px-1.5 py-0.5 rounded text-[9px]"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Shift+\u2190\u2192
                </kbd>{" "}
                Changer trade
              </span>
            </div>

            {/* Chart */}
            <div
              className="relative rounded-lg overflow-hidden"
              style={{
                height: "340px",
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 100%)",
              }}
            >
              <AnimatedCandleChart
                trade={selected}
                progress={progress}
                candles={candles}
                keyMoments={keyMoments}
                onSeek={handleSeek}
              />
            </div>

            {/* Key Moments Timeline */}
            <div className="mt-4">
              <p
                className="text-xs font-medium mb-2 flex items-center gap-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                <Clock className="w-3 h-3" /> Moments cl\u00E9s
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {keyMoments.map((m) => (
                  <MomentBadge
                    key={m.type}
                    moment={m}
                    trade={selected}
                    onJump={handleSeek}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trade Details Panel */}
            <div className="lg:col-span-1 glass rounded-xl p-5">
              <h3
                className="text-sm font-semibold mb-4 flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Target className="w-4 h-4 text-cyan-400" />{" "}
                {t("replayTradeDetails")}
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: t("asset"), value: selected.asset },
                  {
                    label: t("direction"),
                    value: selected.direction,
                    color:
                      selected.direction === "LONG"
                        ? "#10b981"
                        : "#f43f5e",
                  },
                  { label: t("date"), value: formatDate(selected.date) },
                  { label: t("lots"), value: selected.lots.toString() },
                  {
                    label: t("entry"),
                    value: selected.entry.toFixed(decimals),
                    mono: true,
                  },
                  {
                    label: t("exit"),
                    value: (selected.exit ?? 0).toFixed(decimals),
                    mono: true,
                  },
                  {
                    label: t("stopLoss"),
                    value: selected.sl.toFixed(decimals),
                    mono: true,
                    color: "#f43f5e",
                  },
                  {
                    label: t("takeProfit"),
                    value: selected.tp.toFixed(decimals),
                    mono: true,
                    color: "#10b981",
                  },
                  {
                    label: t("replayPlannedRR"),
                    value: stats ? stats.rr.toFixed(2) : "\u2014",
                    mono: true,
                  },
                  {
                    label: t("replayAchievedRR"),
                    value: stats
                      ? stats.achievedRR.toFixed(2) + "R"
                      : "\u2014",
                    mono: true,
                    color: stats
                      ? stats.achievedRR >= 0
                        ? "#10b981"
                        : "#f43f5e"
                      : undefined,
                  },
                  {
                    label: t("result"),
                    value: `${selected.result >= 0 ? "+" : ""}${selected.result.toFixed(2)}€`,
                    color:
                      selected.result >= 0 ? "#10b981" : "#f43f5e",
                    mono: true,
                  },
                  {
                    label: t("strategy"),
                    value: selected.strategy || "\u2014",
                  },
                  {
                    label: t("emotion"),
                    value: selected.emotion || "\u2014",
                  },
                  { label: t("tags"), value: selected.tags || "\u2014" },
                  {
                    label: t("setup"),
                    value: selected.setup || "\u2014",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1.5 px-2 rounded"
                    style={{
                      background: "var(--bg-secondary)",
                      borderBottom: "1px solid var(--border)",
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

            {/* Right column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Post-Replay Analysis */}
              {showAnalysis && postReplayStats && (
                <div
                  className="glass rounded-xl p-5"
                  style={{
                    animation: "fadeIn 0.5s ease-out",
                  }}
                >
                  <h3
                    className="text-sm font-semibold mb-4 flex items-center gap-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <Activity className="w-4 h-4 text-cyan-400" /> Analyse
                    post-replay
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {/* Entry Optimal? */}
                    <div
                      className="rounded-xl p-3 text-center"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <Crosshair
                        className="w-4 h-4 mx-auto mb-1.5"
                        style={{
                          color:
                            postReplayStats.entryEfficiency >= 60
                              ? "#10b981"
                              : postReplayStats.entryEfficiency >= 40
                                ? "#eab308"
                                : "#f43f5e",
                        }}
                      />
                      <p
                        className="text-lg font-bold mono"
                        style={{
                          color:
                            postReplayStats.entryEfficiency >= 60
                              ? "#10b981"
                              : postReplayStats.entryEfficiency >= 40
                                ? "#eab308"
                                : "#f43f5e",
                        }}
                      >
                        {postReplayStats.entryEfficiency.toFixed(0)}%
                      </p>
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Efficacit\u00E9 entr\u00E9e
                      </p>
                    </div>

                    {/* SL Proximity */}
                    <div
                      className="rounded-xl p-3 text-center"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <AlertTriangle
                        className="w-4 h-4 mx-auto mb-1.5"
                        style={{
                          color: postReplayStats.hitSlZone
                            ? "#f43f5e"
                            : "#eab308",
                        }}
                      />
                      <p
                        className="text-lg font-bold mono"
                        style={{
                          color: postReplayStats.hitSlZone
                            ? "#f43f5e"
                            : postReplayStats.slProximity > 70
                              ? "#eab308"
                              : "#10b981",
                        }}
                      >
                        {postReplayStats.slProximity.toFixed(0)}%
                      </p>
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Proximit\u00E9 SL
                      </p>
                    </div>

                    {/* TP Proximity */}
                    <div
                      className="rounded-xl p-3 text-center"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <TrendingUp
                        className="w-4 h-4 mx-auto mb-1.5"
                        style={{
                          color:
                            postReplayStats.tpProximity >= 80
                              ? "#10b981"
                              : "#eab308",
                        }}
                      />
                      <p
                        className="text-lg font-bold mono"
                        style={{
                          color:
                            postReplayStats.tpProximity >= 80
                              ? "#10b981"
                              : postReplayStats.tpProximity >= 50
                                ? "#eab308"
                                : "#f43f5e",
                        }}
                      >
                        {postReplayStats.tpProximity.toFixed(0)}%
                      </p>
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Proximit\u00E9 TP
                      </p>
                    </div>

                    {/* Exit Efficiency */}
                    <div
                      className="rounded-xl p-3 text-center"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <Flag
                        className="w-4 h-4 mx-auto mb-1.5"
                        style={{
                          color:
                            postReplayStats.exitEfficiency >= 70
                              ? "#10b981"
                              : postReplayStats.exitEfficiency >= 40
                                ? "#eab308"
                                : "#f43f5e",
                        }}
                      />
                      <p
                        className="text-lg font-bold mono"
                        style={{
                          color:
                            postReplayStats.exitEfficiency >= 70
                              ? "#10b981"
                              : postReplayStats.exitEfficiency >= 40
                                ? "#eab308"
                                : "#f43f5e",
                        }}
                      >
                        {postReplayStats.exitEfficiency.toFixed(0)}%
                      </p>
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Efficacit\u00E9 sortie
                      </p>
                    </div>
                  </div>

                  {/* Verdict badges */}
                  <div className="space-y-2">
                    {/* Hit SL before TP? */}
                    <div
                      className="flex items-center gap-3 rounded-lg px-3 py-2"
                      style={{
                        background: postReplayStats.hitSlZone
                          ? "rgba(244,63,94,0.08)"
                          : "rgba(16,185,129,0.08)",
                        border: `1px solid ${postReplayStats.hitSlZone ? "rgba(244,63,94,0.2)" : "rgba(16,185,129,0.2)"}`,
                      }}
                    >
                      {postReplayStats.hitSlZone ? (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span
                        className="text-xs"
                        style={{
                          color: postReplayStats.hitSlZone
                            ? "#f43f5e"
                            : "#10b981",
                        }}
                      >
                        {postReplayStats.hitSlZone
                          ? "Le prix a frôlé ou touché la zone SL avant d'atteindre le TP"
                          : "Le prix n'a pas atteint la zone SL critique"}
                      </span>
                    </div>

                    {/* Was exit close to perfect? */}
                    <div
                      className="flex items-center gap-3 rounded-lg px-3 py-2"
                      style={{
                        background:
                          postReplayStats.exitEfficiency >= 70
                            ? "rgba(16,185,129,0.08)"
                            : "rgba(234,179,8,0.08)",
                        border: `1px solid ${postReplayStats.exitEfficiency >= 70 ? "rgba(16,185,129,0.2)" : "rgba(234,179,8,0.2)"}`,
                      }}
                    >
                      {postReplayStats.exitEfficiency >= 70 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                      )}
                      <span
                        className="text-xs"
                        style={{
                          color:
                            postReplayStats.exitEfficiency >= 70
                              ? "#10b981"
                              : "#eab308",
                        }}
                      >
                        {postReplayStats.exitEfficiency >= 70
                          ? `Sortie quasi optimale \u2014 ${postReplayStats.exitEfficiency.toFixed(0)}% du MFE captur\u00E9`
                          : `Sortie pr\u00E9matur\u00E9e \u2014 seulement ${postReplayStats.exitEfficiency.toFixed(0)}% du MFE captur\u00E9`}
                      </span>
                    </div>

                    {/* R multiple summary */}
                    <div
                      className="flex items-center gap-3 rounded-lg px-3 py-2"
                      style={{
                        background:
                          postReplayStats.rMultiple >= 1
                            ? "rgba(16,185,129,0.08)"
                            : postReplayStats.rMultiple >= 0
                              ? "rgba(234,179,8,0.08)"
                              : "rgba(244,63,94,0.08)",
                        border: `1px solid ${
                          postReplayStats.rMultiple >= 1
                            ? "rgba(16,185,129,0.2)"
                            : postReplayStats.rMultiple >= 0
                              ? "rgba(234,179,8,0.2)"
                              : "rgba(244,63,94,0.2)"
                        }`,
                      }}
                    >
                      <Zap
                        className="w-4 h-4 shrink-0"
                        style={{
                          color:
                            postReplayStats.rMultiple >= 1
                              ? "#10b981"
                              : postReplayStats.rMultiple >= 0
                                ? "#eab308"
                                : "#f43f5e",
                        }}
                      />
                      <span
                        className="text-xs"
                        style={{
                          color:
                            postReplayStats.rMultiple >= 1
                              ? "#10b981"
                              : postReplayStats.rMultiple >= 0
                                ? "#eab308"
                                : "#f43f5e",
                        }}
                      >
                        R\u00E9sultat :{" "}
                        <span className="font-bold mono">
                          {postReplayStats.rMultiple >= 0 ? "+" : ""}
                          {postReplayStats.rMultiple.toFixed(2)}R
                        </span>
                        {postReplayStats.rMultiple >= 2
                          ? " \u2014 Excellente gestion !"
                          : postReplayStats.rMultiple >= 1
                            ? " \u2014 Objectif atteint"
                            : postReplayStats.rMultiple >= 0
                              ? " \u2014 Gain partiel"
                              : " \u2014 Perte contr\u00F4l\u00E9e"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Trade Score */}
              {score && (
                <div className="glass rounded-xl p-5">
                  <h3
                    className="text-sm font-semibold mb-4 flex items-center gap-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <Award className="w-4 h-4 text-cyan-400" />{" "}
                    {t("replayTradeScore")}
                  </h3>

                  <div className="flex items-center gap-6 mb-5">
                    <div
                      className="relative flex items-center justify-center"
                      style={{ width: 80, height: 80 }}
                    >
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={getScoreColor(score.total)}
                          strokeWidth="3"
                          strokeDasharray={`${score.total * 10}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
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
                        {t(getScoreLabel(score.total))}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t("replayAutoEval")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {score.details.map((d) => (
                      <div key={d.label}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {d.label === "replayEntryQuality" ? (
                              <Target
                                className="w-3 h-3"
                                style={{
                                  color: getScoreColor(d.score),
                                }}
                              />
                            ) : d.label === "replayDiscipline" ? (
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
                              {t(d.label)}
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
                            background: "var(--bg-secondary)",
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
                          {t(d.desc)}
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
                    <Calculator className="w-4 h-4 text-cyan-400" />{" "}
                    {t("replayWhatIf")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Cut at 1R */}
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="text-xs mb-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t(alternatives.cutAt1R.labelKey)}
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
                        {t("replayExitAt")}{" "}
                        {alternatives.cutAt1R.price.toFixed(decimals)}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <span
                          className="text-[10px] mono"
                          style={{
                            color:
                              alternatives.cutAt1R.pl - selected.result >= 0
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
                          € {t("replayVsReal")}
                        </span>
                      </div>
                    </div>

                    {/* Let run to TP */}
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="text-xs mb-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t(alternatives.letRunToTP.labelKey)}
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
                        {t("replayExitAt")}{" "}
                        {alternatives.letRunToTP.price.toFixed(decimals)}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <span
                          className="text-[10px] mono"
                          style={{
                            color:
                              alternatives.letRunToTP.pl - selected.result >=
                              0
                                ? "#10b981"
                                : "#f43f5e",
                          }}
                        >
                          {alternatives.letRunToTP.pl - selected.result >= 0
                            ? "+"
                            : ""}
                          {(
                            alternatives.letRunToTP.pl - selected.result
                          ).toFixed(2)}
                          € {t("replayVsReal")}
                        </span>
                      </div>
                    </div>

                    {/* Double position */}
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="text-xs mb-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t(alternatives.doublePosition.labelKey)}
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
                        {t("replayLotsInsteadOf", {
                          lots: alternatives.doublePosition.lots,
                          orig: selected.lots,
                        })}
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
                          {alternatives.doublePosition.pl - selected.result >=
                          0
                            ? "+"
                            : ""}
                          {(
                            alternatives.doublePosition.pl - selected.result
                          ).toFixed(2)}
                          € {t("replayVsReal")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comparison bar */}
                  <div
                    className="mt-4 rounded-lg p-3 flex items-center justify-between flex-wrap gap-3"
                    style={{
                      background: "var(--bg-secondary)",
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
                        {t("replayActualResult")}
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
                <Camera className="w-4 h-4 text-cyan-400" />{" "}
                {t("screenshots")}
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
              <Edit3 className="w-4 h-4 text-cyan-400" />{" "}
              {t("replayNotesAnnotations")}
            </h3>
            {selected.setup && (
              <div
                className="rounded-lg p-3 mb-3"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t("replayTradeSetup")}
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
                  placeholder={t("replayNotesPlaceholder")}
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
                    {t("save")}
                  </button>
                  <button
                    onClick={() => setEditingNote(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {notes[selected.id] ? (
                  <div
                    className="rounded-lg p-3 mb-3"
                    style={{
                      background: "var(--bg-secondary)",
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
                    {t("replayNoNotes")}
                  </p>
                )}
                <button
                  onClick={() => {
                    setCurrentNote(notes[selected.id] || "");
                    setEditingNote(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <Edit3 className="w-3 h-3" />{" "}
                  {notes[selected.id]
                    ? t("replayEditNote")
                    : t("replayAddNote")}
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
                background: "var(--bg-secondary)",
                color: "var(--text-secondary)",
              }}
            >
              <ArrowLeft className="w-4 h-4" /> {t("replayPrevTrade")}
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
                background: "var(--bg-secondary)",
                color: "var(--text-secondary)",
              }}
            >
              {t("replayNextTrade")} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
