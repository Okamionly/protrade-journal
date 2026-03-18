"use client";

import { useState } from "react";
import {
  Crown,
  Lock,
  Zap,
  TrendingUp,
  BarChart3,
  Activity,
  Brain,
  Shield,
  Star,
  Check,
  Bell,
  X,
} from "lucide-react";

const features = [
  "Indicateurs exclusifs (RSI avancé, Volume Profile, Order Flow)",
  "Alertes prix en temps réel illimitées",
  "Signaux AI premium (prédictions)",
  "Support prioritaire",
  "Accès anticipé aux nouvelles fonctionnalités",
];

const testimonials = [
  {
    name: "Thomas L.",
    role: "Day Trader Forex",
    text: "Depuis que j'utilise les indicateurs VIP, mon winrate est passé de 52% à 67%. Le Volume Profile est un game changer.",
    rating: 5,
  },
  {
    name: "Sophie M.",
    role: "Swing Trader Actions",
    text: "Les alertes premium m'ont permis de ne plus rater d'opportunités. Le Smart Money Detector est incroyable.",
    rating: 5,
  },
  {
    name: "Karim B.",
    role: "Scalper Indices",
    text: "L'Order Flow m'a donné un avantage que je n'avais jamais eu. L'investissement est rentabilisé en quelques jours.",
    rating: 5,
  },
];

// --- SVG Indicator Components ---

function RSIChart() {
  return (
    <svg viewBox="0 0 300 150" className="w-full h-32">
      {/* Overbought zone */}
      <rect x="0" y="0" width="300" height="30" fill="rgba(239,68,68,0.1)" />
      <line x1="0" y1="30" x2="300" y2="30" stroke="rgba(239,68,68,0.3)" strokeDasharray="4" />
      <text x="4" y="22" fill="rgba(239,68,68,0.5)" fontSize="10" fontFamily="monospace">70</text>
      {/* Oversold zone */}
      <rect x="0" y="120" width="300" height="30" fill="rgba(34,197,94,0.1)" />
      <line x1="0" y1="120" x2="300" y2="120" stroke="rgba(34,197,94,0.3)" strokeDasharray="4" />
      <text x="4" y="138" fill="rgba(34,197,94,0.5)" fontSize="10" fontFamily="monospace">30</text>
      {/* RSI Line */}
      <polyline
        points="0,80 30,72 60,55 90,25 120,18 150,40 180,75 210,110 240,125 270,105 300,85"
        fill="none"
        stroke="rgb(168,85,247)"
        strokeWidth="2.5"
      />
      {/* Divergence arrow */}
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
    <svg viewBox="0 0 300 160" className="w-full h-32">
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
    <svg viewBox="0 0 300 140" className="w-full h-32">
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

function SmartMoneyAlerts() {
  const alerts = [
    { pair: "EURUSD", type: "Accumulation", time: "14:32", bullish: true },
    { pair: "BTCUSD", type: "Distribution", time: "13:15", bullish: false },
    { pair: "GBPJPY", type: "Accumulation", time: "11:48", bullish: true },
    { pair: "SPX500", type: "Manipulation", time: "10:22", bullish: false },
  ];
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: a.bullish ? "rgb(34,197,94)" : "rgb(239,68,68)" }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--text-primary, #e5e7eb)" }}>
              {a.pair}
            </span>
          </div>
          <span className="text-[10px] mono" style={{ color: "var(--text-secondary, #9ca3af)" }}>
            {a.type} - {a.time}
          </span>
        </div>
      ))}
    </div>
  );
}

