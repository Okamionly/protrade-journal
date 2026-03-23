import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  LineChart,
  Shield,
  Target,
  TrendingUp,
  Users,
  Zap,
  BookOpen,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Journal de Trading Gratuit en Ligne | MarketPhase 2026",
  description:
    "Tenez votre journal de trading gratuitement avec MarketPhase. 35+ outils d'analyse, AI Coach, calendrier P&L et communauté active. Le meilleur journal de trading gratuit en ligne.",
  keywords: [
    "journal de trading",
    "journal de trading gratuit",
    "journal trading en ligne",
    "trading journal",
    "carnet de trading",
    "suivi de trades",
    "analyse de trading",
    "MarketPhase",
  ],
  alternates: {
    canonical: "https://marketphase.vercel.app/journal-de-trading",
  },
  openGraph: {
    title: "Journal de Trading Gratuit en Ligne | MarketPhase 2026",
    description:
      "Analysez vos trades, identifiez vos forces et progressez avec le journal de trading gratuit le plus complet du marche. 35+ outils inclus.",
    type: "website",
  },
};

const BENEFITS = [
  {
    icon: BookOpen,
    title: "Journal intelligent",
    desc: "Enregistrez chaque trade avec tous les details : entree, sortie, taille de position, emotions, screenshots et notes. Votre journal de trading devient votre meilleur outil de progression.",
  },
  {
    icon: BarChart3,
    title: "Analytics avances",
    desc: "Visualisez vos performances avec des graphiques interactifs : winrate, profit factor, drawdown, esperance mathematique et plus de 20 metriques cles.",
  },
  {
    icon: Brain,
    title: "AI Coach personnel",
    desc: "Notre intelligence artificielle analyse vos patterns de trading, detecte vos erreurs recurrentes et vous propose des axes d'amelioration personnalises.",
  },
  {
    icon: Calendar,
    title: "Calendrier P&L",
    desc: "Suivez vos gains et pertes jour par jour avec un calendrier visuel. Identifiez vos meilleurs jours de trading et optimisez votre emploi du temps.",
  },
  {
    icon: Users,
    title: "Communaute active",
    desc: "Rejoignez plus de 1 200 traders actifs. Partagez vos analyses, participez aux challenges et progressez ensemble dans un environnement bienveillant.",
  },
  {
    icon: Shield,
    title: "Donnees securisees",
    desc: "Vos donnees de trading sont chiffrees et stockees en toute securite. Nous ne vendons jamais vos informations a des tiers. Confidentialite garantie.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Qu'est-ce qu'un journal de trading et pourquoi en tenir un ?",
    a: "Un journal de trading est un outil qui permet d'enregistrer systematiquement chaque trade que vous passez : prix d'entree, prix de sortie, taille de position, raison de l'entree, emotions ressenties et resultat. Tenir un journal de trading est essentiel car il vous permet d'identifier vos forces et faiblesses, de detecter des patterns recurrents dans votre trading et d'ameliorer votre discipline. Les traders professionnels considerent le journal de trading comme l'outil le plus important pour progresser.",
  },
  {
    q: "MarketPhase est-il vraiment gratuit ?",
    a: "Oui, MarketPhase est 100% gratuit. Vous avez acces a plus de 35 outils sans aucune limite : journal de trading, analytics avances, calendrier P&L, AI Coach, backtesting, market data en temps reel et bien plus. Aucune carte bancaire n'est requise, aucune periode d'essai. Vous pouvez utiliser toutes les fonctionnalites des votre inscription.",
  },
  {
    q: "Comment MarketPhase se compare-t-il aux autres journaux de trading ?",
    a: "Contrairement a TradeZella (49$/mois) ou Tradervue (49$/mois), MarketPhase offre toutes ses fonctionnalites gratuitement. De plus, MarketPhase inclut des outils uniques comme l'AI Coach, une communaute integree, des donnees de marche en temps reel et une interface entierement disponible en francais.",
  },
  {
    q: "Quels marches sont supportes par le journal de trading ?",
    a: "MarketPhase supporte tous les marches financiers : actions (stocks), forex, crypto-monnaies, futures, options et matieres premieres. Vous pouvez suivre vos trades sur n'importe quel marche et obtenir des analytics detailles pour chacun d'entre eux.",
  },
  {
    q: "Puis-je importer mes trades existants ?",
    a: "Oui, MarketPhase permet d'importer vos trades depuis un fichier CSV. Vous pouvez ainsi retrouver tout votre historique de trading en quelques clics et commencer immediatement a analyser vos performances passees avec nos outils avances.",
  },
];

