import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Brain,
  Shield,
  Activity,
  Play,
  Check,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Palette,
  Sparkles,
  Zap,
} from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[--bg-primary] text-[--text-primary]">
      {/* ==================== NAVBAR ==================== */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[--border-subtle]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[--text-primary]">
                MarketPhase
              </span>
            </Link>

            {/* Nav Links - hidden on mobile */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors"
              >
                Fonctionnalités
              </a>
              <a
                href="#avantages"
                className="text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors"
              >
                Avantages
              </a>
              <a
                href="#pricing"
                className="text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors"
              >
                Pricing
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors px-4 py-2"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                Commencer Gratuitement
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[--text-secondary] mb-8">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Journal de Trading Nouvelle Génération</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[--text-primary] max-w-4xl mx-auto leading-tight">
            Le Journal de Trading Qui Transforme Vos Données en{" "}
            <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              Profits
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-[--text-secondary] max-w-2xl mx-auto leading-relaxed">
            Analysez vos trades, détectez vos erreurs, et améliorez votre
            performance avec l&apos;IA. Utilisé par +500 traders professionnels.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-base font-semibold text-white px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              Commencer Gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-base font-semibold text-[--text-secondary] px-8 py-4 rounded-xl border border-[--border] hover:border-[--text-muted] hover:text-[--text-primary] transition-all"
            >
              Voir les Fonctionnalités
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>

          {/* Stats Bar */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: "29+", label: "Outils" },
              { value: "3", label: "Thèmes" },
              { value: "IA", label: "Intégrée" },
              { value: "100%", label: "Gratuit" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-xl px-6 py-4 text-center"
              >
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-[--text-muted] mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES SECTION ==================== */}
      <section id="features" className="py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[--text-secondary] mb-6">
              <Zap className="w-4 h-4 text-cyan-400" />
              Fonctionnalités
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[--text-primary]">
              Tout ce dont vous avez besoin pour{" "}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                performer
              </span>
            </h2>
            <p className="mt-4 text-lg text-[--text-secondary] max-w-2xl mx-auto">
              Des outils professionnels conçus pour les traders sérieux qui
              veulent passer au niveau supérieur.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Journal Intelligent",
                description:
                  "Enregistrez chaque trade avec émotions, screenshots, et notes détaillées pour une analyse complète.",
                gradient: "from-blue-500 to-blue-600",
              },
              {
                icon: BarChart3,
                title: "Analytics Avancés",
                description:
                  "50+ métriques : Sharpe Ratio, Profit Factor, Drawdown, R-Multiple et plus encore.",
                gradient: "from-cyan-400 to-cyan-500",
              },
              {
                icon: Brain,
                title: "AI Trade Coach",
                description:
                  "L'IA analyse vos patterns et vous donne des insights personnalisés pour améliorer votre edge.",
                gradient: "from-violet-500 to-violet-600",
              },
              {
                icon: Activity,
                title: "Market Data Live",
                description:
                  "Données temps réel : stocks, indices, options via MarketData.app directement intégrées.",
                gradient: "from-emerald-500 to-emerald-600",
              },
              {
                icon: Shield,
                title: "Gestion du Risque",
                description:
                  "Calculateur de position, détection d'erreurs, alertes comportementales automatiques.",
                gradient: "from-amber-500 to-amber-600",
              },
              {
                icon: Play,
                title: "Replay & Corrélation",
                description:
                  "Rejouez vos trades et analysez les corrélations entre instruments pour trouver des opportunités.",
                gradient: "from-rose-500 to-rose-600",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="metric-card rounded-2xl p-6 group hover:border-blue-500/30"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[--text-primary] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[--text-secondary] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== ADVANTAGES SECTION ==================== */}
      <section id="avantages" className="py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Side */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[--text-secondary] mb-6">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Avantages
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[--text-primary] leading-tight">
                Pourquoi MarketPhase plutôt qu&apos;un{" "}
                <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                  tableur
                </span>{" "}
                ?
              </h2>
              <p className="mt-4 text-lg text-[--text-secondary]">
                Arrêtez de perdre du temps avec des outils génériques. MarketPhase
                est conçu spécifiquement pour les traders.
              </p>
            </div>

            {/* Right Side - Advantages List */}
            <div className="space-y-5">
              {[
                "29 outils spécialisés vs un simple tableau Excel",
                "IA qui détecte vos patterns récurrents automatiquement",
                "3 thèmes (Dark, Light, OLED) pour votre confort",
                "Données de marché en temps réel intégrées",
                "Score de discipline et notation automatique A-F",
                "100% gratuit — pas de plan payant caché",
              ].map((advantage) => (
                <div
                  key={advantage}
                  className="flex items-start gap-4 glass rounded-xl p-4"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[--text-primary] font-medium pt-1">
                    {advantage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SCREENSHOT / DEMO SECTION ==================== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[--text-primary]">
              Une interface pensée pour les{" "}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                traders
              </span>
            </h2>
            <p className="mt-4 text-lg text-[--text-secondary]">
              Propre, rapide, et remplie de données actionnables.
            </p>
          </div>

          {/* App Screenshot Placeholder */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl blur-sm opacity-30" />
            <div className="relative glass rounded-2xl p-1">
              <div className="rounded-xl bg-[--bg-secondary] overflow-hidden">
                {/* Fake titlebar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[--border-subtle]">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                  <div className="flex-1 text-center text-xs text-[--text-muted] font-medium">
                    MarketPhase — Dashboard
                  </div>
                </div>
                {/* Content area */}
                <div className="p-8 sm:p-12 min-h-[300px] sm:min-h-[400px] flex flex-col items-center justify-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-semibold text-[--text-primary]">
                      Interface complète avec 29+ outils de trading
                    </p>
                    <p className="mt-2 text-sm text-[--text-muted]">
                      Dashboard, Journal, Analytics, AI Coach, Market Data, et plus
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {[
                      "Dashboard",
                      "Journal",
                      "Analytics",
                      "AI Coach",
                      "Risque",
                      "Replay",
                    ].map((tool) => (
                      <span
                        key={tool}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium glass text-[--text-secondary]"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PRICING SECTION ==================== */}
      <section id="pricing" className="py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[--text-secondary] mb-6">
              <Palette className="w-4 h-4 text-cyan-400" />
              Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[--text-primary]">
              Simple et{" "}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                transparent
              </span>
            </h2>
            <p className="mt-4 text-lg text-[--text-secondary]">
              Pas de plans payants cachés. Tout est inclus, pour toujours.
            </p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-3xl blur-sm opacity-30" />
              <div className="relative metric-card rounded-3xl p-8 sm:p-10 text-center">
                {/* Badge */}
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-sm font-bold mb-6">
                  Gratuit
                </div>

                {/* Price */}
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl sm:text-6xl font-bold text-[--text-primary]">
                    0€
                  </span>
                  <span className="text-lg text-[--text-muted]">/ mois</span>
                </div>
                <p className="text-[--text-secondary] font-medium mb-8">
                  Pour toujours
                </p>

                {/* Divider */}
                <div className="w-full h-px bg-[--border] mb-8" />

                {/* Feature List */}
                <ul className="space-y-4 text-left mb-10">
                  {[
                    "Tous les outils (29+)",
                    "Stockage illimité",
                    "Support communautaire",
                    "Mises à jour régulières",
                    "AI Trade Coach inclus",
                    "Market Data en temps réel",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-[--text-primary]"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-sm font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="/register"
                  className="w-full inline-flex items-center justify-center gap-2 text-base font-semibold text-white px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                >
                  Créer Mon Compte
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA SECTION ==================== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-3xl blur-lg opacity-20" />
            <div className="relative glass rounded-3xl p-10 sm:p-16 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-[--text-primary] mb-4">
                Prêt à transformer votre{" "}
                <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                  trading
                </span>{" "}
                ?
              </h2>
              <p className="text-lg text-[--text-secondary] max-w-xl mx-auto mb-8">
                Rejoignez MarketPhase et prenez le contrôle de vos performances.
                C&apos;est gratuit, pour toujours.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-base font-semibold text-white px-10 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
              >
                Commencer Maintenant — C&apos;est Gratuit
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-[--border-subtle] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-[--text-primary]">
                  MarketPhase
                </span>
              </Link>
              <p className="text-sm text-[--text-muted] leading-relaxed">
                Journal de Trading Professionnel.
                <br />
                Analysez, apprenez, performez.
              </p>
            </div>

            {/* Produit Column */}
            <div>
              <h4 className="text-sm font-semibold text-[--text-primary] uppercase tracking-wider mb-4">
                Produit
              </h4>
              <ul className="space-y-3">
                {[
                  { label: "Fonctionnalités", href: "#features" },
                  { label: "Analytics", href: "#features" },
                  { label: "AI Coach", href: "#features" },
                  { label: "Market Data", href: "#features" },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[--text-muted] hover:text-[--text-primary] transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ressources Column */}
            <div>
              <h4 className="text-sm font-semibold text-[--text-primary] uppercase tracking-wider mb-4">
                Ressources
              </h4>
              <ul className="space-y-3">
                {["Documentation", "Support", "Changelog"].map((label) => (
                  <li key={label}>
                    <span className="text-sm text-[--text-muted] hover:text-[--text-primary] transition-colors cursor-default">
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Légal Column */}
            <div>
              <h4 className="text-sm font-semibold text-[--text-primary] uppercase tracking-wider mb-4">
                Légal
              </h4>
              <ul className="space-y-3">
                {["CGU", "Confidentialité"].map((label) => (
                  <li key={label}>
                    <span className="text-sm text-[--text-muted] hover:text-[--text-primary] transition-colors cursor-default">
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-[--border-subtle] text-center">
            <p className="text-sm text-[--text-muted]">
              © 2026 MarketPhase. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
