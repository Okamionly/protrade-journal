import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Gift,
  Infinity,
  LineChart,
  Shield,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Journal de Trading Gratuit | Sans Carte | MarketPhase",
  description:
    "Le journal de trading gratuit le plus complet en 2026. 35+ outils inclus, AI Coach, calendrier P&L, communaute active. Sans carte bancaire, sans periode d'essai. Commencez maintenant.",
  keywords: [
    "journal de trading gratuit",
    "journal trading gratuit",
    "trading journal gratuit",
    "journal de trading en ligne gratuit",
    "meilleur journal de trading gratuit",
    "carnet de trading gratuit",
    "MarketPhase gratuit",
  ],
  alternates: {
    canonical: "https://marketphase.vercel.app/journal-de-trading-gratuit",
  },
  openGraph: {
    title: "Journal de Trading Gratuit | 35+ Outils | MarketPhase",
    description:
      "Acces gratuit a 35+ outils de trading : journal, analytics, AI Coach, calendrier P&L. Sans carte bancaire, sans limite.",
    type: "website",
  },
};

const PRICING_ROWS = [
  { feature: "Prix mensuel", mp: "0$ / gratuit", tz: "49$/mois", tv: "49$/mois", ew: "169$ (licence)" },
  { feature: "Carte bancaire requise", mp: false, tz: true, tv: true, ew: true },
  { feature: "Periode d'essai limitee", mp: false, tz: true, tv: true, ew: false },
  { feature: "Journal de trading", mp: true, tz: true, tv: true, ew: true },
  { feature: "Analytics avances", mp: true, tz: true, tv: true, ew: true },
  { feature: "AI Coach", mp: true, tz: false, tv: false, ew: false },
  { feature: "Calendrier P&L", mp: true, tz: true, tv: true, ew: false },
  { feature: "Communaute integree", mp: true, tz: false, tv: false, ew: false },
  { feature: "Market data en direct", mp: true, tz: false, tv: false, ew: false },
  { feature: "Backtesting", mp: true, tz: false, tv: false, ew: true },
  { feature: "Interface en francais", mp: true, tz: false, tv: false, ew: false },
  { feature: "Nombre d'outils inclus", mp: "35+", tz: "~15", tv: "~12", ew: "~10" },
];

const FREE_ADVANTAGES = [
  {
    icon: Gift,
    title: "100% gratuit, pour toujours",
    desc: "Aucun plan premium cache, aucune fonctionnalite verrouillee. Vous avez acces a l'integralite des 35+ outils de MarketPhase sans jamais payer un centime.",
  },
  {
    icon: CreditCard,
    title: "Aucune carte bancaire",
    desc: "Pas de carte bancaire a l'inscription, pas de frais caches, pas de prelevement surprise. Creez votre compte en 30 secondes avec juste un email.",
  },
  {
    icon: Infinity,
    title: "Sans periode d'essai",
    desc: "Contrairement a TradeZella ou Tradervue qui limitent leur essai gratuit a 7 ou 14 jours, MarketPhase est gratuit sans limite de temps.",
  },
  {
    icon: LineChart,
    title: "35+ outils professionnels",
    desc: "Journal de trading, analytics avances, calendrier P&L, AI Coach, backtesting, market data live, communaute et bien plus. Tout est inclus dans la version gratuite.",
  },
  {
    icon: Shield,
    title: "Donnees securisees",
    desc: "Gratuit ne signifie pas moins securise. Vos donnees de trading sont chiffrees et protegees avec les memes standards que les solutions payantes.",
  },
  {
    icon: Zap,
    title: "Mises a jour regulieres",
    desc: "De nouvelles fonctionnalites sont ajoutees chaque semaine. Vous beneficiez de toutes les ameliorations gratuitement, sans abonnement premium.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Pourquoi MarketPhase est-il gratuit alors que les alternatives coutent 49$/mois ?",
    a: "MarketPhase croit que chaque trader, qu'il debute ou qu'il soit experimente, merite des outils professionnels. Notre modele economique repose sur des services optionnels et des partenariats, pas sur des abonnements obligatoires. Le journal de trading gratuit et les 35+ outils resteront toujours accessibles sans frais.",
  },
  {
    q: "Y a-t-il des limites sur le journal de trading gratuit ?",
    a: "Non. Vous pouvez enregistrer un nombre illimite de trades, acceder a tous les outils d'analyse, utiliser l'AI Coach et participer a la communaute. Il n'y a aucune limite artificielle sur le journal de trading gratuit de MarketPhase.",
  },
  {
    q: "Comment MarketPhase se compare a TradeZella qui coute 49$/mois ?",
    a: "MarketPhase offre toutes les fonctionnalites essentielles de TradeZella (journal, analytics, calendrier P&L) plus des outils exclusifs comme l'AI Coach, la communaute integree et les donnees de marche en temps reel. Le tout gratuitement, sans carte bancaire. Consultez notre comparaison detaillee MarketPhase vs TradeZella.",
  },
  {
    q: "Puis-je migrer depuis un autre journal de trading ?",
    a: "Oui, MarketPhase supporte l'import CSV. Vous pouvez transferer votre historique de trades depuis TradeZella, Tradervue, Edgewonk ou tout autre journal de trading en quelques clics. Vos donnees sont immediatement analysees par nos outils.",
  },
  {
    q: "Le journal de trading gratuit est-il disponible en francais ?",
    a: "Oui, MarketPhase est entierement disponible en francais, ce qui en fait le seul journal de trading gratuit avec une interface complete en francais. L'AI Coach repond egalement en francais pour des conseils adaptes aux traders francophones.",
  },
];

