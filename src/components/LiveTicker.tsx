"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PriceItem {
  symbol: string;
  price: number;
  change: number;
}

interface LivePricesResponse {
  forex: PriceItem[];
  crypto: PriceItem[];
  commodities: PriceItem[];
  indices: PriceItem[];
  timestamp: number;
}

type Category = "forex" | "crypto" | "commodity" | "index";

interface TickerEntry {
  symbol: string;
  price: string;
  change: number;
  category: Category;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function formatPrice(symbol: string, price: number): string {
  // JPY pairs: 2 decimals
  if (symbol.includes("JPY")) return price.toFixed(2);
  // Crypto: no decimals, with comma grouping
  if (symbol.startsWith("BTC") || symbol.startsWith("ETH")) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  // Gold: 1 decimal
  if (symbol.startsWith("XAU")) return price.toFixed(1);
  // S&P 500 / DXY indices
  if (symbol === "S&P 500") return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (symbol === "DXY") return price.toFixed(2);
  // Default forex: 4 decimals
  return price.toFixed(4);
}

// ---------------------------------------------------------------------------
// Category icon + color mapping
// ---------------------------------------------------------------------------
function categoryIcon(cat: Category): string {
  switch (cat) {
    case "crypto":
      return "\u20BF"; // Bitcoin symbol
    case "commodity":
      return "\u2B50"; // star (gold)
    case "index":
      return "\u25B2"; // triangle
    default:
      return "";
  }
}

function categoryClasses(cat: Category): string {
  switch (cat) {
    case "crypto":
      return "text-amber-500 dark:text-amber-400";
    case "commodity":
      return "text-yellow-500 dark:text-yellow-400";
    case "index":
      return "text-blue-500 dark:text-blue-400";
    default:
      return "text-gray-500 dark:text-gray-400";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function LiveTicker() {
  const [tickers, setTickers] = useState<TickerEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const animRef = useRef<number>(0);

  // ----- Data fetching -----
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/live-prices");
      if (!res.ok) throw new Error("API error");
      const json: LivePricesResponse = await res.json();

      const entries: TickerEntry[] = [];

      // Forex
      json.forex.forEach((p) =>
        entries.push({
          symbol: p.symbol,
          price: formatPrice(p.symbol, p.price),
          change: p.change,
          category: "forex",
        })
      );

      // Crypto
      json.crypto.forEach((p) =>
        entries.push({
          symbol: p.symbol,
          price: formatPrice(p.symbol, p.price),
          change: p.change,
          category: "crypto",
        })
      );

      // Commodities
      json.commodities.forEach((p) =>
        entries.push({
          symbol: p.symbol,
          price: formatPrice(p.symbol, p.price),
          change: p.change,
          category: "commodity",
        })
      );

      // Indices
      json.indices.forEach((p) =>
        entries.push({
          symbol: p.symbol,
          price: formatPrice(p.symbol, p.price),
          change: p.change,
          category: "index",
        })
      );

      if (entries.length > 0) setTickers(entries);
    } catch {
      // On first failure, show placeholder
      if (tickers.length === 0) {
        setTickers([
          { symbol: "EUR/USD", price: "---", change: 0, category: "forex" },
          { symbol: "GBP/USD", price: "---", change: 0, category: "forex" },
          { symbol: "USD/JPY", price: "---", change: 0, category: "forex" },
          { symbol: "BTC/USD", price: "---", change: 0, category: "crypto" },
          { symbol: "XAU/USD", price: "---", change: 0, category: "commodity" },
        ]);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // ----- Smooth RAF scrolling animation -----
  useEffect(() => {
    const animate = () => {
      offsetRef.current += 0.5;
      if (containerRef.current) {
        const totalWidth = containerRef.current.scrollWidth / 2;
        if (totalWidth > 0 && offsetRef.current >= totalWidth) {
          offsetRef.current = 0;
        }
        containerRef.current.style.transform = `translateX(-${offsetRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  if (tickers.length === 0) return null;

  // Double entries for seamless loop
  const doubled = [...tickers, ...tickers];

  return (
    <div className="w-full h-8 bg-white/95 dark:bg-zinc-900/95 oled:bg-black border-b border-[var(--border)] overflow-hidden relative">
      <div
        ref={containerRef}
        className="flex items-center h-full gap-8 whitespace-nowrap absolute"
      >
        {doubled.map((t, i) => {
          const icon = categoryIcon(t.category);
          const catColor = categoryClasses(t.category);
          return (
            <div
              key={`${t.symbol}-${i}`}
              className="flex items-center gap-1.5 px-2"
            >
              {/* Category icon */}
              {icon && (
                <span className={`text-[10px] ${catColor}`}>{icon}</span>
              )}

              {/* Symbol */}
              <span
                className={`text-[11px] font-medium ${catColor}`}
              >
                {t.symbol}
              </span>

              {/* Price */}
              <span className="text-[11px] font-bold mono text-gray-800 dark:text-white">
                {t.price}
              </span>

              {/* Change % */}
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
          );
        })}
      </div>
    </div>
  );
}
