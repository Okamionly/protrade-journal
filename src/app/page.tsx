import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  Zap,
  Trophy,
  Star,
  Target,
  Flame,
  Monitor,
  Layers,
  LineChart,
  Swords,
  CalendarDays,
  X,
  Users,
  Clock,
  Award,
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  Crosshair,
  Globe,
  Smartphone,
  ChevronDown,
} from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-hidden">
      {/* ==================== NAVBAR ==================== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">MarketPhase</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {["Fonctions", "Aperçu", "Comparatif", "Prix"].map((l, i) => (
                <a key={l} href={`#${["features", "preview", "compare", "pricing"][i]}`} className="text-sm text-gray-400 hover:text-white transition">{l}</a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:inline-flex text-sm text-gray-400 hover:text-white px-4 py-2 transition">Connexion</Link>
              <Link href="/register" className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                Commencer &rarr;
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ==================== HERO — Split Layout like TradeZella ==================== */}
      <section className="relative pt-24 pb-8 sm:pt-32 lg:pt-36 lg:pb-16">
        {/* Glow effects */}
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-500/20 via-cyan-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
            {/* Left — Text */}
            <div className="flex-1 max-w-2xl lg:max-w-none text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-sm font-medium mb-6">
                <Flame className="w-3.5 h-3.5" />
                N&deg;1 des journaux de trading gratuits
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-[1.05]">
                Tout ce que vous avez toujours{" "}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  voulu savoir
                </span>{" "}
                sur votre trading...
              </h1>

              {/* Sub */}
              <p className="mt-5 text-base sm:text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                MarketPhase vous montre les m&eacute;triques qui comptent &mdash; et les comportements qui m&egrave;nent au profit.
                35+ outils pro, IA, et analytics avanc&eacute;s.
              </p>

              {/* CTA */}
              <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start gap-4">
                <Link href="/register" className="group inline-flex items-center gap-2 text-base font-bold text-white px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:shadow-2xl hover:shadow-cyan-500/30 transition-all hover:-translate-y-0.5">
                  Commencer Gratuitement
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition py-4">
                  Tester le compte d&eacute;mo
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Social proof — like TradeZella */}
              <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                  </div>
                  <span className="text-sm text-gray-400 font-medium">4.9</span>
                </div>
                <span className="text-sm text-gray-500">+1 200 traders actifs</span>
                <div className="flex -space-x-2">
                  {["TK","SM","JP","AL","RD","MN"].map((a, i) => (
                    <div key={a} className="w-7 h-7 rounded-full border-2 border-[#0a0e1a] flex items-center justify-center text-[10px] font-bold text-white" style={{background: `hsl(${i*60+200}, 70%, 50%)`, zIndex: 6-i}}>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Hero Screenshot with gradient border */}
            <div className="flex-1 w-full lg:w-auto max-w-2xl">
              <div className="relative">
                {/* Gradient border glow */}
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl opacity-40 blur-sm" />
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-[#0d1220]">
                  <Image
                    src="/screenshots/dashboard.png"
                    alt="MarketPhase Dashboard"
                    width={1920}
                    height={1080}
                    className="w-full h-auto"
                    priority
                  />
                </div>
                {/* Floating card overlay — bottom right */}
                <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-8 p-3 sm:p-4 rounded-xl bg-[#0d1220]/95 backdrop-blur-sm border border-white/10 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Profit Factor</p>
                      <p className="text-lg font-black text-emerald-400">9.53</p>
                    </div>
                  </div>
                </div>
                {/* Floating card overlay — top right */}
                <div className="absolute -top-3 -right-3 sm:-top-5 sm:-right-6 p-3 sm:p-4 rounded-xl bg-[#0d1220]/95 backdrop-blur-sm border border-white/10 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">AI Score</p>
                      <p className="text-lg font-black text-cyan-400">82/100</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURE TABS — Like TradeZella Carousel ==================== */}
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab icons — horizontal scrollable on mobile */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-8 overflow-x-auto pb-4 scrollbar-hide">
            {[
              { icon: BarChart3, label: "Analytics" },
              { icon: BookOpen, label: "Journal" },
              { icon: Brain, label: "AI Coach" },
              { icon: Monitor, label: "War Room" },
              { icon: LineChart, label: "Backtesting" },
              { icon: Play, label: "Replay" },
              { icon: Swords, label: "Challenges" },
            ].map((tab, i) => (
              <div key={tab.label} className={`flex flex-col items-center gap-2 px-3 sm:px-4 py-3 rounded-xl cursor-pointer transition-all min-w-[70px] sm:min-w-[80px] ${i === 0 ? "bg-white/5 border border-cyan-500/30" : "hover:bg-white/[0.02] border border-transparent"}`}>
                <tab.icon className={`w-6 h-6 ${i === 0 ? "text-cyan-400" : "text-gray-500"}`} />
                <span className={`text-xs font-medium whitespace-nowrap ${i === 0 ? "text-white" : "text-gray-500"}`}>{tab.label}</span>
              </div>
            ))}
          </div>

          {/* Large screenshot showcase */}
          <div className="mt-6 sm:mt-8 relative max-w-6xl mx-auto">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/15 via-cyan-400/15 to-emerald-400/15 rounded-3xl blur-xl" />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
              <Image
                src="/screenshots/analytics.png"
                alt="MarketPhase Analytics"
                width={1920}
                height={1080}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STATS COUNTER — Like TradeZella ==================== */}
      <section className="py-12 sm:py-16 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { value: "35+", label: "Outils Pro", sub: "Analyse, IA, Market Data" },
              { value: "0€", label: "Pour Toujours", sub: "Aucun plan payant" },
              { value: "1.2K+", label: "Traders Actifs", sub: "Communauté croissante" },
              { value: "24/7", label: "Market Data", sub: "Cours en temps réel" },
            ].map((s) => (
              <div key={s.label} className="p-4 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{s.value}</span>
                <p className="text-sm sm:text-base font-semibold text-white mt-2">{s.label}</p>
                <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== NUMBERED SECTIONS — Like TradeZella 1→6 ==================== */}
      <section id="preview" className="py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24 sm:space-y-32">

          {/* Section 1 — Journal */}
          <div className="relative">
            <span className="absolute -top-4 left-0 text-[120px] sm:text-[180px] font-black text-white/[0.02] leading-none select-none pointer-events-none">1</span>
            <div className="relative">
              <p className="text-blue-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">JOURNAL AUTOMATISÉ</p>
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-4">
                Un journal de trading<br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">puissant et automatisé</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-400 max-w-2xl mb-8 sm:mb-12 leading-relaxed">
                Enregistrez vos trades avec émotions, screenshots, tags et notes.
                Analysez tout avec des statistiques avancées générées automatiquement.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-12">
                {[
                  { icon: BookOpen, title: "Journal Complet", desc: "Émotions, notes, screenshots, tags pour chaque trade" },
                  { icon: BarChart3, title: "Stats Automatiques", desc: "Win rate, R:R, profit factor calculés en temps réel" },
                  { icon: CalendarDays, title: "Calendrier P&L", desc: "Visualisez vos gains et pertes jour par jour" },
                ].map(c => (
                  <div key={c.title} className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/10">
                    <c.icon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mb-3" />
                    <h4 className="font-bold text-white text-sm sm:text-base mb-1">{c.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-500">{c.desc}</p>
                  </div>
                ))}
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                <Image src="/screenshots/dashboard.png" alt="Journal" width={1920} height={1080} className="w-full h-auto" />
              </div>
            </div>
          </div>

          {/* Section 2 — Analytics */}
          <div className="relative">
            <span className="absolute -top-4 right-0 text-[120px] sm:text-[180px] font-black text-white/[0.02] leading-none select-none pointer-events-none">2</span>
            <div className="relative">
              <p className="text-purple-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">ANALYSE AVANCÉE</p>
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-4">
                Analysez vos<br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">statistiques de trading</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-400 max-w-2xl mb-8 sm:mb-12 leading-relaxed">
                Comprenez vos erreurs, identifiez vos forces.
                Sortino, Calmar, drawdown, corrélation — tout est calculé pour vous.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-12">
                {[
                  { icon: Activity, title: "50+ Métriques", desc: "Sharpe, Sortino, Calmar, Profit Factor, drawdown..." },
                  { icon: Layers, title: "Corrélation", desc: "Matrice de Pearson entre vos actifs tradés" },
                  { icon: Target, title: "Score & Notation", desc: "Note globale A-F avec sous-scores détaillés" },
                ].map(c => (
                  <div key={c.title} className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-purple-500/5 to-violet-500/5 border border-purple-500/10">
                    <c.icon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mb-3" />
                    <h4 className="font-bold text-white text-sm sm:text-base mb-1">{c.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-500">{c.desc}</p>
                  </div>
                ))}
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                <Image src="/screenshots/analytics.png" alt="Analytics" width={1920} height={1080} className="w-full h-auto" />
              </div>
            </div>
          </div>

          {/* Section 3 — AI Coach */}
          <div className="relative">
            <span className="absolute -top-4 left-0 text-[120px] sm:text-[180px] font-black text-white/[0.02] leading-none select-none pointer-events-none">3</span>
            <div className="relative">
              <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">INTELLIGENCE ARTIFICIELLE</p>
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-4">
                Un coach IA qui<br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">comprend votre trading</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-400 max-w-2xl mb-8 sm:mb-12 leading-relaxed">
                Détection de patterns dans VOS données. Score de discipline. Alertes overtrading.
                Performance decay. Meilleure fenêtre de trading. Tout est personnalisé.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-12">
                {[
                  { icon: Brain, title: "Détection de Patterns", desc: "L'IA trouve des tendances invisibles dans vos trades" },
                  { icon: Crosshair, title: "Score Discipline", desc: "Note sur 100 basée sur vos règles et habitudes" },
                  { icon: Sparkles, title: "Insights Personnalisés", desc: "Conseils uniques basés sur votre historique" },
                ].map(c => (
                  <div key={c.title} className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/10">
                    <c.icon className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 mb-3" />
                    <h4 className="font-bold text-white text-sm sm:text-base mb-1">{c.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-500">{c.desc}</p>
                  </div>
                ))}
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                <Image src="/screenshots/ai-coach.png" alt="AI Coach" width={1920} height={1080} className="w-full h-auto" />
              </div>
            </div>
          </div>

          {/* Section 4 — War Room */}
          <div className="relative">
            <span className="absolute -top-4 right-0 text-[120px] sm:text-[180px] font-black text-white/[0.02] leading-none select-none pointer-events-none">4</span>
            <div className="relative">
              <p className="text-amber-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">CENTRE DE COMMANDE</p>
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-4">
                Votre{" "}
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">War Room</span>
                <br className="hidden sm:block" /> en temps réel
              </h2>
              <p className="text-sm sm:text-base text-gray-400 max-w-2xl mb-8 sm:mb-12 leading-relaxed">
                P&L live, sessions de marché actives, checklist du jour, mood tracker,
                gauges de performance. Comme un Bloomberg Terminal, mais pour vous.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
                {[
                  { icon: Monitor, label: "P&L Live" },
                  { icon: Clock, label: "Sessions" },
                  { icon: Shield, label: "Checklist" },
                  { icon: Activity, label: "Gauges" },
                ].map(c => (
                  <div key={c.label} className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10">
                    <c.icon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                    <span className="text-xs sm:text-sm font-semibold text-white">{c.label}</span>
                  </div>
                ))}
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                <Image src="/screenshots/war-room.png" alt="War Room" width={1920} height={1080} className="w-full h-auto" />
              </div>
            </div>
          </div>

          {/* Section 5 — Backtesting */}
          <div className="relative">
            <span className="absolute -top-4 left-0 text-[120px] sm:text-[180px] font-black text-white/[0.02] leading-none select-none pointer-events-none">5</span>
            <div className="relative">
              <p className="text-rose-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">BACKTESTING & SIMULATION</p>
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-4">
                Et si vous aviez{" "}
                <span className="bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">tradé différemment</span> ?
              </h2>
              <p className="text-sm sm:text-base text-gray-400 max-w-2xl mb-8 sm:mb-12 leading-relaxed">
                Modifiez votre SL, TP, taille, nombre de trades. Voyez l&apos;impact instantanément.
                Comparez Actual vs Simulated avec une equity curve interactive.
              </p>

              <div className="flex flex-wrap gap-3 mb-8 sm:mb-12">
                {["Modifier le TP", "Ajuster le SL", "Max trades/jour", "Position sizing", "Best strategy only", "Sans revenge trading"].map(s => (
                  <span key={s} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm font-medium">{s}</span>
                ))}
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                <Image src="/screenshots/backtest.png" alt="Backtesting" width={1920} height={1080} className="w-full h-auto" />
              </div>
            </div>
          </div>

          {/* Section 6 — Gamification */}
          <div className="relative">
            <span className="absolute -top-4 right-0 text-[120px] sm:text-[180px] font-black text-white/[0.02] leading-none select-none pointer-events-none">6</span>
            <div className="relative">
              <p className="text-cyan-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">COMMUNAUTÉ & GAMIFICATION</p>
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-4">
                Restez{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">motivé et discipliné</span>
                <br className="hidden sm:block" /> chaque jour
              </h2>
              <p className="text-sm sm:text-base text-gray-400 max-w-2xl mb-8 sm:mb-12 leading-relaxed">
                Challenges actifs, badges, système XP, niveaux, leaderboard.
                Parce que la discipline est la clé — et la gamification la rend fun.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-8 sm:mb-12">
                {[
                  { icon: Swords, title: "Challenges Actifs", desc: "8 challenges avec progression temps réel" },
                  { icon: Trophy, title: "Leaderboard", desc: "Classement communautaire anonymisé" },
                  { icon: Award, title: "Badges & XP", desc: "11 badges à débloquer, système de niveaux" },
                  { icon: MessageSquare, title: "Chat Trading", desc: "Échangez avec d'autres traders en temps réel" },
                ].map(c => (
                  <div key={c.title} className="flex items-start gap-4 p-4 sm:p-5 rounded-xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/10">
                    <c.icon className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base mb-1">{c.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-500">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                <Image src="/screenshots/challenges.png" alt="Challenges" width={1920} height={1080} className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== ALL FEATURES GRID ==================== */}
      <section id="features" className="py-16 sm:py-24 scroll-mt-20 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-cyan-400 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3">Fonctionnalités</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">35+ outils. Zéro compromis.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: BookOpen, title: "Journal", desc: "Émotions, screenshots, tags, notes" },
              { icon: BarChart3, title: "Analytics", desc: "Sharpe, Profit Factor, Drawdown, R-Multiple" },
              { icon: Brain, title: "AI Coach", desc: "Patterns, discipline, insights personnalisés" },
              { icon: Monitor, title: "War Room", desc: "P&L live, sessions, checklist, gauges" },
              { icon: Play, title: "Trade Replay", desc: "Rejouez vos trades avec analyse « Et si »" },
              { icon: LineChart, title: "Backtesting", desc: "Simulez SL, TP, taille, stratégie" },
              { icon: Swords, title: "Challenges", desc: "Badges, XP, niveaux, streaks" },
              { icon: Layers, title: "Corrélation", desc: "Matrice de Pearson, diversification" },
              { icon: CalendarDays, title: "P&L Calendar", desc: "Calendrier visuel gains/pertes" },
              { icon: Activity, title: "Market Data", desc: "Cours live, scanner, watchlist" },
              { icon: Shield, title: "Risk Manager", desc: "Calculateur, alertes, limites" },
              { icon: Trophy, title: "Leaderboard", desc: "Classement, podium, records" },
              { icon: Target, title: "Score & Notation", desc: "Note A-F, sous-scores, tendances" },
              { icon: Award, title: "Rapports PDF", desc: "Génération automatique, impression" },
              { icon: LayoutDashboard, title: "Dashboard Custom", desc: "10 widgets, 3 presets, drag & drop" },
            ].map((f) => (
              <div key={f.title} className="group flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all">
                <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-400/20 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-cyan-400/30 transition">
                  <f.icon className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm sm:text-base mb-0.5">{f.title}</h4>
                  <p className="text-xs sm:text-sm text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== COMPARISON ==================== */}
      <section id="compare" className="py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-cyan-400 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3">Comparatif</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">
              Pourquoi payer<br /><span className="text-gray-500">quand c&apos;est mieux gratuit ?</span>
            </h2>
          </div>

          {/* Mobile-friendly comparison */}
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-gray-500 font-medium w-1/4"></th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                    <div className="inline-flex items-center gap-1.5 sm:gap-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center"><TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" /></div>
                      <span className="font-bold text-white text-xs sm:text-sm">MarketPhase</span>
                    </div>
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-gray-500 font-medium">TradeZella</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-gray-500 font-medium">Tradervue</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { f: "Prix mensuel", mp: "Gratuit", tz: "49$/mois", tv: "49$/mois" },
                  { f: "Nombre d'outils", mp: "35+", tz: "~15", tv: "~10" },
                  { f: "AI Coach", mp: true, tz: false, tv: false },
                  { f: "War Room", mp: true, tz: false, tv: false },
                  { f: "Backtesting What-If", mp: true, tz: false, tv: false },
                  { f: "Gamification / XP", mp: true, tz: false, tv: false },
                  { f: "Corrélation Matrix", mp: true, tz: false, tv: false },
                  { f: "Market Data Live", mp: true, tz: false, tv: false },
                  { f: "Trade Replay", mp: true, tz: true, tv: false },
                  { f: "3 Thèmes", mp: true, tz: false, tv: false },
                ].map((r) => (
                  <tr key={r.f} className="border-b border-white/5 last:border-0">
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 text-gray-300 font-medium text-xs sm:text-sm">{r.f}</td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 text-center">
                      {typeof r.mp === "string" ? <span className="font-bold text-emerald-400 text-xs sm:text-sm">{r.mp}</span> : r.mp ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mx-auto" />}
                    </td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 text-center">
                      {typeof r.tz === "string" ? <span className="text-rose-400 font-medium text-xs sm:text-sm">{r.tz}</span> : r.tz ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mx-auto" /> : <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 mx-auto" />}
                    </td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 text-center">
                      {typeof r.tv === "string" ? <span className="text-rose-400 font-medium text-xs sm:text-sm">{r.tv}</span> : r.tv ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mx-auto" /> : <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-[#0a0e1a] via-[#0d1225] to-[#0a0e1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-cyan-400 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3">Témoignages</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">
              Fait pour{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">chaque trader</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-500">Des traders du monde entier utilisent MarketPhase.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { name: "Thomas K.", role: "Day Trader Forex", text: "J'ai quitté TradeZella pour MarketPhase. Plus de fonctionnalités, gratuit, et l'AI Coach m'a fait gagner 15% de win rate en 2 mois.", avatar: "TK", color: "from-blue-500 to-cyan-500" },
              { name: "Sarah M.", role: "Swing Trader Actions", text: "Le War Room est incroyable. P&L live, sessions, checklist. C'est mon cockpit trading quotidien. Je ne reviendrai jamais en arrière.", avatar: "SM", color: "from-purple-500 to-violet-500" },
              { name: "Julien P.", role: "Scalper Indices", text: "Les challenges et badges me motivent à rester discipliné. Mon profit factor est passé de 1.2 à 2.1 en 3 mois. Merci MarketPhase.", avatar: "JP", color: "from-emerald-500 to-cyan-500" },
            ].map((t) => (
              <div key={t.name} className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition">
                <div className="flex items-center gap-1 mb-4 sm:mb-5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-gray-300 leading-relaxed mb-5 sm:mb-6 text-sm sm:text-base">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs sm:text-sm font-bold`}>{t.avatar}</div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRICING ==================== */}
      <section id="pricing" className="py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto text-center">
            <p className="text-cyan-400 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">Gratuit. Point final.</h2>
            <p className="text-gray-400 text-sm sm:text-lg mb-10 sm:mb-12">Pas de plan Pro. Pas de trial. Pas de carte bancaire. Tout est inclus.</p>

            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-3xl blur-sm opacity-30" />
              <div className="relative rounded-3xl p-6 sm:p-10 bg-[#0d1220] border border-white/10">
                <div className="text-5xl sm:text-6xl font-black mb-1">0&euro;</div>
                <p className="text-gray-500 mb-6 sm:mb-8 text-sm sm:text-base">/ mois &mdash; pour toujours</p>
                <div className="w-full h-px bg-white/10 mb-6 sm:mb-8" />
                <ul className="space-y-2.5 sm:space-y-3 text-left mb-8 sm:mb-10">
                  {["35+ outils professionnels", "AI Trade Coach", "War Room temps réel", "Backtesting & Replay", "Challenges & Gamification", "Market Data live", "Stockage illimité", "Mises à jour continues"].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 sm:gap-3">
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-gray-300 text-xs sm:text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="group w-full inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:shadow-xl hover:shadow-cyan-500/25 transition-all">
                  Créer mon compte gratuit
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 sm:mb-6">
            Arrêtez de payer.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Commencez à performer.
            </span>
          </h2>
          <p className="text-sm sm:text-lg text-gray-400 mb-8 sm:mb-10 max-w-xl mx-auto">
            Le journal de trading le plus complet du marché est gratuit. Il n&apos;y a aucune raison de ne pas essayer.
          </p>
          <Link href="/register" className="group inline-flex items-center gap-2 text-base sm:text-lg font-bold text-white px-8 sm:px-10 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:shadow-2xl hover:shadow-cyan-500/30 transition-all hover:-translate-y-1">
            Commencer Maintenant &mdash; C&apos;est Gratuit
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-white/5 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold">MarketPhase</span>
              </div>
              <p className="text-xs text-gray-600 max-w-xs">
                Le journal de trading gratuit le plus complet. 35+ outils, IA, market data, gamification.
              </p>
            </div>
            {/* Links */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Produit</h5>
                <ul className="space-y-2">
                  {[{l:"Fonctions",h:"#features"},{l:"Aperçu",h:"#preview"},{l:"Prix",h:"#pricing"},{l:"Comparatif",h:"#compare"}].map(i => (
                    <li key={i.l}><a href={i.h} className="text-xs text-gray-500 hover:text-white transition">{i.l}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Compte</h5>
                <ul className="space-y-2">
                  {[{l:"Connexion",h:"/login"},{l:"Inscription",h:"/register"},{l:"Compte Démo",h:"/login"}].map(i => (
                    <li key={i.l}><Link href={i.h} className="text-xs text-gray-500 hover:text-white transition">{i.l}</Link></li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Social */}
            <div className="flex flex-col items-start sm:items-end gap-4">
              <div className="flex items-center gap-3">
                <a href="https://twitter.com/marketphase" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
                  <Globe className="w-4 h-4 text-gray-400" />
                </a>
              </div>
              <p className="text-xs text-gray-600">&copy; 2026 MarketPhase. Tous droits réservés.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