export default function JournalDeTradingGratuitPage() {
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
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <Gift className="w-4 h-4" />
            Gratuit pour toujours &mdash; 0$/mois
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
            Le{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              journal de trading gratuit
            </span>{" "}
            avec 35+ outils
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
            Pourquoi payer 49$/mois pour un journal de trading quand MarketPhase
            vous offre 35+ outils professionnels gratuitement ? Aucune carte
            bancaire, aucune periode d&apos;essai, aucune limite.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:shadow-xl hover:shadow-blue-500/20 transition-all hover:-translate-y-0.5"
            >
              Creer mon journal gratuit
              <TrendingUp className="w-5 h-5" />
            </Link>
            <Link
              href="/journal-de-trading"
              className="inline-flex items-center gap-2 text-gray-700 font-semibold px-8 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 transition"
            >
              En savoir plus
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Sans carte bancaire
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Sans periode d&apos;essai
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              35+ outils inclus
            </span>
          </div>
        </section>

        {/* Savings calculator */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Economisez jusqu&apos;a 588$ par an
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
              En choisissant MarketPhase comme journal de trading gratuit plutot
              qu&apos;une alternative payante, vous economisez jusqu&apos;a 588$
              par an que vous pouvez reinvestir dans votre capital de trading.
            </p>
            <div className="mt-10 grid sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-blue-200">
                <p className="text-sm font-semibold text-blue-600">MarketPhase</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-2">0$</p>
                <p className="text-xs text-gray-400 mt-1">par an</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-500">TradeZella</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-2">588$</p>
                <p className="text-xs text-gray-400 mt-1">par an</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-500">Tradervue</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-2">588$</p>
                <p className="text-xs text-gray-400 mt-1">par an</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-500">Edgewonk</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-2">169$</p>
                <p className="text-xs text-gray-400 mt-1">licence unique</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6 Free advantages */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
            Pourquoi le journal de trading gratuit de MarketPhase ?
          </h2>
          <p className="mt-4 text-gray-500 text-center max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour analyser vos trades, sans depenser un centime.
          </p>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FREE_ADVANTAGES.map((a) => (
              <div
                key={a.title}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <a.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {a.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing comparison table */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
              Comparaison detaillee des journaux de trading
            </h2>
            <p className="mt-4 text-gray-500 text-center max-w-2xl mx-auto">
              Voyez par vous-meme pourquoi MarketPhase est le meilleur journal
              de trading gratuit disponible en 2026.
            </p>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-4 text-sm font-semibold text-gray-900">
                      Fonctionnalite
                    </th>
                    <th className="p-4 text-sm font-semibold text-blue-600 bg-blue-50/50">
                      MarketPhase
                    </th>
                    <th className="p-4 text-sm font-semibold text-gray-500">
                      TradeZella
                    </th>
                    <th className="p-4 text-sm font-semibold text-gray-500">
                      Tradervue
                    </th>
                    <th className="p-4 text-sm font-semibold text-gray-500">
                      Edgewonk
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {PRICING_ROWS.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="p-4 text-sm text-gray-900 font-medium">
                        {row.feature}
                      </td>
                      {(["mp", "tz", "tv", "ew"] as const).map((key, col) => (
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
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link
                href="/marketphase-vs-tradezella"
                className="text-blue-600 hover:text-blue-700 font-medium transition"
              >
                MarketPhase vs TradeZella &rarr;
              </Link>
              <Link
                href="/marketphase-vs-tradervue"
                className="text-blue-600 hover:text-blue-700 font-medium transition"
              >
                MarketPhase vs Tradervue &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonial-style stats */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
            Des traders font confiance au journal de trading gratuit
          </h2>
          <div className="mt-10 grid sm:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-4xl font-extrabold text-blue-600">1 200+</p>
              <p className="mt-2 text-sm text-gray-500">
                Traders utilisent le journal de trading gratuit de MarketPhase
                chaque jour
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-4xl font-extrabold text-blue-600">35+</p>
              <p className="mt-2 text-sm text-gray-500">
                Outils d&apos;analyse accessibles gratuitement et sans limite
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-4xl font-extrabold text-blue-600">0$</p>
              <p className="mt-2 text-sm text-gray-500">
                Pour toujours. Aucun abonnement, aucune carte bancaire
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
              Questions frequentes sur le journal de trading gratuit
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
                Tout savoir sur le journal de trading et comment il peut transformer vos resultats.
              </p>
            </Link>
            <Link
              href="/features"
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                Toutes les fonctionnalites
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Decouvrez les 35+ outils gratuits inclus dans MarketPhase.
              </p>
            </Link>
            <Link
              href="/blog"
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                Blog trading
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Conseils, strategies et analyses pour ameliorer votre trading au quotidien.
              </p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Votre journal de trading gratuit vous attend
            </h2>
            <p className="mt-4 text-blue-100 max-w-lg mx-auto">
              Arretez de payer pour un journal de trading. MarketPhase vous offre
              35+ outils professionnels gratuitement. Inscription en 30 secondes,
              sans carte bancaire.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 text-blue-600 font-bold px-8 py-4 rounded-2xl bg-white hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              Creer mon journal gratuit
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
