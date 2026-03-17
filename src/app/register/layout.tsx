import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte gratuit",
  description: "Créez votre compte MarketPhase gratuit et accédez à 35+ outils de trading : journal intelligent, analytics avancés, AI Coach, market data live.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
