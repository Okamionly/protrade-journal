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
  Sparkles,
  Zap,
  Trophy,
  Users,
  Star,
  Target,
  Flame,
  Globe,
  Monitor,
  Layers,
  Clock,
  Award,
  LineChart,
  Swords,
  CalendarDays,
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
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[--text-primary]">MarketPhase</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors">Fonctions</a>
              <a href="#demo" className="text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors">Demo</a>
              <a href="#testimonials" className="text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors">Avis</a>
              <a href="#pricing" className="text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors">Prix</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:inline-flex text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors px-4 py-2">Se connecter</Link>
              <Link href="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
                Essayer Gratuit
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-violet-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[--text-secondary] mb-8 animate-pulse">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>+1 200 traders nous font confiance</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight text-[--text-primary] max-w-5xl mx-auto leading-[1.1]">
            Le Trading Journal qui{" "}
            <span className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              surpasse tout
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[--text-secondary] max-w-2xl mx-auto leading-relaxed">
            35+ outils pro, AI Coach, War Room, Backtesting, Gamification.
            Tout ce que TradeZella facture 50$/mois, MarketPhase vous l&apos;offre gratuitement.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="inline-flex items-center gap-2 text-base font-semibold text-white px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5">
              Commencer Gratuitement <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 text-base font-semibold text-[--text-secondary] px-8 py-4 rounded-xl border border-[--border] hover:border-[--text-muted] hover:text-[--text-primary] transition-all">
              Essayer le compte Demo <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: "35+", label: "Outils Pro" },
              { value: "0€", label: "Pour toujours" },
              { value: "AI", label: "Coach Intelligent" },
              { value: "Live", label: "Market Data" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl px-6 py-4 text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-sm text-[--text-muted] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== APP SHOWCASE ==================== */}
      <section id="demo" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[--text-primary]">
              Votre{" "}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">cockpit de trading</span>
            </h2>
            <p className="mt-4 text-lg text-[--text-secondary]">Un aper&ccedil;u de la puissance de MarketPhase</p>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative max-w-6xl mx-auto">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-3xl blur-md opacity-20" />
            <div className="relative glass rounded-3xl p-1 overflow-hidden">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[--border-subtle]">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <div className="flex-1 text-center text-xs text-[--text-muted] font-medium">marketphase.vercel.app/dashboard</div>
              </div>

              {/* Fake Dashboard Content */}
              <div className="bg-[--bg-primary] p-6">
                {/* Top Stats Row */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Balance Totale", value: "39,925.88", prefix: "€", color: "text-[--text-primary]" },
                    { label: "Profit Net", value: "+14,925.88", prefix: "€", color: "text-emerald-400" },
                    { label: "Win Rate", value: "53.9%", prefix: "", color: "text-cyan-400" },
                    { label: "Trades ce mois", value: "102", prefix: "", color: "text-[--text-primary]" },
                  ].map((s) => (
                    <div key={s.label} className="glass rounded-xl p-4">
                      <p className="text-xs text-[--text-muted]">{s.label}</p>
                      <p className={`text-xl font-bold mono mt-1 ${s.color}`}>{s.prefix}{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Equity Curve */}
                  <div className="glass rounded-xl p-4">
                    <p className="text-xs font-semibold text-[--text-secondary] mb-3">Courbe d&apos;Equity</p>
                    <svg viewBox="0 0 400 120" className="w-full">
                      <defs>
                        <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,100 L30,95 L60,88 L90,92 L120,80 L150,75 L180,60 L210,55 L240,50 L270,42 L300,35 L330,28 L360,20 L400,10" fill="url(#eq-grad)" stroke="none" />
                      <path d="M0,100 L30,95 L60,88 L90,92 L120,80 L150,75 L180,60 L210,55 L240,50 L270,42 L300,35 L330,28 L360,20 L400,10" fill="none" stroke="#22d3ee" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Strategy Pie */}
                  <div className="glass rounded-xl p-4">
                    <p className="text-xs font-semibold text-[--text-secondary] mb-3">Performance par Strat&eacute;gie</p>
                    <div className="flex items-center justify-center gap-6">
                      <svg viewBox="0 0 100 100" className="w-24 h-24">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#22d3ee" strokeWidth="12" strokeDasharray="75 176" strokeDashoffset="0" transform="rotate(-90 50 50)" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" strokeWidth="12" strokeDasharray="50 201" strokeDashoffset="-75" transform="rotate(-90 50 50)" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray="40 211" strokeDashoffset="-125" transform="rotate(-90 50 50)" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="30 221" strokeDashoffset="-165" transform="rotate(-90 50 50)" />
                      </svg>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-cyan-400" /><span className="text-[--text-muted]">Breakout 38%</span></div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-violet-500" /><span className="text-[--text-muted]">Trend 25%</span></div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500" /><span className="text-[--text-muted]">S&amp;D 20%</span></div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /><span className="text-[--text-muted]">Scalping 17%</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trade Table */}
                <div className="glass rounded-xl p-4">
                  <p className="text-xs font-semibold text-[--text-secondary] mb-3">Trades R&eacute;cents</p>
                  <div className="overflow-hidden rounded-lg" style={{ border: "1px solid var(--border)" }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[--border]">
                          <th className="text-left px-3 py-2 text-[--text-muted] font-medium">Date</th>
                          <th className="text-left px-3 py-2 text-[--text-muted] font-medium">Actif</th>
                          <th className="text-left px-3 py-2 text-[--text-muted] font-medium">Type</th>
                          <th className="text-right px-3 py-2 text-[--text-muted] font-medium">R:R</th>
                          <th className="text-right px-3 py-2 text-[--text-muted] font-medium">P&amp;L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { date: "18/03", asset: "EUR/USD", type: "LONG", rr: "1:3.0", pnl: "+2000€", win: true },
                          { date: "16/03", asset: "GOLD", type: "SHORT", rr: "1:2.5", pnl: "+1165€", win: true },
                          { date: "16/03", asset: "NAS100", type: "LONG", rr: "1:1.8", pnl: "+890€", win: true },
                          { date: "15/03", asset: "AAPL", type: "SHORT", rr: "1:0.7", pnl: "-85€", win: false },
                        ].map((t, i) => (
                          <tr key={i} className="border-b border-[--border] last:border-0">
                            <td className="px-3 py-2 text-[--text-secondary]">{t.date}</td>
                            <td className="px-3 py-2 font-semibold text-[--text-primary]">{t.asset}</td>
                            <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.type === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>{t.type}</span></td>
                            <td className="px-3 py-2 text-right mono text-blue-400">{t.rr}</td>
                            <td className={`px-3 py-2 text-right mono font-bold ${t.win ? "text-emerald-400" : "text-rose-400"}`}>{t.pnl}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section id="features" className="py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[--text-secondary] mb-6">
              <Zap className="w-4 h-4 text-cyan-400" />
              35+ Outils Professionnels
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[--text-primary]">
              Tout pour{" "}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">dominer</span>{" "}
              les march&eacute;s
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: "Journal Intelligent", desc: "Emotions, screenshots, tags, notes. Chaque trade est document\u00e9 en d\u00e9tail.", gradient: "from-blue-500 to-blue-600" },
              { icon: Brain, title: "AI Trade Coach", desc: "D\u00e9tection de patterns, score de discipline, insights personnalis\u00e9s, alertes.", gradient: "from-violet-500 to-violet-600" },
              { icon: Monitor, title: "War Room", desc: "Dashboard Bloomberg-style avec P&L live, sessions, checklist, gauges.", gradient: "from-emerald-500 to-emerald-600" },
              { icon: Play, title: "Trade Replay", desc: "Rejouez vos trades tick-by-tick avec analyse \u00ab Et si... ? \u00bb int\u00e9gr\u00e9e.", gradient: "from-purple-500 to-purple-600" },
              { icon: LineChart, title: "Backtesting", desc: "Simulez des sc\u00e9narios alternatifs : modifier SL, TP, taille, stratégie.", gradient: "from-amber-500 to-amber-600" },
              { icon: Swords, title: "Challenges & XP", desc: "Syst\u00e8me de gamification avec badges, niveaux, streaks et classement.", gradient: "from-rose-500 to-rose-600" },
              { icon: Layers, title: "Corr\u00e9lation", desc: "Matrice de Pearson, score de diversification, recommandations.", gradient: "from-cyan-500 to-cyan-600" },
              { icon: Activity, title: "Market Data Live", desc: "Cours en temps r\u00e9el, scanner, watchlist, heatmap sectorielle.", gradient: "from-teal-500 to-teal-600" },
              { icon: CalendarDays, title: "P&L Calendar", desc: "Calendrier visuel de vos gains/pertes avec modal d\u00e9taill\u00e9.", gradient: "from-indigo-500 to-indigo-600" },
            ].map((f) => (
              <div key={f.title} className="metric-card rounded-2xl p-6 group hover:border-blue-500/30 transition-all">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[--text-primary] mb-2">{f.title}</h3>
                <p className="text-sm text-[--text-secondary] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* All Tools Ticker */}
          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {["Dashboard", "Journal", "Analytics", "Distribution", "Risk Manager", "Erreurs", "Strat\u00e9gies", "Playbook", "Checklist", "Score", "Notation", "P&L Calendar", "Heatmap", "Daily Bias", "Challenges", "Leaderboard", "COT", "Macro", "Calendrier \u00c9co", "Sentiment", "Force Devises", "News", "Scanner", "Watchlist", "Heatmap Secteurs", "Volatilit\u00e9", "Earnings", "Options Flow", "AI Coach", "War Room", "Backtesting", "Replay", "Corr\u00e9lation", "Rapports", "Custom Dashboard"].map((t) => (
              <span key={t} className="px-3 py-1.5 rounded-lg text-xs font-medium glass text-[--text-muted]">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== COMPARISON ==================== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[--text-primary]">
              MarketPhase vs{" "}
              <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">la concurrence</span>
            </h2>
            <p className="mt-4 text-lg text-[--text-secondary]">Pourquoi payer quand MarketPhase offre plus ?</p>
          </div>

          <div className="max-w-4xl mx-auto glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--border]">
                  <th className="text-left px-6 py-4 text-[--text-muted] font-medium">Fonctionnalit&eacute;</th>
                  <th className="text-center px-6 py-4"><span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent font-bold">MarketPhase</span></th>
                  <th className="text-center px-6 py-4 text-[--text-muted] font-medium">TradeZella</th>
                  <th className="text-center px-6 py-4 text-[--text-muted] font-medium">Tradervue</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Prix", mp: "Gratuit", tz: "49$/mois", tv: "49$/mois" },
                  { feature: "AI Coach", mp: true, tz: false, tv: false },
                  { feature: "War Room Live", mp: true, tz: false, tv: false },
                  { feature: "Trade Replay", mp: true, tz: true, tv: false },
                  { feature: "Backtesting What-If", mp: true, tz: false, tv: false },
                  { feature: "Gamification / XP", mp: true, tz: false, tv: false },
                  { feature: "Corr\u00e9lation Matrix", mp: true, tz: false, tv: false },
                  { feature: "Market Data Live", mp: true, tz: false, tv: false },
                  { feature: "35+ Outils", mp: true, tz: false, tv: false },
                ].map((r) => (
                  <tr key={r.feature} className="border-b border-[--border] last:border-0">
                    <td className="px-6 py-3.5 text-[--text-primary] font-medium">{r.feature}</td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof r.mp === "string" ? <span className="font-bold text-emerald-400">{r.mp}</span> : r.mp ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <span className="text-[--text-muted]">—</span>}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof r.tz === "string" ? <span className="text-rose-400">{r.tz}</span> : r.tz ? <Check className="w-5 h-5 text-[--text-muted] mx-auto" /> : <span className="text-[--text-muted]">—</span>}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof r.tv === "string" ? <span className="text-rose-400">{r.tv}</span> : r.tv ? <Check className="w-5 h-5 text-[--text-muted] mx-auto" /> : <span className="text-[--text-muted]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section id="testimonials" className="py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-[--text-secondary] mb-6">
              <Star className="w-4 h-4 text-amber-400" />
              T&eacute;moignages
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[--text-primary]">
              Ce que disent nos{" "}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">traders</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Thomas K.", role: "Day Trader Forex", text: "J'ai quitt\u00e9 TradeZella pour MarketPhase. Plus d'outils, gratuit, et l'AI Coach m'a fait gagner 15% de win rate en 2 mois.", stars: 5, avatar: "TK" },
              { name: "Sarah M.", role: "Swing Trader Actions", text: "Le War Room est incroyable. J'ai tout sous les yeux : P&L live, sessions, checklist. C'est mon cockpit de trading.", stars: 5, avatar: "SM" },
              { name: "Julien P.", role: "Scalper Indices", text: "Le syst\u00e8me de challenges et badges me motive \u00e0 rester disciplin\u00e9. Mon profit factor est pass\u00e9 de 1.2 \u00e0 2.1 en 3 mois.", stars: 5, avatar: "JP" },
            ].map((t) => (
              <div key={t.name} className="metric-card rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-[--text-secondary] leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold">{t.avatar}</div>
                  <div>
                    <p className="text-sm font-semibold text-[--text-primary]">{t.name}</p>
                    <p className="text-xs text-[--text-muted]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRICING ==================== */}
      <section id="pricing" className="py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[--text-primary]">
              Un prix{" "}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">imbattable</span>
            </h2>
            <p className="mt-4 text-lg text-[--text-secondary]">Pas de pi&egrave;ge. Pas d&apos;abonnement cach&eacute;. Tout est inclus.</p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-3xl blur-sm opacity-30" />
              <div className="relative metric-card rounded-3xl p-8 sm:p-10 text-center">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-sm font-bold mb-6">100% Gratuit</div>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl sm:text-6xl font-bold text-[--text-primary]">0&euro;</span>
                  <span className="text-lg text-[--text-muted]">/ mois</span>
                </div>
                <p className="text-[--text-secondary] font-medium mb-8">Pour toujours. Sans limite.</p>
                <div className="w-full h-px bg-[--border] mb-8" />
                <ul className="space-y-4 text-left mb-10">
                  {[
                    "35+ outils professionnels",
                    "AI Trade Coach intelligent",
                    "War Room temps r\u00e9el",
                    "Backtesting & Replay",
                    "Challenges & Gamification",
                    "Market Data live",
                    "Stockage illimit\u00e9",
                    "Mises \u00e0 jour r\u00e9guli\u00e8res",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-[--text-primary]">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-sm font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="w-full inline-flex items-center justify-center gap-2 text-base font-semibold text-white px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5">
                  Cr&eacute;er Mon Compte Gratuit <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-3xl blur-lg opacity-20" />
            <div className="relative glass rounded-3xl p-10 sm:p-16 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-[--text-primary] mb-4">
                Arr&ecirc;tez de payer pour des outils inf&eacute;rieurs
              </h2>
              <p className="text-lg text-[--text-secondary] max-w-xl mx-auto mb-8">
                MarketPhase est le journal de trading le plus complet du march&eacute;.
                Et il est gratuit.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register" className="inline-flex items-center gap-2 text-base font-semibold text-white px-10 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5">
                  Commencer Maintenant <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors">
                  Ou essayez le compte demo <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-[--border-subtle] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-[--text-primary]">MarketPhase</span>
              </Link>
              <p className="text-sm text-[--text-muted] leading-relaxed">Le journal de trading professionnel gratuit.<br />35+ outils. AI int&eacute;gr&eacute;e. 0&euro;.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[--text-primary] uppercase tracking-wider mb-4">Produit</h4>
              <ul className="space-y-3">
                {[{ label: "Fonctionnalit\u00e9s", href: "#features" }, { label: "Demo", href: "#demo" }, { label: "Pricing", href: "#pricing" }].map((l) => (
                  <li key={l.label}><a href={l.href} className="text-sm text-[--text-muted] hover:text-[--text-primary] transition-colors">{l.label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[--text-primary] uppercase tracking-wider mb-4">Communaut&eacute;</h4>
              <ul className="space-y-3">
                {["Twitter", "Discord", "GitHub"].map((l) => (
                  <li key={l}><span className="text-sm text-[--text-muted] hover:text-[--text-primary] transition-colors cursor-default">{l}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[--text-primary] uppercase tracking-wider mb-4">L&eacute;gal</h4>
              <ul className="space-y-3">
                {["CGU", "Confidentialit\u00e9", "Mentions l\u00e9gales"].map((l) => (
                  <li key={l}><span className="text-sm text-[--text-muted] hover:text-[--text-primary] transition-colors cursor-default">{l}</span></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-[--border-subtle] text-center">
            <p className="text-sm text-[--text-muted]">&copy; 2026 MarketPhase. Tous droits r&eacute;serv&eacute;s.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
