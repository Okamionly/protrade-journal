"use client";

import { Activity, Zap, TrendingUp, BarChart3, Shield, Eye } from "lucide-react";

const FEATURES = [
  { icon: Activity, title: "Flux Institutionnel", desc: "Suivez les transactions inhabituelles des gros acteurs du marché" },
  { icon: TrendingUp, title: "Sweeps & Blocks", desc: "Détection automatique des sweeps et block trades significatifs" },
  { icon: BarChart3, title: "Ratio Put/Call", desc: "Analyse du sentiment via le ratio options put vs call en temps réel" },
  { icon: Shield, title: "Dark Pool Activity", desc: "Visibilité sur les transactions hors marché des institutionnels" },
  { icon: Eye, title: "Smart Money Tracker", desc: "Suivi des positions des hedge funds et market makers" },
  { icon: Zap, title: "Alertes Unusual Activity", desc: "Notifications instantanées sur les flux anormaux" },
];

export default function FlowPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
          style={{ background: "rgba(245,158,11,0.15)", color: "rgb(245,158,11)", border: "1px solid rgba(245,158,11,0.3)" }}>
          BIENTÔT DISPONIBLE
        </div>
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Activity className="w-8 h-8 text-violet-400" />
          Options Flow
        </h1>
        <p className="text-[--text-secondary] mt-2 max-w-lg mx-auto">
          Suivez l'argent intelligent — flux d'options institutionnels en temps réel. Nécessite une intégration avec un fournisseur de données options (Unusual Whales, FlowAlgo).
        </p>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(139,92,246,0.1)" }}>
              <f.icon className="w-5 h-5 text-violet-400" />
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
        <div className="flex items-center justify-center gap-6 mb-6 opacity-30">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 mx-auto mb-1" />
            <div className="w-12 h-2 rounded bg-emerald-500/30 mx-auto" />
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-4 border-rose-500/30 mx-auto mb-1" />
            <div className="w-12 h-2 rounded bg-rose-500/30 mx-auto" />
          </div>
        </div>
        <div className="space-y-2 opacity-20">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          ))}
        </div>
        <p className="text-sm font-medium mt-6" style={{ color: "var(--text-muted)" }}>
          Intégration API options en cours — disponible prochainement
        </p>
      </div>
    </div>
  );
}
