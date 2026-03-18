"use client";

import { useState } from "react";
import {
  Crown,
  Lock,
  Zap,
  TrendingUp,
  BarChart3,
  Activity,
  Shield,
  Star,
  Check,
  FileText,
  Calendar,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";

const features = [
  "1 a 2 indicateurs exclusifs par mois (RSI avance, Volume Profile, Order Flow...)",
  "Analyses Macro completes (economie, taux, inflation)",
  "Analyses Options & Futures detaillees",
  "Signaux de trading bases sur l'analyse institutionnelle",
  "Acces au groupe VIP prive",
  "Support prioritaire & Q&A en direct",
];

const testimonials = [
  {
    name: "Thomas L.",
    role: "Day Trader Forex",
    text: "Depuis que j'utilise les indicateurs VIP, mon winrate est pass\u00e9 de 52% \u00e0 67%. Le Volume Profile est un game changer.",
    rating: 5,
  },
  {
    name: "Sophie M.",
    role: "Swing Trader Actions",
    text: "Les analyses macro m'ont permis de mieux comprendre les mouvements de march\u00e9. Le Smart Money Detector est incroyable.",
    rating: 5,
  },
  {
    name: "Karim B.",
    role: "Scalper Indices",
    text: "L'Order Flow m'a donn\u00e9 un avantage que je n'avais jamais eu. L'investissement est rentabilis\u00e9 en quelques jours.",
    rating: 5,
  },
];

const pastPublications = [
  {
    month: "F\u00e9vrier 2026",
    items: "Indicateur Volume Profile + Analyse Macro",
  },
  {
    month: "Janvier 2026",
    items: "Indicateur RSI Divergence + Analyse Options",
  },
  {
    month: "D\u00e9cembre 2025",
    items: "Indicateur Order Flow + Analyse Macro",
  },
];

// --- SVG Indicator Components ---

function SmartMoneyDetectorChart() {
  return (
    <svg viewBox="0 0 300 150" className="w-full h-36">
      {/* Background grid */}
      {[0, 30, 60, 90, 120].map((y) => (
        <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.04)" />
      ))}
      {/* Price line */}
      <polyline
        points="0,100 20,95 40,90 60,85 80,70 100,75 120,60 140,55 160,65 180,50 200,45 220,55 240,40 260,35 280,30 300,25"
        fill="none"
        stroke="rgba(59,130,246,0.6)"
        strokeWidth="2"
      />
      {/* Smart money zones */}
      <rect x="70" y="60" width="50" height="20" rx="3" fill="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.4)" strokeWidth="1" />
      <text x="78" y="74" fill="rgba(34,197,94,0.8)" fontSize="8" fontFamily="monospace">ACCUM</text>
      <rect x="190" y="35" width="60" height="20" rx="3" fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.4)" strokeWidth="1" />
      <text x="200" y="49" fill="rgba(239,68,68,0.8)" fontSize="8" fontFamily="monospace">DISTRIB</text>
      {/* Volume bars */}
      {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280].map((x, i) => {
        const h = [12, 8, 15, 25, 10, 20, 8, 14, 22, 18, 10, 16, 12, 9][i];
        const isHighVol = h > 18;
        return (
          <rect
            key={x}
            x={x - 5}
            y={140 - h}
            width="10"
            height={h}
            rx="1"
            fill={isHighVol ? "rgba(168,85,247,0.5)" : "rgba(168,85,247,0.2)"}
          />
        );
      })}
      <text x="4" y="148" fill="rgba(156,163,175,0.4)" fontSize="7" fontFamily="monospace">Smart Money Detector v2</text>
    </svg>
  );
}

function RSIChart() {
  return (
    <svg viewBox="0 0 300 150" className="w-full h-28">
      <rect x="0" y="0" width="300" height="30" fill="rgba(239,68,68,0.1)" />
      <line x1="0" y1="30" x2="300" y2="30" stroke="rgba(239,68,68,0.3)" strokeDasharray="4" />
      <text x="4" y="22" fill="rgba(239,68,68,0.5)" fontSize="10" fontFamily="monospace">70</text>
      <rect x="0" y="120" width="300" height="30" fill="rgba(34,197,94,0.1)" />
      <line x1="0" y1="120" x2="300" y2="120" stroke="rgba(34,197,94,0.3)" strokeDasharray="4" />
      <text x="4" y="138" fill="rgba(34,197,94,0.5)" fontSize="10" fontFamily="monospace">30</text>
      <polyline
        points="0,80 30,72 60,55 90,25 120,18 150,40 180,75 210,110 240,125 270,105 300,85"
        fill="none"
        stroke="rgb(168,85,247)"
        strokeWidth="2.5"
      />
      <line x1="230" y1="125" x2="270" y2="105" stroke="rgb(250,204,21)" strokeWidth="2" />
      <polygon points="270,105 262,108 265,115" fill="rgb(250,204,21)" />
      <text x="240" y="98" fill="rgb(250,204,21)" fontSize="9" fontFamily="monospace">DIV</text>
    </svg>
  );
}

