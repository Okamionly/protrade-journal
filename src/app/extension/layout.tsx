import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trade Clipper — Extension Chrome pour Journal de Trading | MarketPhase",
  description:
    "Capturez vos trades TradingView en 1 clic avec l'extension Chrome MarketPhase Trade Clipper. Screenshot automatique du chart, remplissage auto des champs, envoi direct dans votre journal de trading.",
  keywords: [
    "trading journal browser extension",
    "extension chrome trading",
    "TradingView extension",
    "capture trade TradingView",
    "journal de trading extension",
    "trade clipper",
    "MarketPhase extension",
    "enregistrer trades automatiquement",
    "screenshot chart trading",
    "extension navigateur trading",
  ],
  alternates: {
    canonical: "https://marketphase.vercel.app/extension",
  },
  openGraph: {
    title: "MarketPhase Trade Clipper — Enregistrez vos trades en 1 clic",
    description:
      "Extension Chrome pour capturer vos trades TradingView automatiquement. Screenshot du chart, remplissage auto, envoi direct dans votre journal MarketPhase.",
  },
};

export default function ExtensionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
