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
              {["Fonctions", "Apercu", "Comparatif", "Prix"].map((l, i) => (
                <a key={l} href={`#${["features", "preview", "compare", "pricing"][i]}`} className="text-sm text-gray-400 hover:text-white transition">{l}</a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:inline-flex text-sm text-gray-400 hover:text-white px-4 py-2 transition">Connexion</Link>
              <Link href="/register" className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                Essai Gratuit
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="relative pt-28 pb-4 sm:pt-36">
        {/* Glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-500/15 via-cyan-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-sm font-medium mb-8">
              <Flame className="w-3.5 h-3.5" />
              N&deg;1 des journaux de trading gratuits
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
              Votre avantage
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                sur les march&eacute;s.
              </span>
            </h1>

            {/* Sub */}
            <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              35+ outils pro. AI Coach. War Room. Backtesting.
              <br className="hidden sm:block" />
              Tout ce que les autres vendent 50$/mois &mdash; <span className="text-white font-semibold">gratuit, pour toujours.</span>
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="group inline-flex items-center gap-2 text-base font-bold text-white px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:shadow-2xl hover:shadow-cyan-500/30 transition-all hover:-translate-y-0.5">
                Commencer Gratuitement
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
                Tester avec le compte d&eacute;mo
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>+1 200 traders</span>
              </div>
              <div className="w-px h-4 bg-gray-700" />
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
                <span className="ml-1">4.9/5</span>
              </div>
              <div className="w-px h-4 bg-gray-700" />
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>35+ outils</span>
              </div>
            </div>
          </div>

          {/* ===== HERO SCREENSHOT ===== */}
          <div className="mt-16 relative max-w-6xl mx-auto">
            {/* Glow behind */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-cyan-400/20 to-emerald-400/20 rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
              <Image
                src="/screenshots/dashboard.png"
                alt="MarketPhase Dashboard"
                width={1920}
                height={1080}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== LOGO BAR / TOOLS COUNT ==================== */}
      <section className="py-16 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: "35+", label: "Outils Pro", icon: Zap },
              { value: "0\u20ac", label: "Pour toujours", icon: Trophy },
              { value: "AI", label: "Coach int\u00e9gr\u00e9", icon: Brain },
              { value: "Live", label: "Market Data", icon: Activity },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2">
                <s.icon className="w-5 h-5 text-cyan-400" />
                <span className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{s.value}</span>
                <span className="text-sm text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURE SCREENSHOTS ==================== */}
      <section id="preview" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-cyan-400 text-sm font-semibold tracking-wider uppercase mb-3">Aper&ccedil;u</p>
            <h2 className="text-4xl sm:text-5xl font-black">
              Plus qu&apos;un journal.
              <br />
              <span className="text-gray-500">Un cockpit complet.</span>
            </h2>
          </div>

          {/* Feature rows with alternating layout */}
          <div className="space-y-32">
            {[
              {
                title: "War Room",
                subtitle: "Votre centre de commande en temps r\u00e9el",
                desc: "P&L live, sessions de march\u00e9, checklist du jour, mood tracker, gauges de performance. Tout sur un seul \u00e9cran.",
                img: "war-room",
                icon: Monitor,
                color: "from-emerald-500 to-cyan-500",
              },
              {
                title: "AI Trade Coach",
                subtitle: "Votre coach personnel aliment\u00e9 par l\u2019IA",
                desc: "D\u00e9tection de patterns, score de discipline, overtrading alerts, performance decay, best trading window.",
                img: "ai-coach",
                icon: Brain,
                color: "from-violet-500 to-purple-500",
                reverse: true,
              },
              {
                title: "Backtesting \u00ab What If \u00bb",
                subtitle: "Simulez des sc\u00e9narios alternatifs",
                desc: "Et si j\u2019avais coup\u00e9 \u00e0 2R ? Sans revenge trading ? Avec un SL plus serr\u00e9 ? Testez tout en un clic.",
                img: "backtest",
                icon: LineChart,
                color: "from-amber-500 to-orange-500",
              },
              {
                title: "Challenges & Gamification",
                subtitle: "Le trading, gamifi\u00e9",
                desc: "Badges, XP, niveaux, streaks, challenges actifs. Restez motiv\u00e9 et disciplin\u00e9 chaque jour.",
                img: "challenges",
                icon: Swords,
                color: "from-rose-500 to-pink-500",
                reverse: true,
              },
            ].map((f, idx) => (
              <div key={f.title} className={`flex flex-col ${f.reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-20`}>
                {/* Text */}
                <div className="flex-1 max-w-lg">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${f.color} bg-opacity-10 mb-4`}>
                    <f.icon className="w-4 h-4 text-white" />
                    <span className="text-sm font-semibold text-white">{f.title}</span>
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black leading-tight mb-4">{f.subtitle}</h3>
                  <p className="text-lg text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
                {/* Screenshot */}
                <div className="flex-1 w-full">
                  <div className="relative">
                    <div className={`absolute -inset-2 bg-gradient-to-r ${f.color} rounded-2xl blur-xl opacity-20`} />
                    <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                      <Image
                        src={`/screenshots/${f.img}.png`}
                        alt={f.title}
                        width={1920}
                        height={1080}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== ALL FEATURES GRID ==================== */}
      <section id="features" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-cyan-400 text-sm font-semibold tracking-wider uppercase mb-3">Fonctionnalit&eacute;s</p>
            <h2 className="text-4xl sm:text-5xl font-black">35+ outils. Z&eacute;ro compromis.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: BookOpen, title: "Journal", desc: "\u00c9motions, screenshots, tags, notes" },
              { icon: BarChart3, title: "Analytics", desc: "Sharpe, Profit Factor, Drawdown, R-Multiple" },
              { icon: Brain, title: "AI Coach", desc: "Patterns, discipline, insights personnalis\u00e9s" },
              { icon: Monitor, title: "War Room", desc: "P&L live, sessions, checklist, gauges" },
              { icon: Play, title: "Trade Replay", desc: "Rejouez vos trades avec analyse \u00ab Et si \u00bb" },
              { icon: LineChart, title: "Backtesting", desc: "Simulez SL, TP, taille, strat\u00e9gie" },
              { icon: Swords, title: "Challenges", desc: "Badges, XP, niveaux, streaks" },
              { icon: Layers, title: "Corr\u00e9lation", desc: "Matrice de Pearson, diversification" },
              { icon: CalendarDays, title: "P&L Calendar", desc: "Calendrier visuel gains/pertes" },
              { icon: Activity, title: "Market Data", desc: "Cours live, scanner, watchlist" },
              { icon: Shield, title: "Risk Manager", desc: "Calculateur, alertes, limites" },
              { icon: Trophy, title: "Leaderboard", desc: "Classement, podium, records" },
              { icon: Target, title: "Score & Notation", desc: "Note A-F, sous-scores, tendances" },
              { icon: Award, title: "Rapports PDF", desc: "G\u00e9n\u00e9ration automatique, impression" },
              { icon: Clock, title: "Distribution", desc: "Analyse temporelle de vos trades" },
            ].map((f) => (
              <div key={f.title} className="group flex items-start gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-400/20 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-cyan-400/30 transition">
                  <f.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{f.title}</h4>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== COMPARISON ==================== */}
      <section id="compare" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-cyan-400 text-sm font-semibold tracking-wider uppercase mb-3">Comparatif</p>
            <h2 className="text-4xl sm:text-5xl font-black">
              Pourquoi payer<br /><span className="text-gray-500">quand c&apos;est mieux gratuit ?</span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-gray-500 font-medium w-1/4"></th>
                  <th className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-white" /></div>
                      <span className="font-bold text-white">MarketPhase</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-gray-500 font-medium">TradeZella</th>
                  <th className="px-6 py-4 text-center text-gray-500 font-medium">Tradervue</th>
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
                  { f: "Corr\u00e9lation Matrix", mp: true, tz: false, tv: false },
                  { f: "Market Data Live", mp: true, tz: false, tv: false },
                  { f: "Trade Replay", mp: true, tz: true, tv: false },
                  { f: "3 Th\u00e8mes", mp: true, tz: false, tv: false },
                ].map((r) => (
                  <tr key={r.f} className="border-b border-white/5 last:border-0">
                    <td className="px-6 py-3.5 text-gray-300 font-medium">{r.f}</td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof r.mp === "string" ? <span className="font-bold text-emerald-400">{r.mp}</span> : r.mp ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <X className="w-5 h-5 text-gray-600 mx-auto" />}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof r.tz === "string" ? <span className="text-rose-400 font-medium">{r.tz}</span> : r.tz ? <Check className="w-5 h-5 text-gray-500 mx-auto" /> : <X className="w-5 h-5 text-gray-700 mx-auto" />}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof r.tv === "string" ? <span className="text-rose-400 font-medium">{r.tv}</span> : r.tv ? <Check className="w-5 h-5 text-gray-500 mx-auto" /> : <X className="w-5 h-5 text-gray-700 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-cyan-400 text-sm font-semibold tracking-wider uppercase mb-3">T&eacute;moignages</p>
            <h2 className="text-4xl sm:text-5xl font-black">Ils tradent avec MarketPhase.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Thomas K.", role: "Day Trader Forex", text: "J\u2019ai quitt\u00e9 TradeZella pour MarketPhase. Plus de fonctionnalit\u00e9s, gratuit, et l\u2019AI Coach m\u2019a permis de gagner 15% de win rate en 2 mois.", avatar: "TK" },
              { name: "Sarah M.", role: "Swing Trader Actions", text: "Le War Room est incroyable. P&L live, sessions, checklist. C\u2019est mon cockpit de trading au quotidien. Je ne reviendrais jamais en arri\u00e8re.", avatar: "SM" },
              { name: "Julien P.", role: "Scalper Indices", text: "Les challenges et badges me motivent \u00e0 rester disciplin\u00e9. Mon profit factor est pass\u00e9 de 1.2 \u00e0 2.1 en 3 mois. Merci MarketPhase.", avatar: "JP" },
            ].map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-1 mb-5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-gray-300 leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold">{t.avatar}</div>
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
      <section id="pricing" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto text-center">
            <p className="text-cyan-400 text-sm font-semibold tracking-wider uppercase mb-3">Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Gratuit. Point final.</h2>
            <p className="text-gray-400 text-lg mb-12">Pas de plan Pro. Pas de trial. Pas de carte bancaire. Tout est inclus.</p>

            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-3xl blur-sm opacity-30" />
              <div className="relative rounded-3xl p-10 bg-[#0d1220] border border-white/10">
                <div className="text-6xl font-black mb-1">0&euro;</div>
                <p className="text-gray-500 mb-8">/ mois &mdash; pour toujours</p>
                <div className="w-full h-px bg-white/10 mb-8" />
                <ul className="space-y-3 text-left mb-10">
                  {["35+ outils professionnels", "AI Trade Coach", "War Room temps r\u00e9el", "Backtesting & Replay", "Challenges & Gamification", "Market Data live", "Stockage illimit\u00e9", "Mises \u00e0 jour continues"].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="group w-full inline-flex items-center justify-center gap-2 text-base font-bold text-white px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:shadow-xl hover:shadow-cyan-500/25 transition-all">
                  Cr&eacute;er mon compte gratuit
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-6">
            Arr&ecirc;tez de payer.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Commencez &agrave; performer.
            </span>
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            Le journal de trading le plus complet du march&eacute; est gratuit. Il n&apos;y a aucune raison de ne pas essayer.
          </p>
          <Link href="/register" className="group inline-flex items-center gap-2 text-lg font-bold text-white px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:shadow-2xl hover:shadow-cyan-500/30 transition-all hover:-translate-y-1">
            Commencer Maintenant &mdash; C&apos;est Gratuit
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">MarketPhase</span>
            </div>
            <p className="text-sm text-gray-600">&copy; 2026 MarketPhase. Tous droits r&eacute;serv&eacute;s.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
