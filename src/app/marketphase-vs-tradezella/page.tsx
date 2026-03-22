import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  ChevronDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "MarketPhase vs TradeZella : Meilleure Alternative Gratuite en 2026",
  description:
    "Comparaison honnete entre MarketPhase (gratuit) et TradeZella (49$/mois). Fonctionnalites, prix, avantages et inconvenients. Decouvrez la meilleure alternative gratuite a TradeZella.",
  keywords: [
    "tradezella alternative",
    "tradezella gratuit",
    "tradezella vs",
    "alternative tradezella",
    "tradezella avis",
    "marketphase vs tradezella",
    "journal de trading gratuit",
    "meilleur journal de trading",
  ],
  openGraph: {
    title: "MarketPhase vs TradeZella : Comparaison Complete 2026",
    description:
      "MarketPhase (gratuit) vs TradeZella (49$/mois). Decouvrez pourquoi MarketPhase est la meilleure alternative gratuite a TradeZella.",
    type: "website",
  },
};

const COMPARISON_ROWS = [
  { feature: "Prix", mp: "Gratuit (0$/mois)", tz: "49$/mois (588$/an)" },
  { feature: "Carte bancaire requise", mp: false, tz: true },
  { feature: "Periode d'essai", mp: "Illimitee (gratuit)", tz: "7 jours" },
  { feature: "Journal de trading", mp: true, tz: true },
  { feature: "Analytics et statistiques", mp: true, tz: true },
  { feature: "Calendrier P&L", mp: true, tz: true },
  { feature: "Import CSV", mp: true, tz: true },
  { feature: "AI Coach personnel", mp: true, tz: false },
  { feature: "Communaute integree", mp: true, tz: false },
  { feature: "Market data en temps reel", mp: true, tz: false },
  { feature: "Backtesting", mp: true, tz: false },
  { feature: "Interface en francais", mp: true, tz: false },
  { feature: "Integration brokers", mp: false, tz: true },
  { feature: "Replay de trades", mp: false, tz: true },
  { feature: "Nombre d'outils", mp: "35+", tz: "~15" },
  { feature: "Support", mp: "Communaute + email", tz: "Email + chat" },
];

const MP_ADVANTAGES = [
  {
    title: "Entierement gratuit",
    desc: "MarketPhase est 100% gratuit avec plus de 35 outils inclus. TradeZella coute 49$/mois, soit 588$ par an. En choisissant MarketPhase, vous economisez cette somme que vous pouvez reinvestir dans votre capital de trading.",
  },
  {
    title: "AI Coach integre",
    desc: "MarketPhase inclut un coach IA qui analyse vos patterns de trading, detecte vos erreurs recurrentes et propose des ameliorations personnalisees. TradeZella ne propose pas cette fonctionnalite.",
  },
  {
    title: "Communaute active",
    desc: "Rejoignez plus de 1 200 traders actifs directement dans la plateforme. Partagez vos analyses, participez a des challenges et progressez ensemble. TradeZella ne dispose pas de communaute integree.",
  },
  {
    title: "Market data en temps reel",
    desc: "Accedez aux donnees de marche en direct : cours, volumes, actualites financieres. Tout est integre dans MarketPhase sans cout supplementaire.",
  },
  {
    title: "Interface en francais",
    desc: "MarketPhase est entierement disponible en francais, ce qui en fait le choix ideal pour les traders francophones. TradeZella est uniquement en anglais.",
  },
  {
    title: "Backtesting inclus",
    desc: "Testez vos strategies sur des donnees historiques directement dans MarketPhase. Cette fonctionnalite, habituellement payante, est gratuite chez MarketPhase.",
  },
];

const TZ_ADVANTAGES = [
  {
    title: "Integration brokers directe",
    desc: "TradeZella propose l'import automatique de trades depuis certains brokers comme Interactive Brokers, TD Ameritrade et d'autres. MarketPhase necessite un import CSV manuel.",
  },
  {
    title: "Replay de trades",
    desc: "TradeZella permet de rejouer vos trades dans un simulateur pour analyser vos decisions point par point. MarketPhase ne propose pas encore cette fonctionnalite.",
  },
  {
    title: "Marque etablie",
    desc: "TradeZella existe depuis plus longtemps et beneficie d'une communaute YouTube et d'une visibilite plus importante dans le monde anglophone.",
  },
];

