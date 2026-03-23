import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen, BarChart3, Brain, Shield, Activity, Play, Target, Zap, CalendarDays,
  TrendingUp, Gauge, Newspaper, Grid3x3, Camera, MessageCircle, Award, Calculator,
  Layers, GitCompare, FileBarChart, Upload, AlertOctagon, BookMarked, CheckSquare,
  Search, Eye, ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "35+ Outils de Trading Gratuits | MarketPhase",
  description:
    "Decouvrez les 35+ outils trading gratuit de MarketPhase : journal intelligent, analytics avances, AI Coach, market data live, gestion du risque, options flow, scanner de marche.",
  keywords: [
    "outils trading gratuit",
    "trading journal fonctionnalites",
    "outil trading gratuit",
    "analytics trading",
    "AI trading coach",
    "options flow",
    "market scanner",
    "journal de trading",
    "gestion risque trading",
    "trading journal features",
    "journal de trading gratuit",
  ],
  alternates: {
    canonical: "https://marketphase.vercel.app/features",
  },
  openGraph: {
    title: "35+ Outils de Trading Gratuits | MarketPhase",
    description:
      "Journal de trading nouvelle generation avec IA, analytics avances, market data live et gestion du risque. 100% gratuit.",
  },
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Comment utiliser un journal de trading",
  description:
    "Guide etape par etape pour utiliser MarketPhase, le journal de trading gratuit avec IA, et ameliorer vos performances de trading.",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Creer un compte gratuit",
      text: "Inscrivez-vous gratuitement sur MarketPhase en quelques secondes avec votre email ou compte Google.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Enregistrer vos trades",
      text: "Ajoutez vos trades manuellement ou importez-les via CSV. Renseignez le prix d'entree, de sortie, la taille, le stop-loss et vos notes.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Analyser vos performances",
      text: "Consultez vos analytics : win rate, profit factor, drawdown, P&L calendar, heatmaps et 50+ metriques avancees.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Recevoir des insights IA",
      text: "L'AI Coach analyse vos patterns, detecte vos erreurs recurrentes et vous donne des recommandations personnalisees pour progresser.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Ameliorer votre discipline",
      text: "Utilisez la checklist pre-trade, le playbook et le risk manager pour renforcer votre discipline et proteger votre capital.",
    },
  ],
};

