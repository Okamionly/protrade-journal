"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];

const CURRENCY_INFO: Record<Currency, { flag: string; name: string }> = {
  USD: { flag: "\u{1F1FA}\u{1F1F8}", name: "Dollar US" },
  EUR: { flag: "\u{1F1EA}\u{1F1FA}", name: "Euro" },
  GBP: { flag: "\u{1F1EC}\u{1F1E7}", name: "Livre Sterling" },
  JPY: { flag: "\u{1F1EF}\u{1F1F5}", name: "Yen Japonais" },
  AUD: { flag: "\u{1F1E6}\u{1F1FA}", name: "Dollar Australien" },
  CAD: { flag: "\u{1F1E8}\u{1F1E6}", name: "Dollar Canadien" },
  CHF: { flag: "\u{1F1E8}\u{1F1ED}", name: "Franc Suisse" },
  NZD: { flag: "\u{1F1F3}\u{1F1FF}", name: "Dollar Neo-Zelandais" },
};

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getBarColor(value: number): string {
  if (value >= 70) return "bg-green-600";
  if (value >= 55) return "bg-green-500";
  if (value >= 45) return "bg-gray-400";
  if (value >= 30) return "bg-orange-500";
  return "bg-red-500";
}

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

function getLabel(value: number): string {
  if (value >= 70) return "Fort";
  if (value >= 55) return "Haussier";
  if (value >= 45) return "Neutre";
  if (value >= 30) return "Baissier";
  return "Faible";
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

// ---------------------------------------------------------------------------
// Section A: Strength Rankings
// ---------------------------------------------------------------------------
function StrengthRankings({ strengths }: { strengths: Record<Currency, number> }) {
  const sorted = CURRENCIES.slice()
    .sort((a, b) => (strengths[b] ?? 50) - (strengths[a] ?? 50));

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        Classement des Devises
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
                  <span className="text-sm font-bold text-[var(--text-primary)]">{currency}</span>
                  <div className="text-[10px] text-[var(--text-secondary)] leading-tight">{info.name}</div>
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
                {getLabel(value)}
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
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        Matrice de Force
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
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        Suggestions de Trades
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
          Taux de change non disponibles (source: fallback)
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
            Plus forte divergence
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />
            Plus faible divergence
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
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/currency-strength");
      if (res.ok) {
        const json: ApiResponse = await res.json();
        setData(json);
        setLastUpdate(new Date().toLocaleTimeString("fr-FR"));
      }
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Activity className="w-6 h-6 text-cyan-400" />
            Force des Devises
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
            title="Rafraichir"
          >
            <RefreshCw
              className={`w-5 h-5 text-[var(--text-secondary)] ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

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
          {/* Section A: Strength Rankings */}
          <StrengthRankings strengths={strengths} />

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
        </div>
      )}
    </div>
  );
}
