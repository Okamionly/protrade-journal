import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Mail, MessageSquare, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact — MarketPhase Journal de Trading",
  description:
    "Contactez l'équipe MarketPhase. Questions, suggestions ou partenariats : nous sommes à votre écoute.",
  keywords: [
    "contact MarketPhase",
    "support trading journal",
    "MarketPhase email",
  ],
  openGraph: {
    title: "Contactez MarketPhase — Journal de Trading Gratuit",
    description: "Une question ? L'équipe MarketPhase est là pour vous aider.",
  },
};

export default function ContactPage() {
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
            <Link href="/about" className="text-sm text-gray-500 hover:text-gray-900 transition">À propos</Link>
            <Link href="/register" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition">
              Commencer gratuitement
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Contactez-nous
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-xl mx-auto">
            Une question, une suggestion ou une demande de partenariat ? N&apos;hésitez pas à nous écrire.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Email</h2>
            <p className="mt-2 text-sm text-gray-500">Pour toute question</p>
            <a
              href="mailto:contact@marketphase.com"
              className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 transition"
            >
              contact@marketphase.com
            </a>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Communauté</h2>
            <p className="mt-2 text-sm text-gray-500">Échangez avec d&apos;autres traders</p>
            <Link
              href="/register"
              className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 transition"
            >
              Rejoindre la communauté
            </Link>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Délai de réponse</h2>
            <p className="mt-2 text-sm text-gray-500">Nous répondons sous 24h en jours ouvrés</p>
            <span className="mt-4 inline-block text-sm font-medium text-gray-400">
              Lun — Ven, 9h — 18h
            </span>
          </div>
        </div>

        {/* FAQ link */}
        <div className="mt-16 text-center">
          <p className="text-gray-500">
            Consultez aussi nos{" "}
            <Link href="/features" className="text-blue-600 hover:text-blue-700 font-medium transition">
              fonctionnalités détaillées
            </Link>{" "}
            et notre{" "}
            <Link href="/blog" className="text-blue-600 hover:text-blue-700 font-medium transition">
              blog
            </Link>{" "}
            pour des guides complets.
          </p>
        </div>
      </main>

      {/* Footer mini */}
      <footer className="border-t border-gray-100 py-8 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">© 2026 MarketPhase. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <Link href="/mentions-legales" className="text-xs text-gray-400 hover:text-gray-900 transition">Mentions légales</Link>
            <Link href="/confidentialite" className="text-xs text-gray-400 hover:text-gray-900 transition">Confidentialité</Link>
            <Link href="/about" className="text-xs text-gray-400 hover:text-gray-900 transition">À propos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
