"use client";

import { useState, useEffect } from "react";
import {
  Check,
  X,
  Zap,
  Crown,
  Star,
  MessageCircle,
  BarChart3,
  FileText,
  Shield,
  Globe,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  FlaskConical,
  Award,
  Mail,
  Trophy,
} from "lucide-react";

// ─── Types ───
type Plan = "free" | "pro" | "vip";
type BillingCycle = "monthly" | "annual";

interface PlanDef {
  id: Plan;
  name: string;
  monthlyPrice: number;
  features: { text: string; icon: React.ElementType }[];
  cta: string;
  popular?: boolean;
  vip?: boolean;
}

// ─── Plan definitions ───
const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    features: [
      { text: "Journal illimité", icon: FileText },
      { text: "Analytics de base", icon: BarChart3 },
      { text: "AI Coach (3 msg/jour)", icon: Zap },
      { text: "Calendrier P&L", icon: Calendar },
      { text: "Heatmap", icon: BarChart3 },
      { text: "Backtest (30 jours)", icon: FlaskConical },
      { text: "1 rapport PDF/mois", icon: FileText },
      { text: "Chat (lecture seule)", icon: MessageCircle },
    ],
    cta: "Actuel",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 4.9,
    popular: true,
    features: [
      { text: "Tout le Free +", icon: Check },
      { text: "AI Coach illimité", icon: Zap },
      { text: "Challenges", icon: Trophy },
      { text: "Chat (écriture)", icon: MessageCircle },
      { text: "Rapports PDF illimités", icon: FileText },
      { text: "Backtest (1 an)", icon: FlaskConical },
      { text: "Badge Pro", icon: Award },
      { text: "Support email", icon: Mail },
    ],
    cta: "Passer à Pro",
  },
  {
    id: "vip",
    name: "VIP",
    monthlyPrice: 9,
    vip: true,
    features: [
      { text: "Tout le Pro +", icon: Check },
      { text: "Indicateurs TradingView exclusifs", icon: Star },
      { text: "Analyses macro hebdomadaires", icon: Globe },
      { text: "Scénarios de trading", icon: BarChart3 },
      { text: "Chat VIP rooms", icon: MessageCircle },
      { text: "Badge VIP doré", icon: Crown },
      { text: "Support prioritaire", icon: Shield },
    ],
    cta: "Passer à VIP",
  },
];

// ─── Feature comparison table ───
const COMPARISON = [
  { feature: "Journal illimité", free: true, pro: true, vip: true },
  { feature: "Analytics de base", free: true, pro: true, vip: true },
  { feature: "Calendrier P&L", free: true, pro: true, vip: true },
  { feature: "Heatmap", free: true, pro: true, vip: true },
  { feature: "AI Coach", free: "3 msg/jour", pro: "Illimité", vip: "Illimité" },
  { feature: "Backtest", free: "30 jours", pro: "1 an", vip: "1 an" },
  { feature: "Rapports PDF", free: "1/mois", pro: "Illimités", vip: "Illimités" },
  { feature: "Chat communautaire", free: "Lecture seule", pro: "Écriture", vip: "Écriture" },
  { feature: "Challenges", free: false, pro: true, vip: true },
  { feature: "Badge", free: false, pro: "Pro", vip: "VIP doré" },
  { feature: "Support email", free: false, pro: true, vip: true },
  { feature: "Indicateurs TradingView exclusifs", free: false, pro: false, vip: true },
  { feature: "Analyses macro hebdomadaires", free: false, pro: false, vip: true },
  { feature: "Scénarios de trading", free: false, pro: false, vip: true },
  { feature: "Chat VIP rooms", free: false, pro: false, vip: true },
  { feature: "Support prioritaire", free: false, pro: false, vip: true },
];