const FEATURE_SECTIONS = [
  {
    title: "Journal & Analyse",
    description: "Enregistrez et analysez chaque trade en detail",
    features: [
      { icon: BookOpen, name: "Journal Intelligent", desc: "Enregistrez chaque trade avec emotions, screenshots, notes, tags et strategies. Filtres avances et tri personnalise." },
      { icon: BarChart3, name: "Analytics Avances", desc: "50+ metriques : Sharpe Ratio, Profit Factor, Drawdown, R-Multiple, distribution par heure, jour, session." },
      { icon: CalendarDays, name: "P&L Calendar", desc: "Calendrier mensuel et annuel colore avec P&L par jour, performance par jour de la semaine et par heure." },
      { icon: Award, name: "Notation A-F", desc: "Systeme de grading automatique base sur R:R, resultat, emotion et timing. Score de performance par trade." },
      { icon: Target, name: "Daily Bias", desc: "Enregistrez votre biais directionnel quotidien et comparez-le avec le resultat reel du marche." },
      { icon: Grid3x3, name: "Heatmap Performance", desc: "Visualisez vos performances par jour de semaine et par heure sous forme de heatmap interactive." },
    ],
  },
  {
    title: "Intelligence Artificielle",
    description: "L'IA analyse vos patterns et vous donne des insights personnalises",
    features: [
      { icon: Brain, name: "AI Trade Coach", desc: "Detection automatique de patterns recurrents, suggestions personnalisees, score de discipline hebdomadaire." },
      { icon: AlertOctagon, name: "Detection d'Erreurs", desc: "Identification automatique d'erreurs courantes : trading le weekend, SL trop serre, revenge trading, surexposition." },
      { icon: Play, name: "Trade Replay", desc: "Rejouez vos trades en mode cinema avec timeline interactive, mode What-If et annotations horodatees." },
      { icon: GitCompare, name: "Comparaison", desc: "Comparez 2 periodes cote a cote : semaine vs semaine, mois vs mois avec graphes superposes." },
    ],
  },
  {
    title: "Donnees de Marche",
    description: "Donnees temps reel pour prendre de meilleures decisions",
    features: [
      { icon: Activity, name: "Market Data Live", desc: "Donnees temps reel : cours, volumes, bid/ask, 52-week range pour stocks, indices et ETFs via MarketData.app." },
      { icon: Search, name: "Market Scanner", desc: "Detection automatique de breakouts, gaps, volume spikes et reversals sur 20+ instruments." },
      { icon: Eye, name: "Watchlist", desc: "Liste de surveillance personnalisee avec prix live, alertes de prix et mini sparklines." },
      { icon: Grid3x3, name: "Heatmap Sectorielle", desc: "Treemap style Finviz avec performance par secteur en temps reel. Vue treemap et table." },
      { icon: Gauge, name: "Volatility Dashboard", desc: "VIX, Fear & Greed, regime de marche (Risk-On/Off), instruments de volatilite et signaux automatiques." },
      { icon: Zap, name: "Options Flow", desc: "Flux d'options inhabituels, sweeps, blocks. Ratio Put/Call, premium par symbole et signaux bullish/bearish." },
      { icon: CalendarDays, name: "Earnings Calendar", desc: "Calendrier des resultats d'entreprises avec alertes si vous tradez un instrument qui publie bientot." },
    ],
  },
  {
    title: "Marche & Macro",
    description: "Vue d'ensemble du contexte economique",
    features: [
      { icon: TrendingUp, name: "Rapport COT", desc: "Donnees COT de la CFTC : positionnement des commercials, large specs et small specs par instrument." },
      { icon: Gauge, name: "Sentiment", desc: "Indicateurs de sentiment : Fear & Greed Index, Put/Call ratio, VIX, Bull/Bear ratio." },
      { icon: Zap, name: "Force Devises", desc: "Score de force relative pour 8 devises majeures calcule en temps reel sur les paires croisees." },
      { icon: Newspaper, name: "News", desc: "Actualites financieres en temps reel avec filtrage par categorie et resumes IA." },
      { icon: CalendarDays, name: "Calendrier Economique", desc: "Evenements macro a venir : NFP, CPI, FOMC, BCE avec impact attendu et resultats." },
    ],
  },
  {
    title: "Gestion du Risque & Discipline",
    description: "Protegez votre capital avec des outils intelligents",
    features: [
      { icon: Shield, name: "Risk Manager", desc: "Tableau de bord risque avec perte max journaliere, drawdown courant, exposition et limites personnalisables." },
      { icon: Calculator, name: "Calculateur Position", desc: "Calculez la taille de position optimale selon votre capital, risque % et distance au SL." },
      { icon: CheckSquare, name: "Checklist Pre-Trade", desc: "Liste de regles a cocher avant chaque session. 4 categories : risque, setup, mental, sortie." },
      { icon: BookMarked, name: "Playbook", desc: "Documentez vos setups avec conditions d'entree/sortie, regles et statistiques par strategie." },
      { icon: Layers, name: "Correlation", desc: "Matrice de correlation entre vos instruments pour detecter la double exposition." },
    ],
  },
  {
    title: "Outils & Productivite",
    description: "Tout pour optimiser votre workflow",
    features: [
      { icon: FileBarChart, name: "Recaps", desc: "Recapitulatifs hebdomadaires et mensuels automatiques avec stats cles et lecons apprises." },
      { icon: Camera, name: "Screenshots", desc: "Galerie de screenshots de vos trades avec upload drag & drop et liaison automatique." },
      { icon: MessageCircle, name: "Chat", desc: "Chat interne pour notes rapides, idees de trades et discussions." },
      { icon: Upload, name: "Import CSV", desc: "Importez vos trades depuis un fichier CSV avec mapping de colonnes automatique." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">MarketPhase</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 px-4 py-2">
                Se connecter
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 shadow-lg shadow-blue-500/25"
              >
                Commencer Gratuitement
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 text-center bg-gradient-to-b from-blue-50/50 to-white">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">35+</span>{" "}
            Outils de Trading Gratuits
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour analyser, ameliorer et maitriser votre trading. Gratuit, pour toujours.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      {FEATURE_SECTIONS.map((section, sectionIdx) => (
        <section key={section.title} className={`py-16 ${sectionIdx % 2 === 1 ? "bg-gray-50/50" : "bg-white"}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{section.title}</h2>
              <p className="mt-2 text-gray-500">{section.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {section.features.map((feat) => (
                <div
                  key={feat.name}
                  className="rounded-2xl p-6 bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all group"
                >
                  <feat.icon className="w-8 h-8 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feat.name}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* HowTo Section */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50/50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-4">
            Comment utiliser un journal de trading
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            5 etapes simples pour ameliorer vos performances avec MarketPhase
          </p>
          <div className="space-y-6">
            {[
              { step: "1", title: "Creer un compte gratuit", desc: "Inscrivez-vous gratuitement en quelques secondes avec votre email ou compte Google." },
              { step: "2", title: "Enregistrer vos trades", desc: "Ajoutez vos trades manuellement ou importez-les via CSV avec mapping automatique." },
              { step: "3", title: "Analyser vos performances", desc: "Consultez vos analytics : win rate, profit factor, drawdown, P&L calendar et 50+ metriques." },
              { step: "4", title: "Recevoir des insights IA", desc: "L'AI Coach detecte vos erreurs et vous donne des recommandations personnalisees." },
              { step: "5", title: "Ameliorer votre discipline", desc: "Utilisez la checklist pre-trade, le playbook et le risk manager pour progresser." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Pret a passer au niveau superieur ?
          </h2>
          <p className="text-lg text-gray-500 mb-8">
            Rejoignez MarketPhase — 35+ outils gratuits, pour toujours.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-base font-semibold text-white px-10 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 shadow-lg shadow-blue-500/25"
          >
            Creer Mon Compte Gratuit <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center bg-white">
        <p className="text-sm text-gray-400">&copy; 2026 MarketPhase. Tous droits reserves.</p>
      </footer>
    </div>
  );
}
