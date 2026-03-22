"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  BarChart3,
  Users,
  Upload,
  PenLine,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";
import { useTrades } from "@/hooks/useTrades";

const STORAGE_KEY = "onboarding-complete";

export function OnboardingWizard() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [balance, setBalance] = useState("10000");
  const { trades } = useTrades();
  const router = useRouter();

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done && trades.length === 0) {
      setVisible(true);
    }
  }, [trades]);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  const goToImport = () => {
    close();
    router.push("/import");
  };

  const goToJournal = () => {
    close();
    router.push("/journal");
  };

  if (!visible) return null;

  const totalSteps = 3;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg glass rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--border, rgba(255,255,255,0.1))" }}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition z-10"
          style={{ color: "var(--text-muted, #9ca3af)" }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Gradient accent bar */}
        <div
          className="h-1 w-full"
          style={{
            background: "linear-gradient(90deg, #0ea5e9, #3b82f6, #8b5cf6)",
          }}
        />

        <div className="p-8">
          {/* Step 1: Welcome */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(14,165,233,0.2), rgba(59,130,246,0.2))",
                    border: "1px solid rgba(14,165,233,0.3)",
                  }}
                >
                  <Sparkles className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-[--text-primary]">
                  Bienvenue sur MarketPhase !
                </h2>
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--text-muted, #9ca3af)" }}
                >
                  Configurons votre espace de trading en quelques secondes.
                </p>
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: "var(--text-muted, #9ca3af)" }}
                >
                  Capital de départ ($)
                </label>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="input-field w-full text-center text-lg font-semibold"
                  min={0}
                  step={100}
                />
                <p
                  className="text-xs mt-2 text-center"
                  style={{ color: "var(--text-muted, #6b7280)" }}
                >
                  Vous pourrez modifier ce montant plus tard dans les paramètres.
                </p>
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                  boxShadow: "0 4px 20px rgba(14, 165, 233, 0.3)",
                }}
              >
                Suivant
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Add first trade */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[--text-primary]">
                  Ajoutez votre premier trade
                </h2>
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--text-muted, #9ca3af)" }}
                >
                  Commencez à suivre vos performances dès maintenant.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Import card */}
                <button
                  onClick={goToImport}
                  className="group flex flex-col items-center gap-3 p-5 rounded-xl transition-all hover:scale-[1.03] active:scale-[0.98] text-left"
                  style={{
                    background: "rgba(14,165,233,0.08)",
                    border: "1px solid rgba(14,165,233,0.2)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      background: "linear-gradient(135deg, rgba(14,165,233,0.25), rgba(59,130,246,0.25))",
                    }}
                  >
                    <Upload className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[--text-primary]">
                      Importer des trades
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-muted, #6b7280)" }}
                    >
                      Depuis un fichier CSV
                    </p>
                  </div>
                </button>

                {/* Manual card */}
                <button
                  onClick={goToJournal}
                  className="group flex flex-col items-center gap-3 p-5 rounded-xl transition-all hover:scale-[1.03] active:scale-[0.98] text-left"
                  style={{
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.2)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(168,85,247,0.25))",
                    }}
                  >
                    <PenLine className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[--text-primary]">
                      Ajouter manuellement
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-muted, #6b7280)" }}
                    >
                      Saisir un trade
                    </p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition hover:bg-white/5"
                style={{ color: "var(--text-muted, #9ca3af)" }}
              >
                Passer cette étape
              </button>
            </div>
          )}

          {/* Step 3: Discover tools */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[--text-primary]">
                  Découvrez vos outils
                </h2>
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--text-muted, #9ca3af)" }}
                >
                  Tout ce dont vous avez besoin pour progresser.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    icon: BookOpen,
                    color: "#0ea5e9",
                    title: "Journal de trading",
                    desc: "Enregistrez et analysez chaque trade",
                  },
                  {
                    icon: BarChart3,
                    color: "#8b5cf6",
                    title: "Statistiques avancées",
                    desc: "Visualisez vos statistiques détaillées",
                  },
                  {
                    icon: Users,
                    color: "#f59e0b",
                    title: "Communauté",
                    desc: "Rejoignez la communauté de traders",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-xl"
                    style={{
                      background: `${item.color}08`,
                      border: `1px solid ${item.color}20`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${item.color}30, ${item.color}15)`,
                      }}
                    >
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[--text-primary]">
                        {item.title}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted, #6b7280)" }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={close}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                  boxShadow: "0 4px 20px rgba(14, 165, 233, 0.3)",
                }}
              >
                Commencer
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step indicator dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? "24px" : "8px",
                  height: "8px",
                  background:
                    i === step
                      ? "linear-gradient(135deg, #0ea5e9, #3b82f6)"
                      : i < step
                        ? "#0ea5e9"
                        : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
