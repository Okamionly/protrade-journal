import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { ToastProvider } from "@/components/Toast";
import { CommandPalette } from "@/components/CommandPalette";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://marketphase.vercel.app"),
  title: {
    default: "Journal de Trading Gratuit avec IA | MarketPhase - 35+ Outils d'Analyse Trading",
    template: "%s | MarketPhase - Journal de Trading Gratuit",
  },
  description:
    "Journal de trading gratuit en ligne avec IA : analytics, AI Coach, market data live. Outil trading gratuit pour analyse trading. Essayez maintenant !",
  keywords: [
    "journal de trading gratuit",
    "journal de trading",
    "trading journal free",
    "journal trading en ligne",
    "outil trading gratuit",
    "analyse trading",
    "trading journal",
    "best trading journal",
    "trading journal app",
    "free trading journal",
    "performance trading",
    "MarketPhase",
    "AI trading journal",
    "forex trading journal",
    "stock trading journal",
    "options trading journal",
    "trading analytics",
    "trade tracker",
    "TradeZella alternative",
    "trading psychology journal",
    "trading performance tracker",
    "journal de trading en ligne gratuit",
    "meilleur journal de trading",
    "suivi trades gratuit",
  ],
  openGraph: {
    title: "Journal de Trading Gratuit avec IA | MarketPhase",
    description:
      "35+ outils de trading pro : analytics, AI Coach, market data live, options flow. 100% gratuit. Commencez maintenant !",
    url: "https://marketphase.vercel.app",
    siteName: "MarketPhase",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "MarketPhase - Journal de Trading Gratuit avec IA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Journal de Trading Gratuit avec IA | MarketPhase",
    description: "35+ outils de trading pro. Analytics, AI Coach, Market Data. 100% gratuit. Essayez maintenant !",
    images: [{ url: "/twitter-image", width: 1200, height: 630, alt: "MarketPhase - Journal de Trading Gratuit avec IA" }],
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
    languages: {
      "fr": "https://marketphase.vercel.app",
      "en": "https://marketphase.vercel.app/en",
      "es": "https://marketphase.vercel.app/es",
      "de": "https://marketphase.vercel.app/de",
      "ar": "https://marketphase.vercel.app/ar",
      "x-default": "https://marketphase.vercel.app",
    },
  },
  verification: {
    google: "1ovgGf31NCAaEWZgILyqtlaCksw5vElLLrU6-p66jS0",
  },
};

const jsonLdSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MarketPhase",
    alternateName: "MarketPhase Trading Journal",
    description:
      "Journal de trading gratuit en ligne avec intelligence artificielle. 35+ outils professionnels : analytics avancés, AI Coach, market data live, options flow, gestion du risque.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: "https://marketphase.vercel.app",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "1200",
      bestRating: "5",
      worstRating: "1",
    },
    featureList:
      "Trading Journal, Analytics, AI Coach, Market Data, Options Flow, Risk Management, P&L Calendar, Trade Replay, Market Scanner",
    inLanguage: ["fr", "en"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MarketPhase",
    url: "https://marketphase.vercel.app",
    logo: "https://marketphase.vercel.app/logo-icon.png",
    sameAs: [
      "https://twitter.com/MarketPhaseApp",
      "https://www.youtube.com/@MarketPhase",
      "https://github.com/MarketPhase",
    ],
    description:
      "MarketPhase est un journal de trading gratuit avec IA, concu pour les traders qui veulent ameliorer leurs performances.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MarketPhase",
    url: "https://marketphase.vercel.app",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://marketphase.vercel.app/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "C'est vraiment gratuit ? Quel est le piege ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Aucun piege. MarketPhase est 100% gratuit avec 35+ outils. Nous proposons un abonnement VIP optionnel (9,99\u20ac/mois) pour des analyses macro et indicateurs exclusifs, mais l'app complete reste gratuite pour toujours.",
        },
      },
      {
        "@type": "Question",
        name: "Mes donnees de trading sont-elles en securite ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolument. Vos donnees sont chiffrees et stockees de maniere securisee. Nous ne vendons jamais vos donnees a des tiers.",
        },
      },
      {
        "@type": "Question",
        name: "Puis-je annuler le VIP a tout moment ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, en un clic depuis votre profil. Aucun engagement, aucune penalite. Vous gardez l'acces gratuit apres annulation.",
        },
      },
    ],
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`dark ${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://marketphase.vercel.app" />
        <link rel="preconnect" href="https://marketphase.vercel.app" />
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
{/* SW registration removed — no public/sw.js exists; re-add when a service worker is created */}
      </head>
      <body className="antialiased min-h-screen overflow-x-hidden">
        {jsonLdSchemas.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
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
