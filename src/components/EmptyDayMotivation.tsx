"use client";

import { useState, useEffect } from "react";
import { X, Coffee } from "lucide-react";

const QUOTES = [
  {
    main: "Pas de trade aujourd\u2019hui ? C\u2019est aussi une bonne d\u00e9cision. \uD83D\uDCAA",
    sub: "Les meilleurs traders savent quand ne pas trader.",
  },
  {
    main: "Le march\u00e9 sera l\u00e0 demain. Votre capital aussi. \uD83D\uDEE1\uFE0F",
    sub: "Prot\u00e9ger son capital, c\u2019est d\u00e9j\u00e0 gagner.",
  },
  {
    main: "Patience et discipline : vos meilleurs alli\u00e9s. \u23F3",
    sub: "Un jour sans trade n\u2019est jamais un jour perdu.",
  },
  {
    main: "Savoir rester \u00e0 l\u2019\u00e9cart, c\u2019est un edge. \uD83C\uDFAF",
    sub: "Les opportunit\u00e9s reviennent toujours.",
  },
  {
    main: "Repos strat\u00e9gique. Revenez demain pour votre briefing. \u2615",
    sub: "Les traders rentables ne forcent jamais un trade.",
  },
];

interface EmptyDayMotivationProps {
  todayTradesCount: number;
}

export function EmptyDayMotivation({ todayTradesCount }: EmptyDayMotivationProps) {
  const [dismissed, setDismissed] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Pick a quote based on the day so it's stable per day
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    setQuoteIndex(dayOfYear % QUOTES.length);
  }, []);

  useEffect(() => {
    // Only show after 16:00 (market close) and when no trades today
    const hour = new Date().getHours();
    if (todayTradesCount === 0 && hour >= 16) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [todayTradesCount]);

  if (!visible || dismissed) return null;

  const quote = QUOTES[quoteIndex];

  return (
    <div
      className="rounded-2xl p-5 mb-6 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))",
        border: "1px solid rgba(99,102,241,0.2)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: "var(--text-muted)" }}
        title="Fermer"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(99,102,241,0.15)" }}
        >
          <Coffee className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            {quote.main}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {quote.sub}
          </p>
          <p className="text-xs mt-2 font-medium text-indigo-400">
            Revenez demain pour votre briefing personnalis&eacute;.
          </p>
        </div>
      </div>
    </div>
  );
}
