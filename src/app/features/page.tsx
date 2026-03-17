import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen, BarChart3, Brain, Shield, Activity, Play, Target, Zap, CalendarDays,
  TrendingUp, Gauge, Newspaper, Grid3x3, Camera, MessageCircle, Award, Calculator,
  Layers, GitCompare, FileBarChart, Upload, AlertOctagon, BookMarked, CheckSquare,
  Search, Eye, ArrowRight, Volume2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Fonctionnalités — 35+ Outils de Trading Professionnels",
  description:
    "Découvrez les 35+ outils de MarketPhase : journal intelligent, analytics avancés, AI Coach, market data live, gestion du risque, options flow, scanner de marché, et bien plus.",
  keywords: [
    "trading journal fonctionnalités", "outil trading gratuit", "analytics trading",
    "AI trading coach", "options flow", "market scanner", "journal de trading",
    "gestion risque trading", "trading journal features",
  ],
  openGraph: {
    title: "35+ Outils de Trading Professionnels — MarketPhase",
    description: "Journal de trading nouvelle génération avec IA, analytics avancés, market data live et gestion du risque.",
  },
};

const FEATURE_SECTIONS = [
  {
    title: "Journal & Analyse",
    description: "Enregistrez et analysez chaque trade en détail",
    features: [
      { icon: BookOpen, name: "Journal Intelligent", desc: "Enregistrez chaque trade avec émotions, screenshots, notes, tags et stratégies. Filtres avancés et tri personnalisé." },
      { icon: BarChart3, name: "Analytics Avancés", desc: "50+ métriques : Sharpe Ratio, Profit Factor, Drawdown, R-Multiple, distribution par heure, jour, session." },
      { icon: CalendarDays, name: "P&L Calendar", desc: "Calendrier mensuel et annuel coloré avec P&L par jour, performance par jour de la semaine et par heure." },
      { icon: Award, name: "Notation A-F", desc: "Système de grading automatique basé sur R:R, résultat, émotion et timing. Score de performance par trade." },
      { icon: Target, name: "Daily Bias", desc: "Enregistrez votre biais directionnel quotidien et comparez-le avec le résultat réel du marché." },
      { icon: Grid3x3, name: "Heatmap Performance", desc: "Visualisez vos performances par jour de semaine et par heure sous forme de heatmap interactive." },
    ],
  },
  {
    title: "Intelligence Artificielle",
    description: "L'IA analyse vos patterns et vous donne des insights personnalisés",
    features: [
      { icon: Brain, name: "AI Trade Coach", desc: "Détection automatique de patterns récurrents, suggestions personnalisées, score de discipline hebdomadaire." },
      { icon: AlertOctagon, name: "Détection d'Erreurs", desc: "Identification automatique d'erreurs courantes : trading le weekend, SL trop serré, revenge trading, surexposition." },
      { icon: Play, name: "Trade Replay", desc: "Rejouez vos trades en mode cinéma avec timeline interactive, mode What-If et annotations horodatées." },
      { icon: GitCompare, name: "Comparaison", desc: "Comparez 2 périodes côte à côte : semaine vs semaine, mois vs mois avec graphes superposés." },
    ],
  },
  {
    title: "Données de Marché",
    description: "Données temps réel pour prendre de meilleures décisions",
    features: [
      { icon: Activity, name: "Market Data Live", desc: "Données temps réel : cours, volumes, bid/ask, 52-week range pour stocks, indices et ETFs via MarketData.app." },
      { icon: Search, name: "Market Scanner", desc: "Détection automatique de breakouts, gaps, volume spikes et reversals sur 20+ instruments." },
      { icon: Eye, name: "Watchlist", desc: "Liste de surveillance personnalisée avec prix live, alertes de prix et mini sparklines." },
      { icon: Grid3x3, name: "Heatmap Sectorielle", desc: "Treemap style Finviz avec performance par secteur en temps réel. Vue treemap et table." },
      { icon: Gauge, name: "Volatility Dashboard", desc: "VIX, Fear & Greed, régime de marché (Risk-On/Off), instruments de volatilité et signaux automatiques." },
      { icon: Zap, name: "Options Flow", desc: "Flux d'options inhabituels, sweeps, blocks. Ratio Put/Call, premium par symbole et signaux bullish/bearish." },
      { icon: CalendarDays, name: "Earnings Calendar", desc: "Calendrier des résultats d'entreprises avec alertes si vous tradez un instrument qui publie bientôt." },
    ],
  },
  {
    title: "Marché & Macro",
    description: "Vue d'ensemble du contexte économique",
    features: [
      { icon: TrendingUp, name: "Rapport COT", desc: "Données COT de la CFTC : positionnement des commercials, large specs et small specs par instrument." },
      { icon: Gauge, name: "Sentiment", desc: "Indicateurs de sentiment : Fear & Greed Index, Put/Call ratio, VIX, Bull/Bear ratio." },
      { icon: Zap, name: "Force Devises", desc: "Score de force relative pour 8 devises majeures calculé en temps réel sur les paires croisées." },
      { icon: Newspaper, name: "News", desc: "Actualités financières en temps réel avec filtrage par catégorie et résumés IA." },
      { icon: CalendarDays, name: "Calendrier Économique", desc: "Événements macro à venir : NFP, CPI, FOMC, BCE avec impact attendu et résultats." },
    ],
  },
  {
    title: "Gestion du Risque & Discipline",
    description: "Protégez votre capital avec des outils intelligents",
    features: [
      { icon: Shield, name: "Risk Manager", desc: "Tableau de bord risque avec perte max journalière, drawdown courant, exposition et limites personnalisables." },
      { icon: Calculator, name: "Calculateur Position", desc: "Calculez la taille de position optimale selon votre capital, risque % et distance au SL." },
      { icon: CheckSquare, name: "Checklist Pré-Trade", desc: "Liste de règles à cocher avant chaque session. 4 catégories : risque, setup, mental, sortie." },
      { icon: BookMarked, name: "Playbook", desc: "Documentez vos setups avec conditions d'entrée/sortie, règles et statistiques par stratégie." },
      { icon: Layers, name: "Corrélation", desc: "Matrice de corrélation entre vos instruments pour détecter la double exposition." },
    ],
  },
  {
    title: "Outils & Productivité",
    description: "Tout pour optimiser votre workflow",
    features: [
      { icon: FileBarChart, name: "Recaps", desc: "Récapitulatifs hebdomadaires et mensuels automatiques avec stats clés et leçons apprises." },
      { icon: Camera, name: "Screenshots", desc: "Galerie de screenshots de vos trades avec upload drag & drop et liaison automatique." },
      { icon: MessageCircle, name: "Chat", desc: "Chat interne pour notes rapides, idées de trades et discussions." },
      { icon: Upload, name: "Import CSV", desc: "Importez vos trades depuis un fichier CSV avec mapping de colonnes automatique." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[--bg-primary] text-[--text-primary]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[--border-subtle]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[--text-primary]">MarketPhase</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] px-4 py-2">Se connecter</Link>
              <Link href="/register" className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 shadow-lg shadow-blue-500/25">
                Commencer Gratuitement
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">35+</span> Outils de Trading Professionnels
          </h1>
          <p className="mt-6 text-lg text-[--text-secondary] max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour analyser, améliorer et maîtriser votre trading. Gratuit, pour toujours.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      {FEATURE_SECTIONS.map((section) => (
        <section key={section.title} className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-[--text-primary]">{section.title}</h2>
              <p className="mt-2 text-[--text-secondary]">{section.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {section.features.map((feat) => (
                <div key={feat.name} className="metric-card rounded-2xl p-6 hover:border-blue-500/30 transition-all group">
                  <feat.icon className="w-8 h-8 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold text-[--text-primary] mb-2">{feat.name}</h3>
                  <p className="text-sm text-[--text-secondary] leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-[--text-primary] mb-4">
            Prêt à passer au niveau supérieur ?
          </h2>
          <p className="text-lg text-[--text-secondary] mb-8">
            Rejoignez MarketPhase — 35+ outils gratuits, pour toujours.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-base font-semibold text-white px-10 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 shadow-lg shadow-blue-500/25"
          >
            Créer Mon Compte Gratuit <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[--border-subtle] py-8 text-center">
        <p className="text-sm text-[--text-muted]">© 2026 MarketPhase. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