const FAQ_ITEMS = [
  {
    q: "TradeZella est-il meilleur que MarketPhase ?",
    a: "Cela depend de vos besoins. Si vous avez besoin de l'integration directe avec votre broker et du replay de trades, TradeZella peut etre un meilleur choix. Cependant, si vous cherchez un journal de trading complet, gratuit, avec un AI Coach, une communaute et une interface en francais, MarketPhase est la meilleure option. De plus, MarketPhase vous fait economiser 588$ par an.",
  },
  {
    q: "Puis-je migrer de TradeZella vers MarketPhase ?",
    a: "Oui, vous pouvez exporter vos trades de TradeZella en CSV et les importer dans MarketPhase en quelques clics. Votre historique complet sera conserve et vous pourrez immediatement analyser vos performances avec les outils de MarketPhase.",
  },
  {
    q: "MarketPhase offre-t-il les memes fonctionnalites que TradeZella ?",
    a: "MarketPhase offre toutes les fonctionnalites essentielles de TradeZella (journal, analytics, calendrier P&L, import) plus des outils exclusifs comme l'AI Coach, la communaute integree et les donnees de marche en temps reel. La seule fonctionnalite manquante est l'integration directe avec les brokers.",
  },
  {
    q: "Existe-t-il une alternative gratuite a TradeZella ?",
    a: "Oui, MarketPhase est la meilleure alternative gratuite a TradeZella. Il offre 35+ outils professionnels sans aucun frais, sans carte bancaire et sans periode d'essai limitee. C'est le journal de trading gratuit le plus complet du marche.",
  },
  {
    q: "Combien coute TradeZella par rapport a MarketPhase ?",
    a: "TradeZella coute 49$/mois, soit 588$ par an. MarketPhase est entierement gratuit avec toutes les fonctionnalites incluses. En choisissant MarketPhase, vous economisez 588$ chaque annee.",
  },
];