function VolumeProfileChart() {
  const bars = [
    { price: "1.1050", vol: 85 },
    { price: "1.1040", vol: 65 },
    { price: "1.1030", vol: 95 },
    { price: "1.1020", vol: 40 },
    { price: "1.1010", vol: 55 },
    { price: "1.1000", vol: 100 },
    { price: "1.0990", vol: 70 },
    { price: "1.0980", vol: 30 },
  ];
  return (
    <svg viewBox="0 0 300 160" className="w-full h-28">
      {bars.map((b, i) => (
        <g key={i}>
          <text x="2" y={i * 19 + 16} fill="rgba(156,163,175,0.7)" fontSize="9" fontFamily="monospace">
            {b.price}
          </text>
          <rect
            x="60"
            y={i * 19 + 4}
            width={(b.vol / 100) * 220}
            height="14"
            rx="2"
            fill={b.vol === 100 ? "rgba(59,130,246,0.6)" : "rgba(59,130,246,0.25)"}
          />
          {b.vol === 100 && (
            <text x={60 + (b.vol / 100) * 220 + 4} y={i * 19 + 16} fill="rgba(59,130,246,0.8)" fontSize="8" fontFamily="monospace">
              POC
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function OrderFlowChart() {
  const data = [
    { time: "09:30", buy: 75, sell: 45 },
    { time: "10:00", buy: 50, sell: 80 },
    { time: "10:30", buy: 90, sell: 30 },
    { time: "11:00", buy: 60, sell: 65 },
    { time: "11:30", buy: 85, sell: 40 },
  ];
  return (
    <svg viewBox="0 0 300 140" className="w-full h-28">
      {data.map((d, i) => {
        const x = i * 60 + 15;
        return (
          <g key={i}>
            <rect x={x} y={130 - d.buy} width="20" height={d.buy} rx="2" fill="rgba(34,197,94,0.5)" />
            <rect x={x + 22} y={130 - d.sell} width="20" height={d.sell} rx="2" fill="rgba(239,68,68,0.5)" />
            <text x={x + 10} y={138} fill="rgba(156,163,175,0.6)" fontSize="8" fontFamily="monospace" textAnchor="middle">
              {d.time}
            </text>
          </g>
        );
      })}
      <text x="4" y="10" fill="rgba(34,197,94,0.6)" fontSize="8">BUY</text>
      <text x="40" y="10" fill="rgba(239,68,68,0.6)" fontSize="8">SELL</text>
    </svg>
  );
}

// --- Locked Overlay ---

function LockedOverlay() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10"
      style={{
        backdropFilter: "blur(6px)",
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        <Lock className="w-6 h-6" style={{ color: "rgba(255,255,255,0.6)" }} />
      </div>
      <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
        R&eacute;serv&eacute; aux membres VIP
      </span>
    </div>
  );
}

// --- Main Page ---

export default function VipPage() {
  const isVip = false;
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-2xl mx-4 mt-4 sm:mx-6 sm:mt-6 p-8 sm:p-12"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(168,85,247,0.15), rgba(59,130,246,0.1))",
          border: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        {/* Decorative elements */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)",
            transform: "translate(-20%, 40%)",
          }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
              boxShadow: "0 8px 32px rgba(245,158,11,0.3)",
            }}
          >
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text-primary, #e5e7eb)" }}>
              MarketPhase VIP &mdash; Analyses Premium
            </h1>
            <p className="text-sm sm:text-base" style={{ color: "var(--text-secondary, #9ca3af)" }}>
              Recevez chaque mois des indicateurs exclusifs et des analyses macro compl&egrave;tes
            </p>
          </div>

          {isVip ? (
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-xl"
              style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              <Crown className="w-5 h-5" style={{ color: "rgb(245,158,11)" }} />
              <div>
                <div className="text-sm font-bold" style={{ color: "rgb(245,158,11)" }}>
                  Membre VIP
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  Acc&egrave;s actif
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 hover:scale-105 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
                boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirection vers le paiement...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  S&apos;abonner - 9.99&euro;/mois
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Pricing Card (shown when not subscribed) */}
      {!isVip && (
        <div className="mx-4 mt-6 sm:mx-6 sm:mt-8 flex justify-center">
          <div
            className="glass max-w-lg w-full rounded-2xl overflow-hidden"
            style={{
              border: "1px solid rgba(245,158,11,0.2)",
              background: "var(--bg-secondary, rgba(255,255,255,0.03))",
            }}
          >
            {/* Pricing header */}
            <div
              className="p-6 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(168,85,247,0.05))",
                borderBottom: "1px solid rgba(245,158,11,0.1)",
              }}
            >
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-4xl font-bold mono" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                  9.99&euro;
                </span>
                <span className="text-sm" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  /mois
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                Sans engagement &mdash; Annulez &agrave; tout moment
              </p>
            </div>
            {/* Features */}
            <div className="p-6 space-y-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(34,197,94,0.15)" }}
                  >
                    <Check className="w-3 h-3" style={{ color: "rgb(34,197,94)" }} />
                  </div>
                  <span className="text-sm" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                    {f}
                  </span>
                </div>
              ))}
            </div>
            {/* CTA */}
            <div className="px-6 pb-6">
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
                  boxShadow: "0 4px 20px rgba(245,158,11,0.2)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirection vers le paiement...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    S&apos;abonner maintenant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section A: Indicateur du Mois */}
      <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
            Indicateur du Mois
          </h2>
        </div>

        <div
          className="glass relative rounded-2xl overflow-hidden"
          style={{
            border: "1px solid var(--border, rgba(255,255,255,0.08))",
            background: "var(--bg-secondary, rgba(255,255,255,0.03))",
          }}
        >
          <div className="p-5 pb-3">
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(168,85,247,0.15)" }}
              >
                <Shield className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                  Indicateur de Mars 2026: Smart Money Detector v2
                </h3>
                <p className="text-[11px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  D&eacute;tecte les zones d&apos;accumulation et de distribution institutionnelle en temps r&eacute;el.
                  Combine l&apos;analyse du volume, du delta et des niveaux de prix cl&eacute;s pour identifier
                  o&ugrave; les Smart Money positionnent leurs ordres.
                </p>
              </div>
            </div>
          </div>
          <div className="px-5 pb-2">
            <SmartMoneyDetectorChart />
          </div>
          <div className="px-5 pb-4">
            <span className="text-[10px] mono" style={{ color: "var(--text-secondary, #9ca3af)" }}>
              Publi&eacute; le 01/03/2026
            </span>
          </div>
          {!isVip && <LockedOverlay />}
        </div>
      </div>

      {/* Section B: Analyse Macro Mensuelle */}
      <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-5 h-5" style={{ color: "rgb(59,130,246)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
            Analyse Macro Mensuelle
          </h2>
        </div>

        <div
          className="glass relative rounded-2xl overflow-hidden"
          style={{
            border: "1px solid var(--border, rgba(255,255,255,0.08))",
            background: "var(--bg-secondary, rgba(255,255,255,0.03))",
          }}
        >
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.15)" }}
              >
                <BarChart3 className="w-5 h-5" style={{ color: "rgb(59,130,246)" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                  Rapport Macro &mdash; Mars 2026
                </h3>
                <p className="text-[11px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  Analyse compl&egrave;te de l&apos;environnement macro&eacute;conomique
                </p>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Fed Policy", desc: "Anticipations de taux & forward guidance" },
                { label: "Inflation Outlook", desc: "CPI, PCE et tendances inflationnistes" },
                { label: "Bond Yields", desc: "Courbe des taux et spreads de cr\u00e9dit" },
                { label: "Dollar Index", desc: "DXY, flux de capitaux et corr\u00e9lations" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: "rgb(59,130,246)" }}
                  />
                  <div>
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                      {item.label}
                    </span>
                    <span className="text-[10px] ml-2" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                      {item.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {!isVip && <LockedOverlay />}
        </div>
      </div>

      {/* Section C: Analyse Options & Futures */}
      <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5" style={{ color: "rgb(234,88,12)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
            Analyse Options &amp; Futures
          </h2>
        </div>

        <div
          className="glass relative rounded-2xl overflow-hidden"
          style={{
            border: "1px solid var(--border, rgba(255,255,255,0.08))",
            background: "var(--bg-secondary, rgba(255,255,255,0.03))",
          }}
        >
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(234,88,12,0.15)" }}
              >
                <Activity className="w-5 h-5" style={{ color: "rgb(234,88,12)" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                  Options Flow Report &mdash; Semaine 12
                </h3>
                <p className="text-[11px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  Analyse des flux options et positionnement futures
                </p>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Put/Call Ratio", desc: "Ratio et sentiment des march\u00e9s d\u00e9riv\u00e9s" },
                { label: "Unusual Activity", desc: "Volumes anormaux et gros ordres d\u00e9tect\u00e9s" },
                { label: "Institutional Positioning", desc: "COT report et positionnement net" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: "rgb(234,88,12)" }}
                  />
                  <div>
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                      {item.label}
                    </span>
                    <span className="text-[10px] ml-2" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                      {item.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {!isVip && <LockedOverlay />}
        </div>
      </div>

      {/* Section D: Historique des Publications */}
      <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5" style={{ color: "rgb(245,158,11)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
            Historique des Publications
          </h2>
        </div>

        <div className="space-y-3">
          {pastPublications.map((pub, i) => (
            <div
              key={i}
              className="glass relative rounded-2xl overflow-hidden"
              style={{
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
              }}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(245,158,11,0.15)" }}
                  >
                    <FileText className="w-5 h-5" style={{ color: "rgb(245,158,11)" }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                      {pub.month}
                    </h3>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                      {pub.items}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-secondary, #9ca3af)" }} />
              </div>
              {!isVip && <LockedOverlay />}
            </div>
          ))}
        </div>
      </div>

      {/* Section E: Archive - Indicator Previews */}
      <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
            Archive &mdash; Aper&ccedil;u des Indicateurs
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* RSI */}
          <div
            className="glass relative rounded-2xl overflow-hidden"
            style={{
              border: "1px solid var(--border, rgba(255,255,255,0.08))",
              background: "var(--bg-secondary, rgba(255,255,255,0.03))",
            }}
          >
            <div className="p-4 pb-2 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(168,85,247,0.15)" }}
              >
                <TrendingUp className="w-4 h-4" style={{ color: "rgb(168,85,247)" }} />
              </div>
              <div>
                <h3 className="text-xs font-semibold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                  RSI Avanc&eacute;
                </h3>
                <p className="text-[10px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  Multi-timeframe + divergences
                </p>
              </div>
            </div>
            <div className="px-4 pb-3">
              <RSIChart />
            </div>
            {!isVip && <LockedOverlay />}
          </div>

          {/* Volume Profile */}
          <div
            className="glass relative rounded-2xl overflow-hidden"
            style={{
              border: "1px solid var(--border, rgba(255,255,255,0.08))",
              background: "var(--bg-secondary, rgba(255,255,255,0.03))",
            }}
          >
            <div className="p-4 pb-2 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(168,85,247,0.15)" }}
              >
                <BarChart3 className="w-4 h-4" style={{ color: "rgb(168,85,247)" }} />
              </div>
              <div>
                <h3 className="text-xs font-semibold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                  Volume Profile
                </h3>
                <p className="text-[10px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  Distribution par niveau de prix
                </p>
              </div>
            </div>
            <div className="px-4 pb-3">
              <VolumeProfileChart />
            </div>
            {!isVip && <LockedOverlay />}
          </div>

          {/* Order Flow */}
          <div
            className="glass relative rounded-2xl overflow-hidden"
            style={{
              border: "1px solid var(--border, rgba(255,255,255,0.08))",
              background: "var(--bg-secondary, rgba(255,255,255,0.03))",
            }}
          >
            <div className="p-4 pb-2 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(168,85,247,0.15)" }}
              >
                <Activity className="w-4 h-4" style={{ color: "rgb(168,85,247)" }} />
              </div>
              <div>
                <h3 className="text-xs font-semibold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                  Order Flow
                </h3>
                <p className="text-[10px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  Pression achat/vente
                </p>
              </div>
            </div>
            <div className="px-4 pb-3">
              <OrderFlowChart />
            </div>
            {!isVip && <LockedOverlay />}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="mx-4 mt-10 sm:mx-6 sm:mt-12">
        <div className="flex items-center gap-3 mb-6">
          <Star className="w-5 h-5" style={{ color: "rgb(245,158,11)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
            Ce que disent nos membres VIP
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-5"
              style={{
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
              }}
            >
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-current" style={{ color: "rgb(245,158,11)" }} />
                ))}
              </div>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                  {t.name}
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  {t.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stripe payment note */}
      <div className="mx-4 mt-10 sm:mx-6 text-center">
        <p className="text-xs" style={{ color: "var(--text-secondary, #9ca3af)" }}>
          Paiement s&eacute;curis&eacute; par Stripe. Annulation possible &agrave; tout moment.
        </p>
      </div>
    </div>
  );
}
