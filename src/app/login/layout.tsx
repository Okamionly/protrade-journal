import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connectez-vous à MarketPhase pour accéder à votre journal de trading gratuit. Analytics, AI Coach, market data live et 35+ outils professionnels.",
  openGraph: {
    title: "Connexion | MarketPhase",
    description:
      "Accédez à votre journal de trading gratuit avec IA. Retrouvez vos trades, analytics et outils de performance.",
    url: "https://marketphase.vercel.app/login",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Connexion | MarketPhase",
    description:
      "Accédez à votre journal de trading gratuit avec IA. Retrouvez vos trades, analytics et outils de performance.",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
