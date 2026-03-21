import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { ToastProvider } from "@/components/Toast";
import { CommandPalette } from "@/components/CommandPalette";

export const metadata: Metadata = {
  metadataBase: new URL("https://marketphase.vercel.app"),
  title: {
    default: "MarketPhase - Journal de Trading Gratuit avec IA | 35+ Outils",
    template: "%s | MarketPhase - Journal de Trading",
  },
  description:
    "MarketPhase est le journal de trading gratuit le plus complet : 35+ outils, analytics avancés, AI Coach, market data live, options flow, gestion du risque. Alternative gratuite à TradeZella.",
  keywords: [
    "journal de trading",
    "trading journal",
    "journal de trading gratuit",
    "best trading journal",
    "trading journal app",
    "free trading journal",
    "analyse trading",
    "performance trading",
    "MarketPhase",
    "AI trading journal",
    "forex trading journal",
    "stock trading journal",
    "options trading journal",
    "trading analytics",
    "trade tracker",
    "TradeZella alternative",
    "journal trading en ligne",
    "outil trading gratuit",
    "trading psychology journal",
    "trading performance tracker",
  ],
  openGraph: {
    title: "MarketPhase - Journal de Trading Gratuit avec IA",
    description:
      "35+ outils de trading professionnels : analytics, AI Coach, market data live, options flow. 100% gratuit, pour toujours.",
    url: "https://marketphase.vercel.app",
    siteName: "MarketPhase",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/og-image.png", width: 800, height: 400, alt: "MarketPhase - Time Creates Opportunity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MarketPhase - Journal de Trading Gratuit avec IA",
    description: "35+ outils de trading professionnels. Analytics, AI Coach, Market Data. 100% gratuit.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://marketphase.vercel.app",
  },
  verification: {
    google: "1ovgGf31NCAaEWZgILyqtlaCksw5vElLLrU6-p66jS0",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MarketPhase",
  alternateName: "MarketPhase Trading Journal",
  description:
    "Journal de trading professionnel gratuit avec intelligence artificielle. 35+ outils : analytics avancés, AI Coach, market data live, options flow, gestion du risque.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  url: "https://marketphase.vercel.app",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
  },
  featureList: "Trading Journal, Analytics, AI Coach, Market Data, Options Flow, Risk Management, P&L Calendar, Trade Replay, Market Scanner",
  inLanguage: ["fr", "en"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/logo-icon.png" />
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function() {
            try {
              var theme = localStorage.getItem('theme') || 'dark';
              document.documentElement.className = theme;
            } catch(e) {}
          })();
        `}</Script>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          }
        `}</Script>
      </head>
      <body className="antialiased min-h-screen overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SessionProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
              <CommandPalette />
            </ToastProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
