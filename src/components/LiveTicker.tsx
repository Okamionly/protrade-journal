"use client";

import { useState, useEffect } from "react";

interface TickerItem {
  symbol: string;
  price: string;
  change: number;
}

const FALLBACK_TICKERS: TickerItem[] = [
  { symbol: "EUR/USD", price: "1.0845", change: 0.12 },
  { symbol: "GBP/USD", price: "1.2654", change: -0.08 },
  { symbol: "USD/JPY", price: "149.32", change: 0.25 },
  { symbol: "GOLD", price: "2,178.50", change: 0.45 },
  { symbol: "BTC", price: "87,234", change: 1.23 },
  { symbol: "S&P 500", price: "5,234.18", change: 0.34 },
  { symbol: "DXY", price: "103.42", change: -0.15 },
  { symbol: "EUR/GBP", price: "0.8571", change: 0.05 },
];

export function LiveTicker() {
  const [tickers, setTickers] = useState<TickerItem[]>(FALLBACK_TICKERS);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/currency-strength");
        if (res.ok) {
          const json = await res.json();
          if (json.rates) {
            const base = json.rates;
            const updated: TickerItem[] = [
              { symbol: "EUR/USD", price: (1 / (base.EUR || 1)).toFixed(4), change: parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)) },
              { symbol: "GBP/USD", price: (1 / (base.GBP || 1)).toFixed(4), change: parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)) },
              { symbol: "USD/JPY", price: (base.JPY || 149).toFixed(2), change: parseFloat((Math.random() * 0.5 - 0.25).toFixed(2)) },
              { symbol: "AUD/USD", price: (1 / (base.AUD || 1)).toFixed(4), change: parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)) },
              { symbol: "USD/CAD", price: (base.CAD || 1.36).toFixed(4), change: parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)) },
              { symbol: "USD/CHF", price: (base.CHF || 0.88).toFixed(4), change: parseFloat((Math.random() * 0.3 - 0.15).toFixed(2)) },
              { symbol: "NZD/USD", price: (1 / (base.NZD || 1)).toFixed(4), change: parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)) },
              { symbol: "DXY", price: "103.42", change: parseFloat((Math.random() * 0.3 - 0.15).toFixed(2)) },
            ];
            setTickers(updated);
          }
        }
      } catch {
        // keep fallback
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scrolling animation
  useEffect(() => {
    const timer = setInterval(() => {
      setOffset((prev) => prev + 1);
    }, 30);
    return () => clearInterval(timer);
  }, []);

  const doubled = [...tickers, ...tickers];

  return (
    <div className="w-full h-8 bg-gray-950/80 border-b border-gray-800 overflow-hidden relative">
      <div
        className="flex items-center h-full gap-8 whitespace-nowrap absolute"
        style={{ transform: `translateX(-${offset % (tickers.length * 160)}px)` }}
      >
        {doubled.map((t, i) => (
          <div key={`${t.symbol}-${i}`} className="flex items-center gap-2 px-2">
            <span className="text-[11px] font-medium text-gray-400">{t.symbol}</span>
            <span className="text-[11px] font-bold mono text-white">{t.price}</span>
            <span className={`text-[10px] font-bold mono ${t.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {t.change >= 0 ? "+" : ""}{t.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
