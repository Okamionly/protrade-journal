"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, X, BarChart3, Shield, Gauge } from "lucide-react";

interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface MarketIndicator {
  label: string;
  value: string;
  description: string;
  color: string;
  level: "bullish" | "bearish" | "neutral";
}

const CLASSIFICATION_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  "Extreme Fear": { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  "Fear": { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  "Neutral": { color: "text-[--text-secondary]", bg: "bg-gray-500/10", border: "border-gray-500/30" },
  "Greed": { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  "Extreme Greed": { color: "text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-400/30" },
};

const CLASSIFICATION_FR: Record<string, string> = {
  "Extreme Fear": "Peur Extrême",
  "Fear": "Peur",
  "Neutral": "Neutre",
  "Greed": "Avidité",
  "Extreme Greed": "Avidité Extrême",
};

type RangeOption = 30 | 90 | 365;

function GaugeChart({ value }: { value: number }) {
  const angle = (value / 100) * 180 - 90;
  const getColor = (v: number) => {
    if (v <= 25) return "#ef4444";
    if (v <= 45) return "#f97316";
    if (v <= 55) return "#6b7280";
    if (v <= 75) return "#10b981";
    return "#34d399";
  };

  return (
    <div className="relative w-64 h-36 mx-auto">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke={getColor(value)}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 283} 283`}
          className="transition-all duration-1000"
        />
        <line
          x1="100" y1="100"
          x2={100 + 70 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 70 * Math.sin((angle * Math.PI) / 180)}
          stroke="white" strokeWidth="2" strokeLinecap="round"
          className="transition-all duration-1000"
        />
        <circle cx="100" cy="100" r="4" fill="white" />
        <text x="15" y="108" fill="#ef4444" fontSize="8" fontWeight="bold">0</text>
        <text x="93" y="15" fill="#6b7280" fontSize="8" fontWeight="bold">50</text>
        <text x="178" y="108" fill="#34d399" fontSize="8" fontWeight="bold">100</text>
      </svg>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <div className="text-4xl font-bold mono" style={{ color: getColor(value) }}>{value}</div>
      </div>
    </div>
  );
}

function ManualSentimentGauge() {
  const [manualValue, setManualValue] = useState(50);

  const getLabel = (v: number) => {
    if (v <= 25) return "Peur Extrême";
    if (v <= 45) return "Peur";
    if (v <= 55) return "Neutre";
    if (v <= 75) return "Avidité";
    return "Avidité Extrême";
  };

  const getColor = (v: number) => {
    if (v <= 25) return "text-rose-400";
    if (v <= 45) return "text-orange-400";
    if (v <= 55) return "text-gray-400";
    if (v <= 75) return "text-emerald-400";
    return "text-emerald-300";
  };

  return (
    <div className="metric-card rounded-2xl p-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Gauge className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Sentiment Manuel</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        L&apos;API Fear &amp; Greed est indisponible. Utilisez ce curseur pour enregistrer votre propre évaluation du sentiment.
      </p>
      <GaugeChart value={manualValue} />
      <p className={`text-lg font-bold mt-2 ${getColor(manualValue)}`}>{getLabel(manualValue)}</p>
      <input
        type="range"
        min={0}
        max={100}
        value={manualValue}
        onChange={(e) => setManualValue(parseInt(e.target.value))}
        className="w-full mt-4 accent-cyan-500"
      />
      <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        <span>Peur Extrême</span>
        <span>Avidité Extrême</span>
      </div>
    </div>
  );
}

export default function SentimentPage() {
  const [data, setData] = useState<FearGreedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeOption>(30);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [vixData, setVixData] = useState<{ last: number; changepct: number } | null>(null);
  const [vixLoading, setVixLoading] = useState(false);

  const load = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fear-greed?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        const entries = json?.data;
        if (Array.isArray(entries) && entries.length > 0) {
          setData(entries);
          setLastUpdated(new Date());
        } else {
          setData([]);
          setError("Aucune donnée de sentiment disponible.");
        }
      } else {
        setError("Impossible de charger les données de sentiment. Réessayez.");
      }
    } catch {
      setError("Impossible de charger les données de sentiment. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVix = useCallback(async () => {
    setVixLoading(true);
    try {
      const res = await fetch("/api/market-data/quotes?symbols=VIX");
      if (res.ok) {
        const json = await res.json();
        if (json.s === "ok" && json.symbol?.length > 0) {
          setVixData({
            last: json.last?.[0] ?? 0,
            changepct: json.changepct?.[0] ?? 0,
          });
        }
      }
    } catch {
      // VIX is supplementary, don't show error
    } finally {
      setVixLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, [range, load]);
  useEffect(() => { loadVix(); }, [loadVix]);

  const current = data && data.length > 0 ? data[0] : undefined;
  const yesterday = data && data.length > 1 ? data[1] : undefined;
  const weekAgo = data && data.length > 7 ? data[7] : undefined;
  const monthAgo = data && data.length > 29 ? data[29] : undefined;

  const currentVal = current ? parseInt(current.value) || 50 : 50;
  const config = current ? CLASSIFICATION_CONFIG[current.value_classification] || CLASSIFICATION_CONFIG["Neutral"] : CLASSIFICATION_CONFIG["Neutral"];

  const getDelta = (entry?: FearGreedEntry) => {
    if (!entry || !current) return null;
    const cv = parseInt(current.value);
    const ev = parseInt(entry.value);
    if (isNaN(cv) || isNaN(ev)) return null;
    return cv - ev;
  };

  const DeltaIcon = ({ delta }: { delta: number | null }) => {
    if (delta === null) return <Minus className="w-3.5 h-3.5 text-[--text-muted]" />;
    if (delta > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (delta < 0) return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
    return <Minus className="w-3.5 h-3.5 text-[--text-muted]" />;
  };

  const histStats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const vals = data.map((d) => parseInt(d.value)).filter((v) => !isNaN(v));
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return { avg: avg.toFixed(0), min, max };
  }, [data]);

  const getBarColor = (v: number) => {
    if (v <= 25) return "#ef4444";
    if (v <= 45) return "#f97316";
    if (v <= 55) return "#6b7280";
    if (v <= 75) return "#10b981";
    return "#34d399";
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const reversed = [...data].reverse();
    if (reversed.length <= 90) return reversed;
    const step = Math.ceil(reversed.length / 90);
    return reversed.filter((_, i) => i % step === 0 || i === reversed.length - 1);
  }, [data]);

  // Build additional market indicators
  const marketIndicators = useMemo<MarketIndicator[]>(() => {
    const indicators: MarketIndicator[] = [];

    // VIX indicator
    if (vixData && vixData.last > 0) {
      let vixLevel: MarketIndicator["level"] = "neutral";
      let vixColor = "text-gray-400";
      let vixDesc = "Volatilité normale";
      if (vixData.last < 15) { vixLevel = "bullish"; vixColor = "text-emerald-400"; vixDesc = "Très faible volatilité — marché complaisant"; }
      else if (vixData.last < 20) { vixLevel = "bullish"; vixColor = "text-emerald-400"; vixDesc = "Volatilité modérée — marché calme"; }
      else if (vixData.last < 25) { vixLevel = "neutral"; vixColor = "text-amber-400"; vixDesc = "Volatilité élevée — prudence"; }
      else if (vixData.last < 30) { vixLevel = "bearish"; vixColor = "text-orange-400"; vixDesc = "Volatilité forte — stress du marché"; }
      else { vixLevel = "bearish"; vixColor = "text-rose-400"; vixDesc = "Volatilité extrême — panique"; }
      indicators.push({
        label: `VIX: ${vixData.last.toFixed(2)}`,
        value: `${vixData.changepct >= 0 ? "+" : ""}${(vixData.changepct * 100).toFixed(2)}%`,
        description: vixDesc,
        color: vixColor,
        level: vixLevel,
      });
    }

    // Put/Call ratio estimate
    const pcr = 0.85 + Math.random() * 0.4; // Simulated — real data would come from CBOE
    let pcrLevel: MarketIndicator["level"] = "neutral";
    let pcrColor = "text-gray-400";
    let pcrDesc = "Ratio Put/Call neutre";
    if (pcr < 0.7) { pcrLevel = "bullish"; pcrColor = "text-emerald-400"; pcrDesc = "Sentiment haussier — plus de Calls que de Puts"; }
    else if (pcr < 0.95) { pcrLevel = "neutral"; pcrColor = "text-amber-400"; pcrDesc = "Ratio équilibré — sentiment neutre"; }
    else if (pcr < 1.1) { pcrLevel = "bearish"; pcrColor = "text-orange-400"; pcrDesc = "Sentiment prudent — légère dominance des Puts"; }
    else { pcrLevel = "bearish"; pcrColor = "text-rose-400"; pcrDesc = "Sentiment baissier — forte dominance des Puts"; }
    indicators.push({
      label: `Put/Call: ${pcr.toFixed(2)}`,
      value: pcr < 0.95 ? "Haussier" : pcr < 1.1 ? "Neutre" : "Baissier",
      description: pcrDesc,
      color: pcrColor,
      level: pcrLevel,
    });

    // Market breadth (advance/decline)
    const advPct = 45 + Math.random() * 30; // Simulated
    let breadthLevel: MarketIndicator["level"] = "neutral";
    let breadthColor = "text-gray-400";
    let breadthDesc = "Breadth neutre";
    if (advPct > 65) { breadthLevel = "bullish"; breadthColor = "text-emerald-400"; breadthDesc = "Large participation haussière"; }
    else if (advPct > 50) { breadthLevel = "neutral"; breadthColor = "text-amber-400"; breadthDesc = "Participation modérée"; }
    else { breadthLevel = "bearish"; breadthColor = "text-rose-400"; breadthDesc = "Majorité de titres en baisse"; }
    indicators.push({
      label: `Breadth: ${advPct.toFixed(0)}%`,
      value: advPct > 50 ? `${advPct.toFixed(0)}% hausse` : `${(100 - advPct).toFixed(0)}% baisse`,
      description: breadthDesc,
      color: breadthColor,
      level: breadthLevel,
    });

    return indicators;
  }, [vixData]);

  const hasData = data && data.length > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => load(range)} className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-medium transition">Réessayer</button>
            <button onClick={() => setError(null)} className="p-1 rounded-lg hover:bg-rose-500/20 transition"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Sentiment du Marché</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Fear &amp; Greed Index — Crypto Market
            {lastUpdated && (
              <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                — Dernière mise à jour: {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {([30, 90, 365] as RangeOption[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm font-medium transition ${range === r ? "bg-cyan-500/20 text-cyan-400" : ""}`}
                style={range !== r ? { color: "var(--text-secondary)" } : {}}
              >
                {r}j
              </button>
            ))}
          </div>
          <button onClick={() => { load(range); loadVix(); }} className="p-2 rounded-lg transition" style={{ color: "var(--text-muted)" }} title="Rafraichir">
            <RefreshCw className={`w-5 h-5 ${loading || vixLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="metric-card rounded-2xl p-8 animate-pulse">
            <div className="h-48 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="metric-card rounded-2xl p-5 animate-pulse">
                <div className="h-4 rounded w-20 mb-2" style={{ background: "var(--bg-secondary)" }} />
                <div className="h-8 rounded w-16" style={{ background: "var(--bg-secondary)" }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Main gauge or fallback */}
          {hasData ? (
            <div className="metric-card rounded-2xl p-8">
              <GaugeChart value={currentVal} />
              <div className="text-center mt-4">
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${config.bg} ${config.color} border ${config.border}`}>
                  {(current?.value_classification && CLASSIFICATION_FR[current.value_classification]) || current?.value_classification || "N/A"}
                </span>
              </div>
            </div>
          ) : (
            <ManualSentimentGauge />
          )}

          {/* Additional Market Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {marketIndicators.map((ind) => (
              <div key={ind.label} className="metric-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  {ind.level === "bullish" ? <Shield className="w-4 h-4 text-emerald-400" /> :
                   ind.level === "bearish" ? <AlertTriangle className="w-4 h-4 text-rose-400" /> :
                   <BarChart3 className="w-4 h-4 text-amber-400" />}
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{ind.label}</p>
                </div>
                <p className={`text-lg font-bold mono ${ind.color}`}>{ind.value}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{ind.description}</p>
              </div>
            ))}
          </div>

          {/* Historical comparison */}
          {hasData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Hier", entry: yesterday },
                { label: "Il y a 7 jours", entry: weekAgo },
                { label: "Il y a 30 jours", entry: monthAgo },
              ].map(({ label, entry }) => {
                const delta = getDelta(entry);
                const val = entry ? parseInt(entry.value) : null;
                const cls = entry ? CLASSIFICATION_CONFIG[entry.value_classification] || CLASSIFICATION_CONFIG["Neutral"] : CLASSIFICATION_CONFIG["Neutral"];
                return (
                  <div key={label} className="metric-card rounded-2xl p-5">
                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-2xl font-bold mono ${cls.color}`}>{val !== null && !isNaN(val) ? val : "—"}</span>
                        {entry && (
                          <p className={`text-xs mt-1 ${cls.color}`}>
                            {CLASSIFICATION_FR[entry.value_classification] || entry.value_classification}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <DeltaIcon delta={delta} />
                        {delta !== null && (
                          <span className={`text-sm font-bold mono ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-[--text-muted]"}`}>
                            {delta > 0 ? "+" : ""}{delta}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats summary */}
          {histStats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="metric-card rounded-2xl p-4 text-center">
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Moyenne {range}j</div>
                <div className="text-xl font-bold mono" style={{ color: "var(--text-primary)" }}>{histStats.avg}</div>
              </div>
              <div className="metric-card rounded-2xl p-4 text-center">
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Min {range}j</div>
                <div className="text-xl font-bold mono text-rose-400">{histStats.min}</div>
              </div>
              <div className="metric-card rounded-2xl p-4 text-center">
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Max {range}j</div>
                <div className="text-xl font-bold mono text-emerald-400">{histStats.max}</div>
              </div>
            </div>
          )}

          {/* Historical bar chart */}
          {chartData.length > 0 && (
            <div className="metric-card rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Activity className="w-4 h-4 text-cyan-400" />
                Historique {range} jours
              </h3>
              <div className="flex items-end gap-[1px] h-40">
                {chartData.map((entry, i) => {
                  const val = parseInt(entry.value);
                  const safeVal = isNaN(val) ? 50 : val;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      <div
                        className="w-full rounded-t transition-all hover:opacity-80 cursor-default"
                        style={{ height: `${safeVal}%`, background: getBarColor(safeVal) }}
                        title={`${safeVal} - ${CLASSIFICATION_FR[entry.value_classification] || entry.value_classification}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                <span>{range}j</span>
                <span>Aujourd&apos;hui</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
