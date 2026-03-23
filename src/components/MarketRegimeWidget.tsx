"use client";

import { useState, useEffect, useMemo } from "react";
import { Activity } from "lucide-react";

type Regime = "risk-on" | "neutre" | "risk-off" | "panique";

interface RegimeInfo {
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  advice: string;
}

const REGIMES: Record<Regime, RegimeInfo> = {
  "risk-on": {
    label: "Risk-On",
    icon: "\u{1F680}",
    color: "#34d399",
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.25)",
    advice: "Conditions favorables — Exploitez vos setups avec confiance",
  },
  neutre: {
    label: "Neutre",
    icon: "\u{2696}\u{FE0F}",
    color: "#9ca3af",
    bg: "rgba(107,114,128,0.10)",
    border: "rgba(107,114,128,0.25)",
    advice: "Marché indécis — Soyez sélectif dans vos entrées",
  },
  "risk-off": {
    label: "Risk-Off",
    icon: "\u{1F6E1}\u{FE0F}",
    color: "#f87171",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.25)",
    advice: "Prudence — Réduisez la taille de vos positions",
  },
  panique: {
    label: "Panique",
    icon: "\u{26A0}\u{FE0F}",
    color: "#dc2626",
    bg: "rgba(185,28,28,0.12)",
    border: "rgba(185,28,28,0.30)",
    advice: "Peur extrême — Protégez votre capital avant tout",
  },
};

function computeRegime(fg: number, vix: number): Regime {
  if (fg < 20 && vix > 30) return "panique";
  if (fg < 40 && vix > 25) return "risk-off";
  if (fg > 60 && vix < 20) return "risk-on";
  return "neutre";
}

export function MarketRegimeWidget() {
  const [fg, setFg] = useState<number | null>(null);
  const [vix, setVix] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [vixRes, fgRes] = await Promise.all([
          fetch("/api/market-data/vix").then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch("/api/fear-greed?days=1").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        if (cancelled) return;

        if (vixRes?.vix?.current) setVix(vixRes.vix.current);
        if (fgRes?.data?.[0]?.value) setFg(parseInt(fgRes.data[0].value, 10));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const regime = useMemo(() => {
    if (fg === null || vix === null) return null;
    return computeRegime(fg, vix);
  }, [fg, vix]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-3 w-28 rounded bg-[--bg-secondary] mb-3" />
        <div className="h-5 w-20 rounded bg-[--bg-secondary] mb-2" />
        <div className="h-3 w-full rounded bg-[--bg-secondary]" />
      </div>
    );
  }

  if (!regime) {
    return (
      <div className="glass rounded-2xl p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Régime de Marché
        </h4>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Données indisponibles
        </p>
      </div>
    );
  }

  const info = REGIMES[regime];

  return (
    <div
      className="glass rounded-2xl p-4"
      style={{ border: `1px solid ${info.border}` }}
    >
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
        Régime de Marché
      </h4>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{info.icon}</span>
        <span
          className="text-lg font-bold"
          style={{ color: info.color }}
        >
          {info.label}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {info.advice}
      </p>
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-800">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
          <span className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
            VIX {vix !== null ? vix.toFixed(1) : "—"}
          </span>
        </div>
        <span className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
          F&G {fg !== null ? fg : "—"}
        </span>
      </div>
    </div>
  );
}