// ─── FAQ ───
const FAQ = [
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Oui, vous pouvez upgrader ou downgrader à tout moment. Le changement est effectif immédiatement et la facturation est ajustée au prorata.",
  },
  {
    q: "Y a-t-il un engagement ?",
    a: "Non, aucun engagement. Vous pouvez annuler votre abonnement mensuel quand vous le souhaitez. L'abonnement annuel est remboursable les 14 premiers jours.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Nous acceptons les cartes Visa, Mastercard, American Express ainsi que les paiements SEPA via Stripe.",
  },
  {
    q: "Que se passe-t-il si j'annule ?",
    a: "Vous gardez accès à votre plan actuel jusqu'à la fin de la période de facturation. Ensuite, vous repassez automatiquement au plan Free.",
  },
  {
    q: "Les données de mon journal sont-elles conservées ?",
    a: "Oui, toutes vos données sont conservées quel que soit votre plan. Vous ne perdez jamais de données.",
  },
  {
    q: "Quelle est la différence entre Pro et VIP ?",
    a: "Le plan Pro débloque toutes les fonctionnalités avancées (AI Coach illimité, challenges, chat écriture, backtest 1 an). Le VIP ajoute le contenu exclusif : indicateurs TradingView, analyses macro hebdomadaires, scénarios de trading et les rooms VIP.",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("annual");
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState<Plan | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.plan) setCurrentPlan(d.plan as Plan);
      })
      .catch(() => {});
  }, []);

  const getPrice = (monthly: number) => {
    if (monthly === 0) return 0;
    return billing === "annual" ? +(monthly * 0.8).toFixed(2) : monthly;
  };

  const handleUpgrade = async (plan: Plan) => {
    if (plan === currentPlan) return;
    setLoading(plan);
    setUpgradeSuccess(null);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle: billing }),
      });
      if (res.ok) {
        setCurrentPlan(plan);
        setUpgradeSuccess(
          plan === "free"
            ? "Vous êtes repassé au plan Free."
            : `Bienvenue dans le plan ${plan.toUpperCase()} !`
        );
        window.dispatchEvent(new Event("plan-changed"));
      }
    } catch {
      // silently fail for mock
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Abonnements
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Choisissez votre plan
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
          Débloquez tout le potentiel de votre trading avec nos outils premium.
          Commencez gratuitement, évoluez quand vous êtes prêt.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <span
          className={`text-sm font-medium ${
            billing === "monthly"
              ? "text-gray-900 dark:text-white"
              : "text-gray-400"
          }`}
        >
          Mensuel
        </span>
        <button
          onClick={() =>
            setBilling((b) => (b === "monthly" ? "annual" : "monthly"))
          }
          className={`relative w-14 h-7 rounded-full transition-colors ${
            billing === "annual" ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700"
          }`}
        >
          <div
            className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              billing === "annual" ? "translate-x-7" : "translate-x-0.5"
            }`}
          />
        </button>
        <span
          className={`text-sm font-medium ${
            billing === "annual"
              ? "text-gray-900 dark:text-white"
              : "text-gray-400"
          }`}
        >
          Annuel
        </span>
        {billing === "annual" && (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            -20%
          </span>
        )}
      </div>

      {/* Success banner */}
      {upgradeSuccess && (
        <div className="max-w-xl mx-auto mb-8 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center text-sm font-medium">
          {upgradeSuccess}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20 items-end">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const price = getPrice(plan.monthlyPrice);
          const isVip = plan.vip;
          const isPro = plan.popular;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-[1px] transition-all duration-300 ${
                isPro
                  ? "bg-gradient-to-b from-blue-400/60 via-blue-500/30 to-blue-600/10 shadow-lg shadow-blue-500/20 md:-mt-4"
                  : isVip
                  ? "bg-gradient-to-b from-amber-400/60 via-amber-500/30 to-amber-600/10 shadow-lg shadow-amber-500/20"
                  : "bg-gray-200 dark:bg-gray-800"
              }`}
            >
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="px-4 py-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-500/30">
                    Recommandé
                  </span>
                </div>
              )}

              {isVip && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-bold shadow-lg shadow-amber-500/30">
                    VIP
                  </span>
                </div>
              )}

              <div
                className={`h-full rounded-2xl p-6 backdrop-blur-xl ${
                  isPro
                    ? "bg-gray-900/95 dark:bg-gray-900/95"
                    : isVip
                    ? "bg-gray-900/95 dark:bg-gray-900/95"
                    : "bg-white/80 dark:bg-gray-900/80"
                }`}
              >
                {/* Plan name */}
                <h3
                  className={`text-xl font-bold mb-1 ${
                    isPro
                      ? "text-blue-400"
                      : isVip
                      ? "text-amber-400"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-6">
                  <span
                    className={`text-4xl font-extrabold ${
                      isPro
                        ? "text-blue-400"
                        : isVip
                        ? "text-amber-400"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {price === 0 ? "0" : price}€
                  </span>
                  <span className="text-sm text-gray-400">/mois</span>
                </div>

                {billing === "annual" && plan.monthlyPrice > 0 && (
                  <p className="text-xs text-gray-500 -mt-4 mb-4">
                    soit {(price * 12).toFixed(2)}€/an au lieu de{" "}
                    {(plan.monthlyPrice * 12).toFixed(2)}€
                  </p>
                )}

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, i) => {
                    const FIcon = f.icon;
                    return (
                      <li key={i} className="flex items-center gap-3 text-sm">
                        <FIcon
                          className={`w-4 h-4 flex-shrink-0 ${
                            isPro
                              ? "text-blue-400"
                              : isVip
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          {f.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || loading === plan.id}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                    isCurrent
                      ? "bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-default"
                      : isPro
                      ? "bg-gradient-to-r from-blue-400 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
                      : isVip
                      ? "bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:shadow-lg hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                >
                  {loading === plan.id
                    ? "Traitement..."
                    : isCurrent
                    ? "Actuel"
                    : plan.cta}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature comparison */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
          Comparaison des fonctionnalités
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">
                  Fonctionnalité
                </th>
                <th className="text-center py-4 px-4 text-sm font-bold text-gray-900 dark:text-white">
                  Free
                </th>
                <th className="text-center py-4 px-4 text-sm font-bold text-blue-400">
                  Pro — {getPrice(4.9)}€/mois
                </th>
                <th className="text-center py-4 px-4 text-sm font-bold text-amber-400">
                  VIP — {getPrice(9)}€/mois
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 dark:border-gray-800/50"
                >
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {row.feature}
                  </td>
                  {(["free", "pro", "vip"] as const).map((p) => (
                    <td key={p} className="text-center py-3 px-4">
                      {typeof row[p] === "string" ? (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {row[p]}
                        </span>
                      ) : row[p] ? (
                        <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
          Questions fréquentes
        </h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.q}
                </span>
                {openFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4 text-sm text-gray-500 dark:text-gray-400">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center pb-8">
        <p className="text-xs text-gray-400">
          Paiement sécurisé par Stripe. Annulation possible à tout moment.
        </p>
      </div>
    </div>
  );
}
