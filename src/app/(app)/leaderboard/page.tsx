"use client";

import { Trophy, Users, Medal, Crown, TrendingUp, Flame, Star, Target } from "lucide-react";

const FEATURES = [
  { icon: Trophy, title: "Classement Global", desc: "Comparez vos performances avec les traders de la communauté MarketPhase" },
  { icon: Users, title: "Leaderboard en Temps Réel", desc: "Classement mis à jour automatiquement basé sur les performances réelles" },
  { icon: Medal, title: "Badges & Rangs", desc: "Diamond, Gold, Silver, Bronze — gagnez votre rang selon votre win rate" },
  { icon: Crown, title: "Podium Top 3", desc: "Les meilleurs traders mis en avant avec un podium interactif" },
  { icon: TrendingUp, title: "Métriques Avancées", desc: "Win rate, profit factor, P&L, streak — tri et filtres multiples" },
  { icon: Flame, title: "Streaks & Records", desc: "Suivez les records de la communauté et vos meilleurs streaks" },
  { icon: Star, title: "Achievements", desc: "Débloquez des achievements basés sur vos performances de trading" },
  { icon: Target, title: "Filtres par Marché", desc: "Classements séparés par Forex, Crypto, Indices et Actions" },
];

export default function LeaderboardPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
          style={{ background: "rgba(245,158,11,0.15)", color: "rgb(245,158,11)", border: "1px solid rgba(245,158,11,0.3)" }}>
          BIENTÔT DISPONIBLE
        </div>
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Classement
        </h1>
        <p className="text-[--text-secondary] mt-2 max-w-lg mx-auto">
          Comparez-vous aux meilleurs traders de la communauté. Nécessite un système de classement multi-utilisateurs avec données réelles.
        </p>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(234,179,8,0.1)" }}>
              <f.icon className="w-5 h-5 text-yellow-400" />
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
            <div className="w-12 h-12 rounded-full border-4 border-gray-400/30 mx-auto mb-1" />
            <div className="w-8 h-2 rounded bg-gray-400/30 mx-auto" />
            <div className="text-xs mt-1 text-gray-400/50">#2</div>
          </div>
          <div className="text-center">
            <Crown className="w-5 h-5 text-yellow-400/30 mx-auto mb-1" />
            <div className="w-14 h-14 rounded-full border-4 border-yellow-400/30 mx-auto mb-1" />
            <div className="w-10 h-2 rounded bg-yellow-400/30 mx-auto" />
            <div className="text-xs mt-1 text-yellow-400/50">#1</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-orange-400/30 mx-auto mb-1" />
            <div className="w-8 h-2 rounded bg-orange-400/30 mx-auto" />
            <div className="text-xs mt-1 text-orange-400/50">#3</div>
          </div>
        </div>
        <div className="space-y-2 opacity-20">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          ))}
        </div>
        <p className="text-sm font-medium mt-6" style={{ color: "var(--text-muted)" }}>
          Système de classement communautaire en cours de développement
        </p>
      </div>
    </div>
  );
}
