"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { RefreshCw, Activity, ArrowUpRight, ArrowDownRight, Zap, Target, BarChart3, Brain, TrendingUp, TrendingDown, AlertTriangle, Trophy } from "lucide-react";
import { useTrades } from "@/hooks/useTrades";
import { AIInsightsCard, type InsightItem } from "@/components/AIInsightsCard";
import { useTranslation } from "@/i18n/context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Currency = "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF" | "NZD";

interface PairSuggestion {
  pair: string;
  direction: "LONG" | "SHORT";
  reason: string;
  delta: number;
}

interface ApiResponse {
  strengths: Record<Currency, number>;
  rates: Record<string, number>;
  matrix: number[][];
  pairs: PairSuggestion[];
  currencies: Currency[];
  source: string;
  timestamp: number;
}

interface StrengthSnapshot {
  strengths: Record<Currency, number>;
  timestamp: number;
}

interface RankChange {
  currency: Currency;
  oldRank: number;
  newRank: number;
  change: number; // positive = gained ranks (improved)
}

interface BestPairSuggestion {
  pair: string;
  longCcy: Currency;
  shortCcy: Currency;
  longRank: number;
  shortRank: number;
  divergence: number;
}

interface CurrencyWinRate {
  currency: Currency;
  wins: number;
  total: number;
  winRate: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];

const CURRENCY_INFO: Record<Currency, { flag: string; nameKey: string }> = {
  USD: { flag: "\u{1F1FA}\u{1F1F8}", nameKey: "currStr_dollarUS" },
  EUR: { flag: "\u{1F1EA}\u{1F1FA}", nameKey: "currStr_euro" },
  GBP: { flag: "\u{1F1EC}\u{1F1E7}", nameKey: "currStr_poundSterling" },
  JPY: { flag: "\u{1F1EF}\u{1F1F5}", nameKey: "currStr_yen" },
  AUD: { flag: "\u{1F1E6}\u{1F1FA}", nameKey: "currStr_audDollar" },
  CAD: { flag: "\u{1F1E8}\u{1F1E6}", nameKey: "currStr_cadDollar" },
  CHF: { flag: "\u{1F1E8}\u{1F1ED}", nameKey: "currStr_swissFranc" },
  NZD: { flag: "\u{1F1F3}\u{1F1FF}", nameKey: "currStr_nzdDollar" },
};

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes
const HISTORY_STORAGE_KEY = "currency-strength-history";
const MAX_HISTORY_POINTS = 288; // 24h at 5-min intervals

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getBarGradient(value: number): string {
  if (value >= 70) return "from-green-600 to-green-500";
  if (value >= 55) return "from-green-500 to-emerald-400";
  if (value >= 45) return "from-gray-500 to-gray-400";
  if (value >= 30) return "from-orange-500 to-orange-400";
  return "from-red-600 to-red-500";
}

function getTextColor(value: number): string {
  if (value >= 70) return "text-green-400";
  if (value >= 55) return "text-green-400";
  if (value >= 45) return "text-gray-400";
  if (value >= 30) return "text-orange-400";
  return "text-red-400";
}

function getLabel(value: number, t: (k: string) => string): string {
  if (value >= 70) return t("currStr_strong");
  if (value >= 55) return t("currStr_bullish");
  if (value >= 45) return t("currStr_neutral");
  if (value >= 30) return t("currStr_bearish");
  return t("currStr_weak");
}

function matrixCellBg(delta: number): string {
  if (delta > 25) return "bg-green-600/70";
  if (delta > 15) return "bg-green-500/50";
  if (delta > 5) return "bg-green-500/25";
  if (delta < -25) return "bg-red-600/70";
  if (delta < -15) return "bg-red-500/50";
  if (delta < -5) return "bg-red-500/25";
  return "bg-[var(--bg-secondary)]/40";
}

function formatRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(2);
  if (rate >= 10) return rate.toFixed(3);
  return rate.toFixed(4);
}

