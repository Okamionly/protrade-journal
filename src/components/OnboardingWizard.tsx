"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  ArrowRight,
  ArrowLeft,
  Upload,
  PenLine,
  Compass,
  Target,
  Zap,
  TrendingUp,
  BarChart3,
  Brain,
  BookOpen,
  Globe,
  CheckCircle2,
  DollarSign,
  Percent,
  ShieldAlert,
} from "lucide-react";
import { useTrades } from "@/hooks/useTrades";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "onboarding-complete";
const TOTAL_STEPS = 7;

type TradingStyle = "scalper" | "daytrader" | "swing" | "position";
type Market = "forex" | "indices" | "crypto" | "actions" | "matieres-premieres";
type StartChoice = "import" | "manual" | "explore";

interface Goals {
  monthlyPnl: string;
  winRate: string;
  maxRisk: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Progress bar with numbered circles */
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-0 px-6 py-5 select-none">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            {/* Circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 shrink-0",
                active && "scale-110",
              )}
              style={{
                background: done
                  ? "linear-gradient(135deg, #0ea5e9, #3b82f6)"
                  : active
                    ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)"
                    : "rgba(255,255,255,0.07)",
                border: active
                  ? "2px solid rgba(14,165,233,0.6)"
                  : done
                    ? "2px solid transparent"
                    : "2px solid rgba(255,255,255,0.1)",
                color: done || active ? "#fff" : "rgba(255,255,255,0.35)",
                boxShadow: active
                  ? "0 0 20px rgba(14,165,233,0.4)"
                  : "none",
              }}
            >
              {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            {/* Connector line */}
            {i < total - 1 && (
              <div
                className="h-[2px] transition-all duration-500"
                style={{
                  width: "28px",
                  background: done
                    ? "linear-gradient(90deg, #0ea5e9, #3b82f6)"
                    : "rgba(255,255,255,0.08)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Animated card wrapper for each step */
function StepContainer({
  children,
  direction,
}: {
  children: ReactNode;
  direction: "left" | "right";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="transition-all duration-500 ease-out"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted
          ? "translateX(0)"
          : direction === "right"
            ? "translateX(40px)"
            : "translateX(-40px)",
      }}
    >
      {children}
    </div>
  );
}

/** Step header */
function StepHeader({
  icon,
  iconColor,
  title,
  subtitle,
}: {
  icon: ReactNode;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-6">
      <div
        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
        style={{
          background: `linear-gradient(135deg, ${iconColor}25, ${iconColor}10)`,
          border: `1px solid ${iconColor}40`,
        }}
      >
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-[--text-primary]">{title}</h2>
      <p
        className="text-sm mt-2 max-w-sm mx-auto"
        style={{ color: "var(--text-muted, #9ca3af)" }}
      >
        {subtitle}
      </p>
    </div>
  );
}

/** Selectable card */
function SelectCard({
  selected,
  onClick,
  icon,
  iconColor,
  label,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  iconColor: string;
  label: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-full text-left"
      style={{
        background: selected ? `${iconColor}15` : "rgba(255,255,255,0.03)",
        border: selected
          ? `2px solid ${iconColor}60`
          : "2px solid rgba(255,255,255,0.06)",
        boxShadow: selected ? `0 0 20px ${iconColor}15` : "none",
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${iconColor}30, ${iconColor}10)`,
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[--text-primary]">{label}</p>
        {desc && (
          <p
            className="text-xs mt-0.5 truncate"
            style={{ color: "var(--text-muted, #6b7280)" }}
          >
            {desc}
          </p>
        )}
      </div>
      {selected && (
        <CheckCircle2
          className="w-5 h-5 ml-auto shrink-0"
          style={{ color: iconColor }}
        />
      )}
    </button>
  );
}

/** Toggle chip for multi-select */
function Chip({
  selected,
  onClick,
  label,
  color,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
      style={{
        background: selected ? `${color}20` : "rgba(255,255,255,0.04)",
        border: selected
          ? `1.5px solid ${color}50`
          : "1.5px solid rgba(255,255,255,0.08)",
        color: selected ? color : "var(--text-muted, #9ca3af)",
        boxShadow: selected ? `0 0 12px ${color}10` : "none",
      }}
    >
      {label}
    </button>
  );
}

/** Feature card with pulse animation */
function FeatureShowcase({
  icon,
  color,
  title,
  desc,
  delay,
}: {
  icon: ReactNode;
  color: string;
  title: string;
  desc: string;
  delay: number;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl transition-all duration-700"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(16px)",
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 relative"
        style={{
          background: `linear-gradient(135deg, ${color}30, ${color}10)`,
        }}
      >
        {icon}
        {/* Pulse ring */}
        <div
          className="absolute inset-0 rounded-xl animate-ping"
          style={{
            background: `${color}10`,
            animationDuration: "2s",
            animationIterationCount: "2",
          }}
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--text-muted, #6b7280)" }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OnboardingWizard() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");

  // Step 1
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("10000");

  // Step 2
  const [startChoice, setStartChoice] = useState<StartChoice | null>(null);

  // Step 3
  const [goals, setGoals] = useState<Goals>({
    monthlyPnl: "1000",
    winRate: "55",
    maxRisk: "2",
  });

  // Step 4
  const [tradingStyle, setTradingStyle] = useState<TradingStyle | null>(null);

  // Step 5
  const [markets, setMarkets] = useState<Market[]>([]);

  const { trades } = useTrades();
  const router = useRouter();

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done && trades.length === 0) {
      setVisible(true);
    }
  }, [trades]);

  // Navigation
  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setDirection("right");
      setStep((s) => s + 1);
    }
  }, [step]);

  const goPrev = useCallback(() => {
    if (step > 0) {
      setDirection("left");
      setStep((s) => s - 1);
    }
  }, [step]);

  const close = useCallback(() => {
    // Save all preferences
    if (tradingStyle) {
      localStorage.setItem("onboarding-style", tradingStyle);
    }
    if (markets.length > 0) {
      localStorage.setItem("onboarding-markets", JSON.stringify(markets));
    }
    localStorage.setItem("onboarding-goals", JSON.stringify(goals));
    if (name.trim()) {
      localStorage.setItem("onboarding-name", name.trim());
    }
    if (balance) {
      localStorage.setItem("onboarding-balance", balance);
    }

    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }, [tradingStyle, markets, goals, name, balance]);

  const finish = useCallback(() => {
    close();

    // Navigate based on start choice
    if (startChoice === "import") {
      router.push("/import");
    } else if (startChoice === "manual") {
      router.push("/journal");
    }
  }, [close, startChoice, router]);

  const skip = useCallback(() => {
    close();
  }, [close]);

  // Toggle market
  const toggleMarket = (m: Market) => {
    setMarkets((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  };

  if (!visible) return null;

  // -------------------------------------------------------------------------
  // Step content
  // -------------------------------------------------------------------------

  const stepContent = [
    // Step 1: Welcome
    <StepContainer key="s1" direction={direction}>
      <StepHeader
        icon={<Sparkles className="w-8 h-8 text-cyan-400" />}
        iconColor="#0ea5e9"
        title="Bienvenue sur MarketPhase !"
        subtitle="Configurons votre espace de trading en quelques secondes."
      />

      <div className="space-y-4">
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{ color: "var(--text-muted, #9ca3af)" }}
          >
            Votre nom ou pseudo
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Alex"
            className="input-field w-full text-sm"
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{ color: "var(--text-muted, #9ca3af)" }}
          >
            Capital de depart ($)
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
            Modifiable a tout moment dans les parametres.
          </p>
        </div>
      </div>
    </StepContainer>,

    // Step 2: How to start
    <StepContainer key="s2" direction={direction}>
      <StepHeader
        icon={<Compass className="w-8 h-8 text-blue-400" />}
        iconColor="#3b82f6"
        title="Comment voulez-vous commencer ?"
        subtitle="Choisissez la methode qui vous convient."
      />

      <div className="space-y-3">
        <SelectCard
          selected={startChoice === "import"}
          onClick={() => setStartChoice("import")}
          icon={<Upload className="w-5 h-5 text-cyan-400" />}
          iconColor="#0ea5e9"
          label="Importer un CSV"
          desc="Importez votre historique depuis votre broker"
        />
        <SelectCard
          selected={startChoice === "manual"}
          onClick={() => setStartChoice("manual")}
          icon={<PenLine className="w-5 h-5 text-purple-400" />}
          iconColor="#8b5cf6"
          label="Ajouter manuellement"
          desc="Saisissez vos trades un par un"
        />
        <SelectCard
          selected={startChoice === "explore"}
          onClick={() => setStartChoice("explore")}
          icon={<Compass className="w-5 h-5 text-amber-400" />}
          iconColor="#f59e0b"
          label="Explorer d'abord"
          desc="Decouvrez l'interface avant de commencer"
        />
      </div>
    </StepContainer>,

    // Step 3: Goals
    <StepContainer key="s3" direction={direction}>
      <StepHeader
        icon={<Target className="w-8 h-8 text-emerald-400" />}
        iconColor="#10b981"
        title="Vos objectifs"
        subtitle="Definissez vos cibles pour rester motive."
      />

      <div className="space-y-4">
        <div>
          <label
            className="flex items-center gap-2 text-xs font-medium mb-2"
            style={{ color: "var(--text-muted, #9ca3af)" }}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Objectif P&L mensuel ($)
          </label>
          <input
            type="number"
            value={goals.monthlyPnl}
            onChange={(e) =>
              setGoals((g) => ({ ...g, monthlyPnl: e.target.value }))
            }
            className="input-field w-full text-sm"
            min={0}
            step={100}
          />
        </div>

        <div>
          <label
            className="flex items-center gap-2 text-xs font-medium mb-2"
            style={{ color: "var(--text-muted, #9ca3af)" }}
          >
            <Percent className="w-3.5 h-3.5" />
            Taux de reussite cible (%)
          </label>
          <input
            type="number"
            value={goals.winRate}
            onChange={(e) =>
              setGoals((g) => ({ ...g, winRate: e.target.value }))
            }
            className="input-field w-full text-sm"
            min={0}
            max={100}
          />
        </div>

        <div>
          <label
            className="flex items-center gap-2 text-xs font-medium mb-2"
            style={{ color: "var(--text-muted, #9ca3af)" }}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Risque max par trade (%)
          </label>
          <input
            type="number"
            value={goals.maxRisk}
            onChange={(e) =>
              setGoals((g) => ({ ...g, maxRisk: e.target.value }))
            }
            className="input-field w-full text-sm"
            min={0}
            max={100}
            step={0.5}
          />
        </div>
      </div>
    </StepContainer>,

    // Step 4: Trading Style
    <StepContainer key="s4" direction={direction}>
      <StepHeader
        icon={<Zap className="w-8 h-8 text-yellow-400" />}
        iconColor="#eab308"
        title="Votre style de trading"
        subtitle="Cela ajustera les parametres par defaut."
      />

      <div className="space-y-3">
        {(
          [
            {
              value: "scalper" as TradingStyle,
              label: "Scalper",
              desc: "Trades rapides, quelques secondes a minutes",
              icon: <Zap className="w-5 h-5 text-yellow-400" />,
              color: "#eab308",
            },
            {
              value: "daytrader" as TradingStyle,
              label: "Day Trader",
              desc: "Positions cloturees dans la journee",
              icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
              color: "#3b82f6",
            },
            {
              value: "swing" as TradingStyle,
              label: "Swing Trader",
              desc: "Positions de quelques jours a semaines",
              icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
              color: "#10b981",
            },
            {
              value: "position" as TradingStyle,
              label: "Position Trader",
              desc: "Investissements a moyen/long terme",
              icon: <Globe className="w-5 h-5 text-purple-400" />,
              color: "#8b5cf6",
            },
          ] as const
        ).map((s) => (
          <SelectCard
            key={s.value}
            selected={tradingStyle === s.value}
            onClick={() => setTradingStyle(s.value)}
            icon={s.icon}
            iconColor={s.color}
            label={s.label}
            desc={s.desc}
          />
        ))}
      </div>
    </StepContainer>,

    // Step 5: Preferred Markets
    <StepContainer key="s5" direction={direction}>
      <StepHeader
        icon={<Globe className="w-8 h-8 text-indigo-400" />}
        iconColor="#6366f1"
        title="Marches preferes"
        subtitle="Selectionnez les marches sur lesquels vous tradez."
      />

      <div className="flex flex-wrap gap-3 justify-center">
        {(
          [
            { value: "forex" as Market, label: "Forex", color: "#0ea5e9" },
            { value: "indices" as Market, label: "Indices", color: "#3b82f6" },
            { value: "crypto" as Market, label: "Crypto", color: "#8b5cf6" },
            { value: "actions" as Market, label: "Actions", color: "#10b981" },
            {
              value: "matieres-premieres" as Market,
              label: "Matieres premieres",
              color: "#f59e0b",
            },
          ] as const
        ).map((m) => (
          <Chip
            key={m.value}
            selected={markets.includes(m.value)}
            onClick={() => toggleMarket(m.value)}
            label={m.label}
            color={m.color}
          />
        ))}
      </div>

      <p
        className="text-xs text-center mt-4"
        style={{ color: "var(--text-muted, #6b7280)" }}
      >
        Selectionnez un ou plusieurs marches.
      </p>
    </StepContainer>,

    // Step 6: Key Features
    <StepContainer key="s6" direction={direction}>
      <StepHeader
        icon={<BookOpen className="w-8 h-8 text-cyan-400" />}
        iconColor="#0ea5e9"
        title="Fonctionnalites cles"
        subtitle="Decouvrez les outils a votre disposition."
      />

      <div className="space-y-3">
        <FeatureShowcase
          icon={<BookOpen className="w-6 h-6 text-cyan-400" />}
          color="#0ea5e9"
          title="Journal de Trading"
          desc="Enregistrez, annotez et analysez chaque trade en detail"
          delay={100}
        />
        <FeatureShowcase
          icon={<BarChart3 className="w-6 h-6 text-purple-400" />}
          color="#8b5cf6"
          title="Analytics Avancees"
          desc="Statistiques detaillees, graphiques et rapports personnalises"
          delay={400}
        />
        <FeatureShowcase
          icon={<Brain className="w-6 h-6 text-amber-400" />}
          color="#f59e0b"
          title="Coach IA"
          desc="Conseils personnalises bases sur vos performances"
          delay={700}
        />
      </div>
    </StepContainer>,

    // Step 7: Ready!
    <StepContainer key="s7" direction={direction}>
      <StepHeader
        icon={<CheckCircle2 className="w-8 h-8 text-emerald-400" />}
        iconColor="#10b981"
        title="Pret !"
        subtitle="Voici un resume de vos choix."
      />

      <div className="space-y-3">
        {/* Summary cards */}
        <div
          className="rounded-xl p-4 space-y-2.5"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {name.trim() && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-muted, #9ca3af)" }}>Nom</span>
              <span className="font-medium text-[--text-primary]">
                {name.trim()}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-muted, #9ca3af)" }}>
              Capital
            </span>
            <span className="font-medium text-[--text-primary]">
              ${Number(balance).toLocaleString()}
            </span>
          </div>
          {tradingStyle && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-muted, #9ca3af)" }}>Style</span>
              <span className="font-medium text-[--text-primary]">
                {tradingStyle === "scalper"
                  ? "Scalper"
                  : tradingStyle === "daytrader"
                    ? "Day Trader"
                    : tradingStyle === "swing"
                      ? "Swing Trader"
                      : "Position Trader"}
              </span>
            </div>
          )}
          {markets.length > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-muted, #9ca3af)" }}>
                Marches
              </span>
              <span className="font-medium text-[--text-primary] text-right max-w-[200px]">
                {markets
                  .map((m) =>
                    m === "forex"
                      ? "Forex"
                      : m === "indices"
                        ? "Indices"
                        : m === "crypto"
                          ? "Crypto"
                          : m === "actions"
                            ? "Actions"
                            : "Mat. prem.",
                  )
                  .join(", ")}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-muted, #9ca3af)" }}>
              Objectif mensuel
            </span>
            <span className="font-medium text-[--text-primary]">
              ${Number(goals.monthlyPnl).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-muted, #9ca3af)" }}>
              Win rate cible
            </span>
            <span className="font-medium text-[--text-primary]">
              {goals.winRate}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-muted, #9ca3af)" }}>
              Risque max
            </span>
            <span className="font-medium text-[--text-primary]">
              {goals.maxRisk}%
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={finish}
        className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        style={{
          background: "linear-gradient(135deg, #10b981, #0ea5e9)",
          boxShadow: "0 4px 24px rgba(16, 185, 129, 0.3)",
        }}
      >
        Commencer
        <ArrowRight className="w-4 h-4" />
      </button>
    </StepContainer>,
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop with gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(14,165,233,0.15) 0%, transparent 50%), " +
            "radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.12) 0%, transparent 50%), " +
            "rgba(0,0,0,0.80)",
          backdropFilter: "blur(12px)",
        }}
        onClick={skip}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.98))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Top gradient accent */}
        <div
          className="h-1 w-full"
          style={{
            background: "linear-gradient(90deg, #0ea5e9, #3b82f6, #8b5cf6)",
          }}
        />

        {/* Skip / Close */}
        <button
          onClick={skip}
          className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:bg-white/10 z-10"
          style={{ color: "var(--text-muted, #6b7280)" }}
        >
          Passer
          <X className="w-3.5 h-3.5 inline-block ml-1.5 -mt-0.5" />
        </button>

        {/* Step progress bar */}
        <StepProgress current={step} total={TOTAL_STEPS} />

        {/* Step content */}
        <div className="px-8 pb-2 min-h-[380px] flex flex-col justify-center">
          {stepContent[step]}
        </div>

        {/* Navigation footer */}
        {!isLastStep && (
          <div className="px-8 pb-6 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button
                onClick={goPrev}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition hover:bg-white/5"
                style={{ color: "var(--text-muted, #9ca3af)" }}
              >
                <ArrowLeft className="w-4 h-4" />
                Precedent
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={goNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
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

        {/* Back button on last step */}
        {isLastStep && (
          <div className="px-8 pb-6 flex items-center">
            <button
              onClick={goPrev}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition hover:bg-white/5"
              style={{ color: "var(--text-muted, #9ca3af)" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Precedent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