export default function MarketPhaseVsTradezella() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-icon.png"
              alt="MarketPhase"
              width={28}
              height={28}
              className="w-7 h-7 rounded-lg"
            />
            <span className="font-bold text-gray-900">MarketPhase</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/blog"
              className="text-sm text-gray-500 hover:text-gray-900 transition"
            >
              Blog
            </Link>
            <Link
              href="/features"
              className="text-sm text-gray-500 hover:text-gray-900 transition"
            >
              Fonctionnalites
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
            >
              Commencer gratuitement
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4" />
            Comparaison honnete et detaillee
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              MarketPhase
            </span>{" "}
            vs TradeZella
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
            Comparaison complete entre MarketPhase (gratuit) et TradeZella
            (49$/mois). Decouvrez quelle solution convient le mieux a vos
            besoins de trading et pourquoi MarketPhase est la meilleure
            alternative gratuite a TradeZella en 2026.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="bg-blue-50 rounded-2xl px-6 py-4 border-2 border-blue-200">
              <p className="text-sm font-semibold text-blue-600">MarketPhase</p>
              <p className="text-3xl font-extrabold text-gray-900">0$/mois</p>
              <p className="text-xs text-gray-400">35+ outils inclus</p>
            </div>
            <span className="text-2xl font-bold text-gray-300">vs</span>
            <div className="bg-gray-50 rounded-2xl px-6 py-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-500">TradeZella</p>
              <p className="text-3xl font-extrabold text-gray-900">49$/mois</p>
              <p className="text-xs text-gray-400">~15 outils</p>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
              Comparaison des fonctionnalites
            </h2>
            <p className="mt-4 text-gray-500 text-center max-w-2xl mx-auto">
              Voici un comparatif objectif des fonctionnalites proposees par
              MarketPhase et TradeZella pour votre journal de trading.
            </p>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-4 text-sm font-semibold text-gray-900">
                      Fonctionnalite
                    </th>
                    <th className="p-4 text-sm font-semibold text-blue-600 bg-blue-50/50 w-1/3">
                      MarketPhase
                    </th>
                    <th className="p-4 text-sm font-semibold text-gray-500 w-1/3">
                      TradeZella
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="p-4 text-sm text-gray-900 font-medium">
                        {row.feature}
                      </td>
                      {(["mp", "tz"] as const).map((key, col) => (
                        <td
                          key={key}
                          className={`p-4 text-center text-sm ${col === 0 ? "bg-blue-50/30" : ""}`}
                        >
                          {typeof row[key] === "boolean" ? (
                            row[key] ? (
                              <CheckCircle2
                                className={`w-5 h-5 mx-auto ${col === 0 ? "text-blue-600" : "text-green-500"}`}
                              />
                            ) : (
                              <X className="w-5 h-5 mx-auto text-red-300" />
                            )
                          ) : (
                            <span
                              className={
                                col === 0
                                  ? "font-bold text-blue-600"
                                  : "text-gray-500"
                              }
                            >
                              {row[key] as string}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* MarketPhase advantages */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
            Avantages de MarketPhase par rapport a TradeZella
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MP_ADVANTAGES.map((a) => (
              <div
                key={a.title}
                className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {a.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* TradeZella advantages (honest) */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
              Avantages de TradeZella
            </h2>
            <p className="mt-4 text-gray-500 text-center max-w-2xl mx-auto">
              Par souci d&apos;honnetetete, voici les points ou TradeZella se
              demarque actuellement.
            </p>
            <div className="mt-10 grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {TZ_ADVANTAGES.map((a) => (
                <div
                  key={a.title}
                  className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                    {a.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Verdict */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
              Notre verdict : MarketPhase ou TradeZella ?
            </h2>
            <div className="mt-8 text-gray-500 leading-relaxed space-y-4">
              <p>
                Pour la grande majorite des traders, <strong className="text-gray-900">MarketPhase est le meilleur choix</strong>.
                Il offre toutes les fonctionnalites essentielles d&apos;un journal de
                trading professionnel &mdash; analytics, calendrier P&L, import de
                trades &mdash; plus des outils exclusifs comme l&apos;AI Coach, la
                communaute integree et les donnees de marche en temps reel. Et
                tout cela gratuitement.
              </p>
              <p>
                TradeZella reste une bonne option si vous avez absolument besoin
                de l&apos;integration directe avec votre broker ou de la
                fonctionnalite de replay de trades. Cependant, a 49$/mois
                (588$/an), c&apos;est un investissement significatif, surtout quand
                une alternative gratuite comme MarketPhase offre autant de
                fonctionnalites.
              </p>
              <p>
                <strong className="text-gray-900">Notre recommandation :</strong>{" "}
                Commencez avec MarketPhase gratuitement. Vous aurez acces a 35+
                outils professionnels sans debourser un centime. Si vous trouvez
                qu&apos;il vous manque l&apos;integration broker, vous pourrez toujours
                passer a TradeZella plus tard.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
              Questions frequentes
            </h2>
            <div className="mt-10 space-y-4">
              {FAQ_ITEMS.map((item, i) => (
                <details
                  key={i}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden"
                >
                  <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base pr-4">
                      {item.q}
                    </h3>
                    <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6">
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Internal links */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid sm:grid-cols-3 gap-6">
            <Link
              href="/journal-de-trading"
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                Journal de trading
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Tout savoir sur le journal de trading et pourquoi c&apos;est essentiel.
              </p>
            </Link>
            <Link
              href="/journal-de-trading-gratuit"
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                Journal de trading gratuit
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Pourquoi MarketPhase est le meilleur journal de trading gratuit.
              </p>
            </Link>
            <Link
              href="/marketphase-vs-tradervue"
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                MarketPhase vs Tradervue
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Comparez MarketPhase a Tradervue, une autre alternative payante.
              </p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Essayez MarketPhase gratuitement
            </h2>
            <p className="mt-4 text-blue-100 max-w-lg mx-auto">
              La meilleure alternative gratuite a TradeZella. 35+ outils, AI
              Coach, communaute active. Sans carte bancaire, sans engagement.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 text-blue-600 font-bold px-8 py-4 rounded-2xl bg-white hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              Essayer MarketPhase gratuitement
              <TrendingUp className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            &copy; 2026 MarketPhase. Tous droits reserves.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/mentions-legales"
              className="text-xs text-gray-400 hover:text-gray-900 transition"
            >
              Mentions legales
            </Link>
            <Link
              href="/confidentialite"
              className="text-xs text-gray-400 hover:text-gray-900 transition"
            >
              Confidentialite
            </Link>
            <Link
              href="/contact"
              className="text-xs text-gray-400 hover:text-gray-900 transition"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