function getRanking(strengths: Record<Currency, number>): Currency[] {
  return CURRENCIES.slice().sort(
    (a, b) => (strengths[b] ?? 50) - (strengths[a] ?? 50)
  );
}

/** Extract currency codes from a trade asset like "EUR/USD" or "EURUSD" */
function extractCurrencies(asset: string): Currency[] {
  const upper = asset.toUpperCase().replace(/[^A-Z]/g, "");
  const result: Currency[] = [];
  for (const c of CURRENCIES) {
    if (upper.includes(c)) result.push(c);
  }
  return result;
}

// ---------------------------------------------------------------------------
// History persistence (localStorage)
// ---------------------------------------------------------------------------
function loadHistory(): StrengthSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StrengthSnapshot[];
  } catch {
    return [];
  }
}

function saveHistory(history: StrengthSnapshot[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // quota exceeded — drop oldest
  }
}

// ---------------------------------------------------------------------------
// SVG Sparkline Component
// ---------------------------------------------------------------------------
function Sparkline({ values, width = 30, height = 16 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const trending = values[values.length - 1] >= values[0];
  const color = trending ? "#22c55e" : "#ef4444";

  return (
    <svg width={width} height={height} className="inline-block align-middle">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Feature 1: Strength Change Alerts
// ---------------------------------------------------------------------------
function StrengthChangeAlerts({ changes, t }: { changes: RankChange[]; t: (k: string, v?: Record<string, string | number>) => string }) {
  const significant = changes.filter((c) => Math.abs(c.change) >= 2);
  if (significant.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        {t("currStr_momentumAlerts")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {significant
          .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
          .map((c) => {
            const gaining = c.change > 0;
            const info = CURRENCY_INFO[c.currency];
            return (
              <div
                key={c.currency}
                className={`rounded-xl border p-4 flex items-center gap-3 transition-all ${
                  gaining
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg text-lg ${
                    gaining ? "bg-green-500/20" : "bg-red-500/20"
                  }`}
                >
                  {info.flag}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {c.currency}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        gaining
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {gaining ? "+" : ""}{c.change} places
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {gaining
                      ? t("currStr_gainedRanks", { name: t(info.nameKey), count: Math.abs(c.change) })
                      : t("currStr_lostRanks", { name: t(info.nameKey), count: Math.abs(c.change) })}
                  </p>
                </div>
                {gaining ? (
                  <ArrowUpRight className="w-5 h-5 text-green-400 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-400 shrink-0" />
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature 2: Best Pairs Suggestions
// ---------------------------------------------------------------------------
function BestPairsSuggestions({ suggestions }: { suggestions: BestPairSuggestion[] }) {
  const { t } = useTranslation();
  if (suggestions.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-cyan-400" />
        {t("currStr_tradeSuggestions")}
      </h2>
      <div className="space-y-3">
        {suggestions.map((s, i) => {
          const longInfo = CURRENCY_INFO[s.longCcy];
          const shortInfo = CURRENCY_INFO[s.shortCcy];
          return (
            <div
              key={s.pair}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Rank badge */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-bold">
                    #{i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[var(--text-primary)]">
                        LONG {s.pair}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                        force
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {longInfo.flag} {s.longCcy} #{s.longRank} force —{" "}
                      {shortInfo.flag} {s.shortCcy} #{s.shortRank} faiblesse
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="text-xl font-bold text-cyan-400">
                    {s.divergence}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">divergence</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature 4: Performance per Currency
// ---------------------------------------------------------------------------
function CurrencyPerformance({ winRates }: { winRates: CurrencyWinRate[] }) {
  const { t } = useTranslation();
  if (winRates.length === 0) return null;

  const sorted = [...winRates].sort((a, b) => b.winRate - a.winRate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-purple-400" />
        Votre Performance par Devise
      </h2>
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5 space-y-3">
        {sorted.map((wr) => {
          const info = CURRENCY_INFO[wr.currency];
          const isBest = wr.currency === best.currency && winRates.length > 1;
          const isWorst = wr.currency === worst.currency && winRates.length > 1 && worst.currency !== best.currency;
          const barColor =
            wr.winRate >= 60
              ? "from-green-600 to-green-500"
              : wr.winRate >= 50
              ? "from-yellow-500 to-yellow-400"
              : "from-red-600 to-red-500";
          const textColor =
            wr.winRate >= 60
              ? "text-green-400"
              : wr.winRate >= 50
              ? "text-yellow-400"
              : "text-red-400";

          return (
            <div key={wr.currency} className="flex items-center gap-3">
              {/* Flag + currency */}
              <div className="flex items-center gap-2 w-24 shrink-0">
                <span className="text-lg">{info.flag}</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {wr.currency}
                </span>
              </div>

              {/* Win-rate bar */}
              <div className="flex-1 h-6 rounded-md bg-[var(--bg-secondary)]/60 overflow-hidden relative">
                <div
                  className={`h-full rounded-md bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
                  style={{ width: `${wr.winRate}%` }}
                />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm font-bold w-12 text-right ${textColor}`}>
                  {wr.winRate.toFixed(0)}%
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] w-20 text-right">
                  ({wr.wins}/{wr.total} trades)
                </span>
                {isBest && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                    {t("currStr_best")}
                  </span>
                )}
                {isWorst && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                    {t("currStr_needsWork")}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {winRates.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)]">
            Aucun trade enregistre pour calculer les statistiques
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section A: Strength Rankings (with sparklines)
// ---------------------------------------------------------------------------
function StrengthRankings({
  strengths,
  history,
}: {
  strengths: Record<Currency, number>;
  history: StrengthSnapshot[];
}) {
  const { t } = useTranslation();
  const sorted = CURRENCIES.slice()
    .sort((a, b) => (strengths[b] ?? 50) - (strengths[a] ?? 50));

  // Build sparkline data per currency from history
  const sparklines = useMemo(() => {
    const result: Record<Currency, number[]> = {} as Record<Currency, number[]>;
    for (const c of CURRENCIES) {
      result[c] = history.map((snap) => snap.strengths[c] ?? 50);
      // Add current value at end
      result[c].push(strengths[c] ?? 50);
    }
    return result;
  }, [history, strengths]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        {t("currStr_ranking")}
      </h2>
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5 space-y-3">
        {sorted.map((currency, idx) => {
          const value = strengths[currency] ?? 50;
          const info = CURRENCY_INFO[currency];
          return (
            <div key={currency} className="flex items-center gap-3">
              {/* Rank */}
              <span className="text-xs font-mono text-[var(--text-secondary)] w-5 text-right">
                {idx + 1}
              </span>

              {/* Flag + Currency */}
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span className="text-lg">{info.flag}</span>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{currency}</span>
                    {/* Sparkline */}
                    {sparklines[currency].length >= 2 && (
                      <Sparkline values={sparklines[currency]} />
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] leading-tight">{t(info.nameKey)}</div>
                </div>
              </div>

              {/* Bar */}
              <div className="flex-1 h-7 rounded-md bg-[var(--bg-secondary)]/60 overflow-hidden relative">
                <div
                  className={`h-full rounded-md bg-gradient-to-r ${getBarGradient(value)} transition-all duration-700 ease-out`}
                  style={{ width: `${value}%` }}
                />
                {/* Midline marker */}
                <div className="absolute top-0 left-1/2 h-full w-px bg-[var(--text-secondary)]/20" />
              </div>

              {/* Score */}
              <span className={`text-sm font-bold w-10 text-right ${getTextColor(value)}`}>
                {value.toFixed(1)}
              </span>

              {/* Label */}
              <span className={`text-xs w-16 text-right ${getTextColor(value)}`}>
                {getLabel(value, t)}
              </span>
            </div>
          );
        })}

        {/* Scale legend */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
          <span className="text-[10px] text-red-400">0 - Faible</span>
          <span className="text-[10px] text-orange-400">30</span>
          <span className="text-[10px] text-gray-400">50 - Neutre</span>
          <span className="text-[10px] text-green-400">70</span>
          <span className="text-[10px] text-green-500">100 - Fort</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section B: Strength Matrix
// ---------------------------------------------------------------------------
function StrengthMatrix({
  matrix,
  strengths,
}: {
  matrix: number[][];
  strengths: Record<Currency, number>;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        {t("currStr_forceMatrix")}
      </h2>
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 overflow-x-auto">
        <div className="min-w-[520px]">
          {/* Header row */}
          <div
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: `64px repeat(${CURRENCIES.length}, 1fr)` }}
          >
            <div className="h-10" />
            {CURRENCIES.map((c) => (
              <div
                key={`hdr-${c}`}
                className="h-10 flex items-center justify-center text-[11px] font-bold text-[var(--text-secondary)]"
              >
                {CURRENCY_INFO[c].flag} {c}
              </div>
            ))}
          </div>

          {/* Body rows */}
          {CURRENCIES.map((rowCurrency, ri) => (
            <div
              key={`row-${rowCurrency}`}
              className="grid gap-[2px]"
              style={{ gridTemplateColumns: `64px repeat(${CURRENCIES.length}, 1fr)` }}
            >
              <div className="h-10 flex items-center gap-1 text-[11px] font-bold text-[var(--text-secondary)] pr-1">
                {CURRENCY_INFO[rowCurrency].flag} {rowCurrency}
              </div>
              {CURRENCIES.map((colCurrency, ci) => {
                const delta = matrix[ri]?.[ci] ?? 0;
                const isDiag = ri === ci;
                return (
                  <div
                    key={`cell-${ri}-${ci}`}
                    className={`h-10 rounded flex items-center justify-center text-[11px] font-mono
                      ${isDiag ? "bg-[var(--bg-secondary)]/20" : matrixCellBg(delta)}`}
                    title={isDiag ? rowCurrency : `${rowCurrency}/${colCurrency}: ${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}
                  >
                    {isDiag ? (
                      <span className="text-[10px] text-[var(--text-secondary)] opacity-30">--</span>
                    ) : (
                      <span className={`${Math.abs(delta) > 15 ? "text-white font-semibold" : "text-[var(--text-primary)]"}`}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(0)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <p className="text-[10px] text-[var(--text-secondary)] mt-3">
          Valeurs positives (vert) = la devise de la ligne est plus forte que celle de la colonne
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section C: Pair Suggestions
// ---------------------------------------------------------------------------
function PairSuggestions({ pairs }: { pairs: PairSuggestion[] }) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        {t("currStr_tradeSuggestions")}
      </h2>
      <div className="space-y-3">
        {pairs.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)]">Aucune suggestion disponible</p>
        )}
        {pairs.map((p, i) => {
          const isLong = p.direction === "LONG";
          return (
            <div
              key={i}
              className={`rounded-xl border p-4 transition-all
                ${isLong
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-red-500/30 bg-red-500/5"
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {/* Direction icon */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg
                      ${isLong ? "bg-green-500/20" : "bg-red-500/20"}`}
                  >
                    {isLong ? (
                      <ArrowUpRight className="w-5 h-5 text-green-400" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-400" />
                    )}
                  </div>

                  {/* Pair name */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[var(--text-primary)]">
                        {p.pair}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded
                          ${isLong
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                          }`}
                      >
                        {p.direction}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{p.reason}</p>
                  </div>
                </div>

                {/* Delta */}
                <div className="text-right shrink-0 ml-3">
                  <div className={`text-xl font-bold ${isLong ? "text-green-400" : "text-red-400"}`}>
                    {p.delta.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">delta</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section D: Cross-Rates Table
// ---------------------------------------------------------------------------
function CrossRatesTable({
  rates,
  strengths,
}: {
  rates: Record<string, number>;
  strengths: Record<Currency, number>;
}) {
  const { t } = useTranslation();
  // Build cross rates from USD rates
  function getCrossRate(base: Currency, quote: Currency): number | null {
    if (base === quote) return 1;
    const baseUsd = base === "USD" ? 1 : rates[base];
    const quoteUsd = quote === "USD" ? 1 : rates[quote];
    if (!baseUsd || !quoteUsd) return null;
    return quoteUsd / baseUsd;
  }

  // Find strongest and weakest pair
  let maxDelta = 0;
  let minDelta = 999;
  let strongPair = "";
  let weakPair = "";

  for (const base of CURRENCIES) {
    for (const quote of CURRENCIES) {
      if (base === quote) continue;
      const delta = (strengths[base] ?? 50) - (strengths[quote] ?? 50);
      if (delta > maxDelta) {
        maxDelta = delta;
        strongPair = `${base}-${quote}`;
      }
      if (delta < minDelta) {
        minDelta = delta;
        weakPair = `${base}-${quote}`;
      }
    }
  }

  if (Object.keys(rates).length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Taux Croises
        </h2>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-6 text-center text-sm text-[var(--text-secondary)]">
          {t("currStr_ratesUnavailable")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        Taux Croises
      </h2>
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 overflow-x-auto">
        <table className="w-full min-w-[600px] text-[11px]">
          <thead>
            <tr>
              <th className="text-left py-2 px-1 text-[var(--text-secondary)] font-semibold">
                Base \ Quote
              </th>
              {CURRENCIES.map((c) => (
                <th key={c} className="py-2 px-1 text-center text-[var(--text-secondary)] font-semibold">
                  {CURRENCY_INFO[c].flag} {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CURRENCIES.map((base) => (
              <tr key={base} className="border-t border-[var(--border-subtle)]/50">
                <td className="py-2 px-1 font-semibold text-[var(--text-secondary)]">
                  {CURRENCY_INFO[base].flag} {base}
                </td>
                {CURRENCIES.map((quote) => {
                  const rate = getCrossRate(base, quote);
                  const isDiag = base === quote;
                  const pairKey = `${base}-${quote}`;
                  const isStrong = pairKey === strongPair;
                  const isWeak = pairKey === weakPair;

                  return (
                    <td
                      key={quote}
                      className={`py-2 px-1 text-center font-mono
                        ${isDiag ? "text-[var(--text-secondary)]/40" : "text-[var(--text-primary)]"}
                        ${isStrong ? "bg-green-500/15 font-bold text-green-400 rounded" : ""}
                        ${isWeak ? "bg-red-500/15 font-bold text-red-400 rounded" : ""}
                      `}
                    >
                      {isDiag ? "--" : rate !== null ? formatRate(rate) : "N/A"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex gap-4 mt-3 text-[10px] text-[var(--text-secondary)]">
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
            {t("currStr_strongestDivergence")}
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />
            {t("currStr_weakestDivergence")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------
function RankingSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5 space-y-3 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-5 h-4 rounded bg-[var(--bg-secondary)]" />
          <div className="w-28 h-8 rounded bg-[var(--bg-secondary)]" />
          <div className="flex-1 h-7 rounded bg-[var(--bg-secondary)]" />
          <div className="w-10 h-4 rounded bg-[var(--bg-secondary)]" />
          <div className="w-16 h-4 rounded bg-[var(--bg-secondary)]" />
        </div>
      ))}
    </div>
  );
}

function MatrixSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 animate-pulse">
      <div className="grid grid-cols-9 gap-1">
        {Array.from({ length: 81 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-[var(--bg-secondary)]/40" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function CurrencyStrengthPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [history, setHistory] = useState<StrengthSnapshot[]>([]);
  const [prevRanking, setPrevRanking] = useState<Currency[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { trades } = useTrades();
  const { t } = useTranslation();

  // Load history from localStorage on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/currency-strength");
      if (!res.ok) {
        // If we have no previous data, show error
        if (!data) {
          setError("Données indisponibles — Réessayez ultérieurement");
        }
        return;
      }
      const json: ApiResponse = await res.json();

      // Save previous ranking before updating
      if (data?.strengths) {
        setPrevRanking(getRanking(data.strengths));
      }

      setData(json);
      setLastUpdate(new Date().toLocaleTimeString("fr-FR"));

      // Append to history
      const snapshot: StrengthSnapshot = {
        strengths: json.strengths,
        timestamp: Date.now(),
      };
      setHistory((prev) => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const filtered = prev.filter((s) => s.timestamp > cutoff);
        const updated = [...filtered, snapshot].slice(-MAX_HISTORY_POINTS);
        saveHistory(updated);
        return updated;
      });
    } catch {
      // keep previous data, but show error if no data loaded yet
      if (!data) {
        setError("Données indisponibles — Réessayez ultérieurement");
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial load + auto-refresh every 5 min
  useEffect(() => {
    load();
    timerRef.current = setInterval(load, AUTO_REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  const strengths = data?.strengths ?? ({} as Record<Currency, number>);
  const matrix = data?.matrix ?? [];
  const pairs = data?.pairs ?? [];
  const rates = data?.rates ?? {};

  // ---- Feature 1: Compute rank changes ----
  const rankChanges = useMemo<RankChange[]>(() => {
    if (!prevRanking || !data?.strengths) return [];
    const currentRanking = getRanking(data.strengths);
    const changes: RankChange[] = [];
    for (const currency of CURRENCIES) {
      const oldRank = prevRanking.indexOf(currency) + 1;
      const newRank = currentRanking.indexOf(currency) + 1;
      if (oldRank > 0 && newRank > 0 && oldRank !== newRank) {
        changes.push({
          currency,
          oldRank,
          newRank,
          change: oldRank - newRank, // positive = moved up
        });
      }
    }
    return changes;
  }, [prevRanking, data?.strengths]);

  // ---- Feature 2: Best pairs from strength divergence ----
  const bestPairs = useMemo<BestPairSuggestion[]>(() => {
    if (!data?.strengths) return [];
    const ranking = getRanking(data.strengths);
    const result: BestPairSuggestion[] = [];
    const top3 = ranking.slice(0, 3);
    const bottom3 = ranking.slice(-3).reverse();

    const seen = new Set<string>();
    for (const strong of top3) {
      for (const weak of bottom3) {
        const pairKey = `${strong}/${weak}`;
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        const strongRank = ranking.indexOf(strong) + 1;
        const weakRank = ranking.indexOf(weak) + 1;
        result.push({
          pair: pairKey,
          longCcy: strong,
          shortCcy: weak,
          longRank: strongRank,
          shortRank: weakRank,
          divergence: weakRank - strongRank,
        });
      }
    }

    return result
      .sort((a, b) => b.divergence - a.divergence)
      .slice(0, 3);
  }, [data?.strengths]);

  // ---- Feature 4: Win rate per currency from trades ----
  const currencyWinRates = useMemo<CurrencyWinRate[]>(() => {
    const stats: Record<Currency, { wins: number; total: number }> = {} as Record<
      Currency,
      { wins: number; total: number }
    >;

    for (const trade of trades) {
      const ccys = extractCurrencies(trade.asset);
      const isWin = trade.result > 0;
      for (const c of ccys) {
        if (!stats[c]) stats[c] = { wins: 0, total: 0 };
        stats[c].total++;
        if (isWin) stats[c].wins++;
      }
    }

    const result: CurrencyWinRate[] = [];
    for (const c of CURRENCIES) {
      if (stats[c] && stats[c].total > 0) {
        result.push({
          currency: c,
          wins: stats[c].wins,
          total: stats[c].total,
          winRate: (stats[c].wins / stats[c].total) * 100,
        });
      }
    }
    return result;
  }, [trades]);

  // --- AI Insights: Paires recommandées ---
  const currencyInsights = useMemo<InsightItem[]>(() => {
    if (!data?.strengths) return [];
    const items: InsightItem[] = [];
    const ranking = getRanking(data.strengths);

    // Strongest vs weakest
    if (ranking.length >= 2) {
      const strongest = ranking[0];
      const weakest = ranking[ranking.length - 1];
      items.push({
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        text: `Paire idéale : Long ${strongest}/${weakest} — Force max. vs faiblesse max.`,
        type: "bullish",
      });
    }

    // Cross-reference with user's best performing currencies
    const bestCurrencies = currencyWinRates
      .filter((c) => c.winRate > 60 && c.total >= 3)
      .sort((a, b) => b.winRate - a.winRate);
    const worstCurrencies = currencyWinRates
      .filter((c) => c.winRate < 40 && c.total >= 3);

    if (bestCurrencies.length > 0) {
      const topCcy = bestCurrencies[0];
      const isStrong = ranking.indexOf(topCcy.currency) < 4;
      items.push({
        icon: <Trophy className="w-3.5 h-3.5" />,
        text: `${topCcy.currency} : Votre meilleure devise (${topCcy.winRate.toFixed(0)}% WR) — ${isStrong ? "Actuellement forte, alignement favorable" : "Actuellement faible, attendez un retournement"}`,
        type: isStrong ? "bullish" : "neutral",
      });
    }

    if (worstCurrencies.length > 0) {
      const worst = worstCurrencies[0];
      items.push({
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        text: `${worst.currency} : Devise problématique pour vous (${worst.winRate.toFixed(0)}% WR) — Évitez ou réduisez la taille`,
        type: "warning",
      });
    }

    // Best pair combining strength data + user performance
    if (bestPairs.length > 0 && bestCurrencies.length > 0) {
      const aligned = bestPairs.find((p) =>
        bestCurrencies.some((c) => c.currency === p.longCcy || c.currency === p.shortCcy)
      );
      if (aligned) {
        items.push({
          icon: <Target className="w-3.5 h-3.5" />,
          text: `${aligned.pair} combine force relative et votre performance — Signal aligné`,
          type: "bullish",
        });
      }
    }

    return items.slice(0, 4);
  }, [data?.strengths, currencyWinRates, bestPairs]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Activity className="w-6 h-6 text-cyan-400" />
            {t("currStr_title")}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Analyse de la force relative des 8 devises majeures
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-[10px] text-[var(--text-secondary)]">
              Mis a jour : {lastUpdate}
              {data?.source ? ` (${data.source})` : ""}
            </span>
          )}
          <button
            onClick={load}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition border border-[var(--border-subtle)]"
            title={t("currStr_refreshTitle")}
          >
            <RefreshCw
              className={`w-5 h-5 text-[var(--text-secondary)] ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && !data && !loading && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="text-amber-300 font-semibold mb-1">Données indisponibles</p>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && !data ? (
        <div className="space-y-6">
          <div>
            <div className="w-40 h-5 rounded bg-[var(--bg-secondary)] mb-4 animate-pulse" />
            <RankingSkeleton />
          </div>
          <div>
            <div className="w-32 h-5 rounded bg-[var(--bg-secondary)] mb-4 animate-pulse" />
            <MatrixSkeleton />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Feature 1: Strength Change Alerts */}
          {/* === AI Insights: Paires recommandées === */}
          {currencyInsights.length > 0 && (
            <AIInsightsCard
              title="Paires recommandées"
              insights={currencyInsights}
              minimumTrades={5}
              currentTradeCount={trades.length}
            />
          )}

          <StrengthChangeAlerts changes={rankChanges} t={t} />

          {/* Section A: Strength Rankings (with sparklines) */}
          <StrengthRankings strengths={strengths} history={history} />

          {/* Feature 2: Best Pairs Suggestions */}
          <BestPairsSuggestions suggestions={bestPairs} />

          {/* Section B: Strength Matrix */}
          {matrix.length > 0 && (
            <StrengthMatrix matrix={matrix} strengths={strengths} />
          )}

          {/* Bottom row: Suggestions + Cross-Rates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section C: Pair Suggestions */}
            <PairSuggestions pairs={pairs} />

            {/* Section D: Cross-Rates Table */}
            <CrossRatesTable rates={rates} strengths={strengths} />
          </div>

          {/* Feature 4: Performance per Currency */}
          {currencyWinRates.length > 0 && (
            <CurrencyPerformance winRates={currencyWinRates} />
          )}
        </div>
      )}
    </div>
  );
}