function AIPredictions() {
  const predictions = [
    { pair: "EURUSD", direction: "HAUSSIER", confidence: 78, target: "1.1085" },
    { pair: "BTCUSD", direction: "BAISSIER", confidence: 64, target: "62,400" },
    { pair: "GOLD", direction: "HAUSSIER", confidence: 82, target: "2,365" },
  ];
  return (
    <div className="space-y-2">
      {predictions.map((p, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div>
            <span className="text-xs font-medium" style={{ color: "var(--text-primary, #e5e7eb)" }}>
              {p.pair}
            </span>
            <span
              className="ml-2 text-[10px] font-bold"
              style={{ color: p.direction === "HAUSSIER" ? "rgb(34,197,94)" : "rgb(239,68,68)" }}
            >
              {p.direction}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] mono" style={{ color: "rgb(168,85,247)" }}>
              {p.confidence}%
            </span>
            <span className="ml-2 text-[10px] mono" style={{ color: "var(--text-secondary, #9ca3af)" }}>
              TP {p.target}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsPremiumUI() {
  const sampleAlerts = [
    { pair: "EURUSD", condition: "> 1.1050", active: true },
    { pair: "BTCUSD", condition: "< 60,000", active: true },
    { pair: "GOLD", condition: "> 2,400", active: false },
  ];
  return (
    <div className="space-y-2">
      {sampleAlerts.map((a, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-3 h-3" style={{ color: a.active ? "rgb(34,197,94)" : "rgba(156,163,175,0.5)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-primary, #e5e7eb)" }}>
              {a.pair}
            </span>
          </div>
          <span className="text-[10px] mono" style={{ color: "var(--text-secondary, #9ca3af)" }}>
            {a.condition}
          </span>
        </div>
      ))}
      <div
        className="flex items-center justify-center py-1.5 rounded-lg text-[10px] cursor-pointer"
        style={{ border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(156,163,175,0.5)" }}
      >
        + Ajouter une alerte
      </div>
    </div>
  );
}

// --- Indicator Card ---

interface IndicatorCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isVip: boolean;
}

function IndicatorCard({ title, description, icon, children, isVip }: IndicatorCardProps) {
  return (
    <div
      className="glass relative rounded-2xl overflow-hidden"
      style={{
        border: "1px solid var(--border, rgba(255,255,255,0.08))",
        background: "var(--bg-secondary, rgba(255,255,255,0.03))",
      }}
    >
      <div className="p-4 pb-2 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(168,85,247,0.15)" }}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
            {title}
          </h3>
          <p className="text-[11px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
            {description}
          </p>
        </div>
      </div>
      <div className="px-4 pb-4 pt-2">{children}</div>

      {/* Locked overlay */}
      {!isVip && (
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
            Réservé aux membres VIP
          </span>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function VipPage() {
  const isVip = false;
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen pb-20">
      {/* Payment Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="glass relative max-w-md w-full rounded-2xl p-8 text-center"
            style={{
              border: "1px solid var(--border, rgba(255,255,255,0.08))",
              background: "var(--bg-primary, #0f0f0f)",
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" style={{ color: "var(--text-secondary, #9ca3af)" }} />
            </button>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))" }}
            >
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary, #e5e7eb)" }}>
              Paiement bientôt disponible
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary, #9ca3af)" }}>
              L&apos;intégration Stripe est en cours de développement. Vous serez notifié dès que
              l&apos;abonnement VIP sera disponible.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))" }}
            >
              Compris
            </button>
          </div>
        </div>
      )}

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
              MarketPhase VIP
            </h1>
            <p className="text-sm sm:text-base" style={{ color: "var(--text-secondary, #9ca3af)" }}>
              Accédez à des indicateurs exclusifs et des outils premium
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
                  Expire le 18/04/2026
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 hover:scale-105 flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
                boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
              }}
            >
              <Zap className="w-4 h-4" />
              S&apos;abonner - 19.99&euro;/mois
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
                  19.99&euro;
                </span>
                <span className="text-sm" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  /mois
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                Sans engagement - Annulez à tout moment
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
                onClick={() => setShowModal(true)}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
                  boxShadow: "0 4px 20px rgba(245,158,11,0.2)",
                }}
              >
                <Crown className="w-4 h-4" />
                S&apos;abonner maintenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIP Indicators Section */}
      <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
            Indicateurs Premium
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <IndicatorCard
            title="RSI Avancé"
            description="RSI multi-timeframe avec détection de divergences"
            icon={<TrendingUp className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />}
            isVip={isVip}
          >
            <RSIChart />
          </IndicatorCard>

          <IndicatorCard
            title="Volume Profile"
            description="Distribution du volume par niveau de prix"
            icon={<BarChart3 className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />}
            isVip={isVip}
          >
            <VolumeProfileChart />
          </IndicatorCard>

          <IndicatorCard
            title="Order Flow"
            description="Analyse de la pression achat/vente"
            icon={<Activity className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />}
            isVip={isVip}
          >
            <OrderFlowChart />
          </IndicatorCard>

          <IndicatorCard
            title="Smart Money Detector"
            description="Détection d'activité institutionnelle"
            icon={<Shield className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />}
            isVip={isVip}
          >
            <SmartMoneyAlerts />
          </IndicatorCard>

          <IndicatorCard
            title="AI Prédictions"
            description="Prédictions de prix du lendemain"
            icon={<Brain className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />}
            isVip={isVip}
          >
            <AIPredictions />
          </IndicatorCard>

          <IndicatorCard
            title="Alertes Premium"
            description="Alertes de prix en temps réel illimitées"
            icon={<Bell className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />}
            isVip={isVip}
          >
            <AlertsPremiumUI />
          </IndicatorCard>
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
    </div>
  );
}
