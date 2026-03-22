import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Target, Users, Zap, BarChart3, Brain, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "À propos de MarketPhase — Journal de Trading Gratuit avec IA",
  description:
    "Découvrez MarketPhase, le journal de trading gratuit conçu par des traders pour des traders. Notre mission : rendre l'analyse de performance accessible à tous.",
  keywords: [
    "MarketPhase journal trading",
    "journal de trading gratuit",
    "à propos MarketPhase",
    "équipe MarketPhase",
    "trading journal",
  ],
  openGraph: {
    title: "À propos de MarketPhase — Journal de Trading Gratuit",
    description:
      "Découvrez notre mission : démocratiser l'analyse de trading avec un journal gratuit, puissant et propulsé par l'IA.",
  },
};

const VALUES = [
  {
    icon: Target,
    title: "Performance accessible",
    desc: "Nous croyons que chaque trader mérite des outils professionnels, peu importe son capital de départ.",
  },
  {
    icon: Brain,
    title: "Intelligence artificielle",
    desc: "Notre AI Coach analyse vos patterns, détecte vos erreurs récurrentes et vous propose des axes d'amélioration concrets.",
  },
  {
    icon: Shield,
    title: "Confidentialité totale",
    desc: "Vos données de trading sont privées et sécurisées. Nous ne vendons jamais vos informations à des tiers.",
  },
  {
    icon: Users,
    title: "Communauté de traders",
    desc: "Rejoignez une communauté active de traders qui partagent leurs analyses, challenges et stratégies.",
  },
  {
    icon: BarChart3,
    title: "35+ outils gratuits",
    desc: "Journal intelligent, analytics avancés, calendrier P&L, backtesting, market data live et bien plus.",
  },
  {
    icon: Zap,
    title: "Innovation continue",
    desc: "Nous améliorons MarketPhase chaque semaine grâce aux retours de notre communauté de +1 200 traders.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-icon.png" alt="MarketPhase" width={28} height={28} className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-gray-900">MarketPhase</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-900 transition">Blog</Link>
            <Link href="/features" className="text-sm text-gray-500 hover:text-gray-900 transition">Fonctionnalités</Link>
            <Link href="/register" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition">
              Commencer gratuitement
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            À propos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">MarketPhase</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            MarketPhase est né d&apos;un constat simple : les meilleurs outils d&apos;analyse de trading sont trop chers
            ou trop complexes. Notre mission est de rendre la performance accessible à tous les traders.
          </p>
        </section>

        {/* Story */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Notre histoire</h2>
                <p className="mt-4 text-gray-500 leading-relaxed">
                  Lancé en 2025, MarketPhase a été créé par une équipe de traders et développeurs passionnés.
                  Après des années à utiliser des journaux de trading coûteux et limités, nous avons décidé de
                  construire l&apos;outil que nous aurions voulu avoir dès le début.
                </p>
                <p className="mt-4 text-gray-500 leading-relaxed">
                  Aujourd&apos;hui, plus de 1 200 traders utilisent MarketPhase au quotidien pour analyser leurs
                  performances, identifier leurs forces et faiblesses, et progresser grâce à l&apos;intelligence
                  artificielle.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                  <p className="text-3xl font-bold text-blue-600">1 200+</p>
                  <p className="text-sm text-gray-400 mt-1">Traders actifs</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                  <p className="text-3xl font-bold text-blue-600">35+</p>
                  <p className="text-sm text-gray-400 mt-1">Outils gratuits</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                  <p className="text-3xl font-bold text-blue-600">100%</p>
                  <p className="text-sm text-gray-400 mt-1">Gratuit</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                  <p className="text-3xl font-bold text-blue-600">5</p>
                  <p className="text-sm text-gray-400 mt-1">Langues</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">Nos valeurs</h2>
          <p className="mt-4 text-gray-500 text-center max-w-xl mx-auto">
            Chaque décision que nous prenons est guidée par ces principes fondamentaux.
          </p>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <v.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{v.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Notre équipe</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              Une équipe réduite mais passionnée, composée de traders et d&apos;ingénieurs qui comprennent
              les besoins réels des traders particuliers.
            </p>
            <div className="mt-12 grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
              {[
                { role: "Fondateur & CEO", desc: "Trader actif depuis 8 ans, développeur full-stack" },
                { role: "Lead Developer", desc: "Spécialiste React, Next.js et architectures temps réel" },
                { role: "AI Engineer", desc: "Expert en machine learning appliqué à la finance" },
              ].map((m) => (
                <div key={m.role} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{m.role}</h3>
                  <p className="mt-2 text-sm text-gray-400">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Prêt à transformer votre trading ?
          </h2>
          <p className="mt-4 text-gray-500 max-w-lg mx-auto">
            Rejoignez plus de 1 200 traders qui utilisent MarketPhase pour analyser et améliorer leurs performances.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:shadow-xl hover:shadow-blue-500/20 transition-all hover:-translate-y-0.5"
            >
              Commencer gratuitement
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-gray-700 font-semibold px-8 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 transition"
            >
              Lire le blog
            </Link>
          </div>
        </section>
      </main>

      {/* Footer mini */}
      <footer className="border-t border-gray-100 py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">© 2026 MarketPhase. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <Link href="/mentions-legales" className="text-xs text-gray-400 hover:text-gray-900 transition">Mentions légales</Link>
            <Link href="/confidentialite" className="text-xs text-gray-400 hover:text-gray-900 transition">Confidentialité</Link>
            <Link href="/contact" className="text-xs text-gray-400 hover:text-gray-900 transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
