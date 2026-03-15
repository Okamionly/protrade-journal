"use client";

import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

const CLASSIFICATION_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  "Extreme Fear": { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  "Fear": { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  "Neutral": { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30" },
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

function GaugeChart({ value }: { value: number }) {
  const angle = (value / 100) * 180 - 90; // -90 to 90 degrees
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
        {/* Background arc */}
        <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" strokeLinecap="round" />
        {/* Value arc */}
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke={getColor(value)}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 283} 283`}
          className="transition-all duration-1000"
        />
        {/* Needle */}
        <line
          x1="100" y1="100"
          x2={100 + 70 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 70 * Math.sin((angle * Math.PI) / 180)}
          stroke="white" strokeWidth="2" strokeLinecap="round"
          className="transition-all duration-1000"
        />
        <circle cx="100" cy="100" r="4" fill="white" />
        {/* Labels */}
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

export default function SentimentPage() {
  const [data, setData] = useState<FearGreedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fear-greed");
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const current = data[0];
  const yesterday = data[1];
  const weekAgo = data[7];
  const monthAgo = data[29];

  const currentVal = current ? parseInt(current.value) : 50;
  const config = current ? CLASSIFICATION_CONFIG[current.value_classification] || CLASSIFICATION_CONFIG["Neutral"] : CLASSIFICATION_CONFIG["Neutral"];

  const getDelta = (entry?: FearGreedEntry) => {
    if (!entry || !current) return null;
    return parseInt(current.value) - parseInt(entry.value);
  };

  const DeltaIcon = ({ delta }: { delta: number | null }) => {
    if (delta === null) return <Minus className="w-3.5 h-3.5 text-gray-500" />;
    if (delta > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (delta < 0) return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
    return <Minus className="w-3.5 h-3.5 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sentiment du Marché</h1>
          <p className="text-sm text-gray-400 mt-1">Fear & Greed Index — Crypto Market</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition" title="Rafraichir">
          <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-8 animate-pulse">
          <div className="h-48 bg-gray-700/30 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Main gauge */}
          <div className="glass rounded-2xl p-8">
            <GaugeChart value={currentVal} />
            <div className="text-center mt-4">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${config.bg} ${config.color} border ${config.border}`}>
                {CLASSIFICATION_FR[current?.value_classification] || current?.value_classification}
              </span>
            </div>
          </div>

          {/* Historical comparison */}
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
                <div key={label} className="glass rounded-2xl p-5">
                  <p className="text-xs text-gray-500 mb-2">{label}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-2xl font-bold mono ${cls.color}`}>{val ?? "—"}</span>
                      {entry && (
                        <p className={`text-xs mt-1 ${cls.color}`}>
                          {CLASSIFICATION_FR[entry.value_classification] || entry.value_classification}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <DeltaIcon delta={delta} />
                      {delta !== null && (
                        <span className={`text-sm font-bold mono ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-gray-500"}`}>
                          {delta > 0 ? "+" : ""}{delta}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 30-day history bar chart */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Historique 30 jours
            </h3>
            <div className="flex items-end gap-1 h-32">
              {[...data].reverse().map((entry, i) => {
                const val = parseInt(entry.value);
                const getBarColor = (v: number) => {
                  if (v <= 25) return "bg-rose-500";
                  if (v <= 45) return "bg-orange-500";
                  if (v <= 55) return "bg-gray-500";
                  if (v <= 75) return "bg-emerald-500";
                  return "bg-emerald-400";
                };
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div
                      className={`w-full rounded-t ${getBarColor(val)} transition-all hover:opacity-80`}
                      style={{ height: `${val}%` }}
                      title={`${val} - ${CLASSIFICATION_FR[entry.value_classification] || entry.value_classification}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>30j</span>
              <span>Aujourd&apos;hui</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
