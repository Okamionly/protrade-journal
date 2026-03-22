import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un Compte Gratuit",
  description:
    "Créez votre compte MarketPhase gratuitement. Journal de trading avec IA, 35+ outils d'analyse, AI Coach et market data live. 100% gratuit, sans carte bancaire.",
  openGraph: {
    title: "Créer un Compte Gratuit | MarketPhase",
    description:
      "Rejoignez 1200+ traders. Journal de trading gratuit avec IA, analytics avancés et 35+ outils professionnels. Inscription en 30 secondes.",
    url: "https://marketphase.vercel.app/register",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Créer un Compte Gratuit | MarketPhase",
    description:
      "Rejoignez 1200+ traders. Journal de trading gratuit avec IA, analytics avancés et 35+ outils professionnels. Inscription en 30 secondes.",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
