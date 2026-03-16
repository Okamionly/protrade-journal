"use client";

import { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { detectMistakes, type Trade } from "@/lib/advancedStats";
import { AlertOctagon, TrendingDown, Lightbulb } from "lucide-react";

export default function MistakesPage() {
  const { trades, loading } = useTrades();
  const mistakes = useMemo(() => detectMistakes(trades as unknown as Trade[]), [trades]);

  const totalImpact = mistakes.reduce((s, m) => s + m.impactPnl, 0);
  const highSeverity = mistakes.filter((m) => m.severity === "high");

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl" style={{ background: "var(--bg-card-solid)" }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <AlertOctagon className="w-6 h-6 text-rose-400" /> Détection d&apos;Erreurs
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Identifiez automatiquement vos mauvaises habitudes de trading et leur impact sur vos résultats.
        </p>
      </div>

      {trades.length === 0 ? (
        <div className="metric-card rounded-2xl p-12 text-center">
          <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>Aucun trade à analyser</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Ajoutez des trades pour détecter des patterns d&apos;erreurs.</p>
        </div>
      ) : mistakes.length === 0 ? (
        <div className="metric-card rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-lg font-bold" style={{ color: "#10b981" }}>Aucune erreur détectée !</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Vous suivez vos règles de trading. Continuez comme ça.</p>
        </div>
      ) : (
        <>
          {/* Impact summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="metric-card rounded-2xl p-5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Erreurs détectées</span>
              <div className="text-3xl font-bold text-rose-400 mt-1">{mistakes.length}</div>
            </div>
            <div className="metric-card rounded-2xl p-5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Impact total estimé</span>
              <div className="text-3xl font-bold mono mt-1" style={{ color: totalImpact >= 0 ? "#f59e0b" : "#ef4444" }}>
                {totalImpact >= 0 ? "+" : ""}{totalImpact.toFixed(2)}€
              </div>
            </div>
            <div className="metric-card rounded-2xl p-5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Erreurs critiques</span>
              <div className="text-3xl font-bold mt-1" style={{ color: highSeverity.length > 0 ? "#ef4444" : "#10b981" }}>
                {highSeverity.length}
              </div>
            </div>
          </div>

          {/* Mistakes list */}
          <div className="space-y-4">
            {mistakes.map((m, i) => (
              <div key={i} className="metric-card rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{m.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>{m.type}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        m.severity === "high" ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        : m.severity === "medium" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      }`}>
                        {m.severity === "high" ? "Critique" : m.severity === "medium" ? "Modéré" : "Mineur"}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{m.description}</p>
                    <div className="flex items-center gap-6 mt-3">
                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-bold mono" style={{ color: m.impactPnl >= 0 ? "#f59e0b" : "#ef4444" }}>
                          {m.impactPnl >= 0 ? "+" : ""}{m.impactPnl.toFixed(2)}€
                        </span>
                      </div>
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {m.count} occurrence{m.count > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tip */}
                <div className="mt-4 rounded-xl p-3 flex items-start gap-2" style={{ background: "var(--bg-hover)" }}>
                  <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {m.type === "Revenge Trading" && "Attendez au moins 15 minutes après une perte avant de reprendre un trade. Faites une pause, revenez au plan."}
                    {m.type === "Overtrading" && "Fixez-vous un nombre maximum de trades par jour (3-5) et respectez cette limite quoi qu'il arrive."}
                    {m.type === "Stop non respecté" && "Utilisez toujours un stop loss dur. Ne déplacez jamais votre stop dans le sens de la perte."}
                    {m.type === "Trading en tilt" && "Après 3 pertes consécutives, arrêtez de trader pour la journée. Le marché sera encore là demain."}
                    {m.type === "Sortie prématurée" && "Laissez courir vos gagnants. Utilisez un trailing stop pour sécuriser les profits sans couper trop tôt."}
                    {m.type === "Trading weekend" && "Le marché forex est fermé le weekend. Les gaps d'ouverture lundi comportent des risques supplémentaires."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
