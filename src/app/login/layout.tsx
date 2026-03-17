import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Se connecter",
  description: "Connectez-vous à votre journal de trading MarketPhase. Accédez à vos analytics, AI Coach et 35+ outils de trading.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
