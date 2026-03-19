"use client";

import { Search, Zap, TrendingUp, BarChart3, Bell, Radio } from "lucide-react";

const FEATURES = [
  { icon: Search, title: "Scan Multi-Marchés", desc: "Forex, Crypto, Indices, Actions — tous les marchés en un seul endroit" },
  { icon: TrendingUp, title: "Signaux Techniques", desc: "RSI, MACD, Bollinger Bands, breakouts, divergences automatiques" },
  { icon: BarChart3, title: "Volume Profile", desc: "Détection de pics de volume et activité institutionnelle" },
  { icon: Bell, title: "Alertes Personnalisées", desc: "Notifications en temps réel sur vos critères de scan" },
  { icon: Radio, title: "Données Temps Réel", desc: "Prix live et signaux mis à jour en continu" },
  { icon: Zap, title: "Filtres Avancés", desc: "Par asset, timeframe, type de signal et force du signal" },
];

export default function ScannerPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
          style={{ background: "rgba(245,158,11,0.15)", color: "rgb(245,158,11)", border: "1px solid rgba(245,158,11,0.3)" }}>
          BIENTÔT DISPONIBLE
        </div>
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Search className="w-8 h-8 text-cyan-400" />
          Scanner de Marché
        </h1>
        <p className="text-[--text-secondary] mt-2 max-w-lg mx-auto">
          Un scanner professionnel en temps réel pour détecter les meilleures opportunités sur tous les marchés. Actuellement en développement.
        </p>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(6,182,212,0.1)" }}>
              <f.icon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Preview mockup */}
      <div className="glass rounded-2xl p-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4 opacity-30">
          <div className="w-20 h-3 rounded-full bg-emerald-500/50" />
          <div className="w-14 h-3 rounded-full bg-amber-500/50" />
          <div className="w-24 h-3 rounded-full bg-rose-500/50" />
          <div className="w-16 h-3 rounded-full bg-cyan-500/50" />
        </div>
        <div className="space-y-2 opacity-20">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          ))}
        </div>
        <p className="text-sm font-medium mt-6" style={{ color: "var(--text-muted)" }}>
          Intégration avec données temps réel en cours de développement
        </p>
      </div>
    </div>
  );
}
