"use client";

import { useState, useEffect } from "react";
import { Trophy, Lock, Crown, Check } from "lucide-react";

export default function LeaderboardPage() {
  const [isVip, setIsVip] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/user/role")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setIsVip(d.role === "VIP" || d.role === "PRO" || d.role === "ADMIN"))
      .catch(() => setIsVip(false));
  }, []);

  // VIP loading state
  if (isVip === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // VIP gate
  if (!isVip) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        {/* Blurred background preview */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-30 blur-sm pointer-events-none">
          <div className="space-y-6 max-w-4xl mx-auto pb-12">
            <div className="text-center pt-6">
              <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                Classement
              </h1>
            </div>
            <div className="glass rounded-2xl p-8" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <div className="w-8 h-8 rounded-full" style={{ background: "var(--border)" }} />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 rounded" style={{ background: "var(--border)", width: `${30 + i * 8}%` }} />
                      <div className="h-2 rounded" style={{ background: "var(--border)", width: `${20 + i * 5}%` }} />
                    </div>
                    <div className="h-4 w-12 rounded" style={{ background: "var(--border)" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* VIP overlay */}
        <div className="relative z-10 glass rounded-2xl p-8 md:p-12 max-w-lg mx-4 text-center" style={{ border: "1px solid rgba(6,182,212,0.2)", background: "rgba(var(--bg-card-rgb, 15,15,20), 0.85)", backdropFilter: "blur(20px)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Fonctionnalité VIP</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Classement des meilleurs traders de la communauté MarketPhase
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Classement en temps réel des traders",
              "Comparez vos performances avec la communauté",
              "Badges et récompensés pour les meilleurs",
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(6,182,212,0.15)" }}>
                  <Check className="w-3 h-3 text-cyan-400" />
                </div>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{b}</span>
              </div>
            ))}
          </div>
          <a href="/vip" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
            <Crown className="w-4 h-4" />
            Devenir VIP
          </a>
          <div className="mt-4">
            <a href="/vip" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>Voir les offres</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center pt-6">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Classement
        </h1>
        <p className="text-[--text-secondary] mt-2 max-w-lg mx-auto text-sm">
          Comparez-vous aux meilleurs traders de la communauté.
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.2)" }}
        >
          <Trophy className="w-10 h-10 text-yellow-400" />
        </div>
        <h2
          className="text-2xl font-bold mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          Disponible prochainement
        </h2>
        <p
          className="text-sm max-w-md"
          style={{ color: "var(--text-secondary)" }}
        >
          Le classement communautaire sera disponible prochainement.
        </p>
      </div>
    </div>
  );
}
