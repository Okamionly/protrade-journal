"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Activity } from "lucide-react";

const CURRENCY_INFO: Record<string, { flag: string; name: string }> = {
  USD: { flag: "\u{1F1FA}\u{1F1F8}", name: "Dollar US" },
  EUR: { flag: "\u{1F1EA}\u{1F1FA}", name: "Euro" },
  GBP: { flag: "\u{1F1EC}\u{1F1E7}", name: "Livre Sterling" },
  JPY: { flag: "\u{1F1EF}\u{1F1F5}", name: "Yen Japonais" },
  AUD: { flag: "\u{1F1E6}\u{1F1FA}", name: "Dollar Australien" },
  CAD: { flag: "\u{1F1E8}\u{1F1E6}", name: "Dollar Canadien" },
  CHF: { flag: "\u{1F1E8}\u{1F1ED}", name: "Franc Suisse" },
  NZD: { flag: "\u{1F1F3}\u{1F1FF}", name: "Dollar Néo-Zélandais" },
};

function getStrengthColor(value: number): string {
  if (value >= 70) return "bg-emerald-500";
  if (value >= 55) return "bg-emerald-500/60";
  if (value >= 45) return "bg-gray-500";
  if (value >= 30) return "bg-rose-500/60";
  return "bg-rose-500";
}

function getStrengthLabel(value: number): { text: string; color: string } {
  if (value >= 70) return { text: "Fort", color: "text-emerald-400" };
  if (value >= 55) return { text: "Haussier", color: "text-emerald-400/70" };
  if (value >= 45) return { text: "Neutre", color: "text-gray-400" };
  if (value >= 30) return { text: "Baissier", color: "text-rose-400/70" };
  return { text: "Faible", color: "text-rose-400" };
}

export default function CurrencyStrengthPage() {
  const [strengths, setStrengths] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/currency-strength");
      if (res.ok) {
        const data = await res.json();
        if (data.strengths) {
          setStrengths(data.strengths);
        } else {
          // Parse currencyquake format
          const parsed: Record<string, number> = {};
          Object.keys(CURRENCY_INFO).forEach((c) => {
            parsed[c] = data[c] != null ? parseFloat(data[c]) : 50;
          });
          setStrengths(parsed);
        }
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sorted = Object.entries(strengths)
    .filter(([c]) => CURRENCY_INFO[c])
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Currency Strength
          </h1>
          <p className="text-sm text-gray-400 mt-1">Force relative des devises majeures</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition">
          <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-6 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-700/30 rounded mb-2" />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 space-y-3">
          {sorted.map(([currency, value], i) => {
            const info = CURRENCY_INFO[currency];
            const label = getStrengthLabel(value);
            return (
              <div key={currency} className="flex items-center gap-4">
                <span className="text-lg w-8 text-center">{i + 1}</span>
                <span className="text-xl">{info.flag}</span>
                <div className="w-12">
                  <span className="font-bold text-sm">{currency}</span>
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-800/50 rounded-lg overflow-hidden relative">
                    <div className={`h-full rounded-lg ${getStrengthColor(value)} transition-all duration-500`}
                      style={{ width: `${value}%` }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold mono">{value.toFixed(1)}</span>
                  </div>
                </div>
                <span className={`text-xs font-medium w-16 text-right ${label.color}`}>{label.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pair suggestions */}
      {sorted.length >= 2 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-3">Paires à surveiller</h3>
          <div className="flex flex-wrap gap-2">
            {sorted.length >= 2 && (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Long {sorted[0][0]}/{sorted[sorted.length - 1][0]}
              </span>
            )}
            {sorted.length >= 4 && (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Long {sorted[0][0]}/{sorted[sorted.length - 2][0]}
              </span>
            )}
            {sorted.length >= 2 && (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                Short {sorted[sorted.length - 1][0]}/{sorted[0][0]}
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Basé sur la différence de force entre devises</p>
        </div>
      )}
    </div>
  );
}
