"use client";

import { Trophy } from "lucide-react";

export default function LeaderboardPage() {
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
