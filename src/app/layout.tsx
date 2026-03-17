import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { ToastProvider } from "@/components/Toast";
import { CommandPalette } from "@/components/CommandPalette";

export const metadata: Metadata = {
  metadataBase: new URL("https://protrade-journal.vercel.app"),
  title: {
    default: "MarketPhase - Journal de Trading Professionnel",
    template: "%s | MarketPhase",
  },
  description:
    "Suivez vos trades, analysez vos performances et améliorez votre trading avec MarketPhase. Journal de trading gratuit avec intelligence artificielle.",
  keywords: [
    "journal de trading",
    "trading journal",
    "analyse trading",
    "performance trading",
    "MarketPhase",
    "journal trading gratuit",
    "AI trading",
    "forex journal",
    "stock trading journal",
  ],
  openGraph: {
    title: "MarketPhase - Journal de Trading Professionnel",
    description:
      "Suivez vos trades, analysez vos performances et améliorez votre trading avec MarketPhase.",
    url: "https://protrade-journal.vercel.app",
    siteName: "MarketPhase",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MarketPhase",
  description:
    "Journal de trading professionnel avec intelligence artificielle pour suivre, analyser et améliorer vos performances de trading.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  url: "https://protrade-journal.vercel.app",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function() {
            try {
              var theme = localStorage.getItem('theme') || 'dark';
              document.documentElement.className = theme;
            } catch(e) {}
          })();
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
