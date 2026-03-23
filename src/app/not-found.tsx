import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Page introuvable",
  description:
    "La page que vous cherchez n'existe pas ou a ete deplacee. Retournez a l'accueil de MarketPhase.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <Link href="/" className="mb-8">
        <Image
          src="/logo-icon.png"
          alt="MarketPhase"
          width={64}
          height={64}
          className="rounded-2xl"
        />
      </Link>

      <h1 className="text-4xl font-bold text-gray-900 mb-3">
        Page introuvable
      </h1>

      <p className="text-gray-500 max-w-md mb-8">
        La page que vous cherchez n&apos;existe pas ou a ete deplacee.
      </p>

      <div className="flex gap-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          Retour a l&apos;accueil
        </Link>
        <Link
          href="/journal"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          Voir le journal
        </Link>
      </div>
    </div>
  );
}