export default function JournalDeTradingPage() {
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
            100% gratuit &mdash; Aucune carte bancaire requise
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
            Le{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              journal de trading
            </span>{" "}
            gratuit le plus complet
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
            MarketPhase est le journal de trading en ligne qui vous aide a
            analyser vos performances, identifier vos erreurs et progresser
            grace a l&apos;intelligence artificielle. Plus de 35 outils gratuits
            pour transformer votre trading.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:shadow-xl hover:shadow-blue-500/20 transition-all hover:-translate-y-0.5"
            >
              Creer mon journal de trading
              <TrendingUp className="w-5 h-5" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 text-gray-700 font-semibold px-8 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 transition"
            >
              Voir les fonctionnalites
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Rejoint par plus de 1 200 traders &mdash; Inscription en 30 secondes
          </p>
        </section>

        {/* What is a trading journal */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
              Qu&apos;est-ce qu&apos;un journal de trading ?
            </h2>
            <div className="mt-8 max-w-3xl mx-auto text-gray-500 leading-relaxed space-y-4">
              <p>
                Un <strong className="text-gray-900">journal de trading</strong>{" "}
                est un outil indispensable pour tout trader serieux. Il permet
                d&apos;enregistrer chaque operation realisee sur les marches
                financiers : le prix d&apos;entree, le prix de sortie, la taille
                de position, la strategie utilisee, les emotions ressenties et
                le resultat obtenu.
              </p>
              <p>
                Contrairement a un simple tableur Excel, un journal de trading
                moderne comme MarketPhase analyse automatiquement vos donnees
                pour en extraire des insights actionnables. Il calcule votre
                winrate, votre profit factor, votre drawdown maximum et bien
                d&apos;autres metriques essentielles a votre progression.
              </p>
              <p>
                Les traders professionnels sont unanimes : tenir un journal de
                trading est la pratique qui a le plus d&apos;impact sur la
                performance a long terme. C&apos;est votre miroir objectif, celui
                qui ne ment jamais et qui vous montre exactement ou vous devez
                progresser.
              </p>
            </div>
          </div>
        </section>

        {/* 6 Benefits */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
            Pourquoi choisir MarketPhase comme journal de trading ?
          </h2>
          <p className="mt-4 text-gray-500 text-center max-w-2xl mx-auto">
            MarketPhase reunit tout ce dont un trader a besoin pour analyser,
            comprendre et ameliorer ses performances.
          </p>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <b.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{b.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
              MarketPhase vs les alternatives payantes
            </h2>
            <p className="mt-4 text-gray-500 text-center max-w-2xl mx-auto">
              Decouvrez pourquoi des centaines de traders choisissent
              MarketPhase comme journal de trading principal.
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
                  {[
                    ["Prix", "Gratuit", "49$/mois", "49$/mois", "169$ (licence)"],
                    ["Journal de trading", true, true, true, true],
                    ["AI Coach", true, false, false, false],
                    ["Calendrier P&L", true, true, true, false],
                    ["Communaute integree", true, false, false, false],
                    ["Market data live", true, false, false, false],
                    ["Interface en francais", true, false, false, false],
                    ["Backtesting", true, false, false, true],
                    ["35+ outils", true, false, false, false],
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="p-4 text-sm text-gray-900 font-medium">
                        {row[0]}
                      </td>
                      {[1, 2, 3, 4].map((col) => (
                        <td
                          key={col}
                          className={`p-4 text-center text-sm ${col === 1 ? "bg-blue-50/30" : ""}`}
                        >
                          {typeof row[col] === "boolean" ? (
                            row[col] ? (
                              <CheckCircle2
                                className={`w-5 h-5 mx-auto ${col === 1 ? "text-blue-600" : "text-green-500"}`}
                              />
                            ) : (
                              <span className="text-gray-300">&mdash;</span>
                            )
                          ) : (
                            <span
                              className={
                                col === 1
                                  ? "font-bold text-blue-600"
                                  : "text-gray-500"
                              }
                            >
                              {row[col] as string}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 text-center">
              <Link
                href="/journal-de-trading-gratuit"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm transition"
              >
                En savoir plus sur le journal de trading gratuit &rarr;
              </Link>
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
            Comment fonctionne votre journal de trading ?
          </h2>
          <div className="mt-12 grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Enregistrez vos trades",
                desc: "Ajoutez chaque trade en quelques clics : instrument, direction, prix d'entree et de sortie, taille et notes. Importez depuis un CSV ou saisissez manuellement.",
              },
              {
                step: "2",
                title: "Analysez vos performances",
                desc: "Le journal de trading calcule automatiquement toutes vos metriques : winrate, profit factor, ratio risque/reward, drawdown et plus de 20 indicateurs cles.",
              },
              {
                step: "3",
                title: "Progressez avec l'IA",
                desc: "L'AI Coach de MarketPhase detecte vos patterns, identifie vos erreurs recurrentes et vous propose des recommandations personnalisees pour ameliorer votre trading.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg flex items-center justify-center mx-auto">
                  {s.step}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
              Questions frequentes sur le journal de trading
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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
            Explorez MarketPhase
          </h2>
          <div className="mt-10 grid sm:grid-cols-3 gap-6">
            <Link
              href="/journal-de-trading-gratuit"
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                Journal de trading gratuit
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Decouvrez pourquoi MarketPhase est le meilleur journal de
                trading gratuit du marche.
              </p>
            </Link>
            <Link
              href="/marketphase-vs-tradezella"
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                MarketPhase vs TradeZella
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Comparez MarketPhase a TradeZella et decouvrez la meilleure
                alternative gratuite.
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
                Comparez MarketPhase a Tradervue et economisez 49$/mois.
              </p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Pret a ameliorer votre trading ?
            </h2>
            <p className="mt-4 text-blue-100 max-w-lg mx-auto">
              Rejoignez plus de 1 200 traders qui utilisent MarketPhase pour
              analyser et ameliorer leurs performances chaque jour. Votre
              journal de trading gratuit vous attend.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 text-blue-600 font-bold px-8 py-4 rounded-2xl bg-white hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              Creer mon journal de trading gratuit
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
