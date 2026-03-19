"use client";

import { useState, useEffect, useRef } from "react";

interface TickerItem {
  symbol: string;
  price: string;
  change: number;
}

// Store previous prices to calculate real changes
let previousPrices: Record<string, number> = {};

export function LiveTicker() {
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Fetch real forex rates from our API
        const res = await fetch("/api/currency-strength");
        if (!res.ok) throw new Error("API error");
        const json = await res.json();

        if (json.rates) {
          const r = json.rates;

          // Calculate real prices from USD-based rates
          const pairs: Array<{ symbol: string; value: number; decimals: number }> = [
            { symbol: "EUR/USD", value: 1 / (r.EUR || 1), decimals: 4 },
            { symbol: "GBP/USD", value: 1 / (r.GBP || 1), decimals: 4 },
            { symbol: "USD/JPY", value: r.JPY || 149, decimals: 2 },
            { symbol: "AUD/USD", value: 1 / (r.AUD || 1), decimals: 4 },
            { symbol: "USD/CAD", value: r.CAD || 1.36, decimals: 4 },
            { symbol: "USD/CHF", value: r.CHF || 0.88, decimals: 4 },
            { symbol: "NZD/USD", value: 1 / (r.NZD || 1), decimals: 4 },
            { symbol: "EUR/GBP", value: (r.GBP || 1) / (r.EUR || 1), decimals: 4 },
            { symbol: "EUR/JPY", value: (r.JPY || 149) / (r.EUR || 1), decimals: 2 },
            { symbol: "GBP/JPY", value: (r.JPY || 149) / (r.GBP || 1), decimals: 2 },
          ];

          const updated: TickerItem[] = pairs.map((p) => {
            const prev = previousPrices[p.symbol];
            let change = 0;
            if (prev && prev !== 0) {
              change = ((p.value - prev) / prev) * 100;
            }
            previousPrices[p.symbol] = p.value;
            return {
              symbol: p.symbol,
              price: p.value.toFixed(p.decimals),
              change: parseFloat(change.toFixed(2)),
            };
          });

          setTickers(updated);
        }
      } catch {
        // If API fails, show message
        if (tickers.length === 0) {
          setTickers([
            { symbol: "EUR/USD", price: "---", change: 0 },
            { symbol: "GBP/USD", price: "---", change: 0 },
            { symbol: "USD/JPY", price: "---", change: 0 },
          ]);
        }
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Smooth scrolling animation with requestAnimationFrame
  useEffect(() => {
    const animate = () => {
      offsetRef.current += 0.5;
      if (containerRef.current) {
        const totalWidth = containerRef.current.scrollWidth / 2;
        if (offsetRef.current >= totalWidth) offsetRef.current = 0;
        containerRef.current.style.transform = `translateX(-${offsetRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  if (tickers.length === 0) return null;

  const doubled = [...tickers, ...tickers];

  return (
    <div className="w-full h-8 bg-gray-100/90 dark:bg-gray-950/80 oled:bg-black border-b border-gray-200 dark:border-gray-800 overflow-hidden relative">
      <div
        ref={containerRef}
        className="flex items-center h-full gap-8 whitespace-nowrap absolute"
      >
        {doubled.map((t, i) => (
          <div key={`${t.symbol}-${i}`} className="flex items-center gap-2 px-2">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {t.symbol}
            </span>
            <span className="text-[11px] font-bold mono text-gray-800 dark:text-white">
              {t.price}
            </span>
            {t.price !== "---" && (
              <span
                className={`text-[10px] font-bold mono ${
                  t.change > 0
                    ? "text-emerald-500 dark:text-emerald-400"
                    : t.change < 0
                    ? "text-rose-500 dark:text-rose-400"
                    : "text-gray-400"
                }`}
              >
                {t.change > 0 ? "+" : ""}
                {t.change.toFixed(2)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
