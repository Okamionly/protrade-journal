"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n/context";
import {
  RefreshCw,
  Flame,
  Droplets,
  Zap,
  CircleDot,
  Wheat,
  Sprout,
  Shirt,
  Candy,
  Coffee,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CommodityItem {
  commodity: string;
  price: number;
  date: string;
  change: number;
  history: number[];
  isFallback?: boolean;
}

type GroupKey = "energy" | "metals" | "agriculture";

interface CommodityGroup {
  key: GroupKey;
  labelKey: string;
  items: string[];
}

const GROUPS: CommodityGroup[] = [
  {
    key: "energy",
    labelKey: "commodities_groupEnergy",
    items: ["WTI", "Brent", "Gaz naturel"],
  },
  {
    key: "metals",
    labelKey: "commodities_groupMetals",
    items: ["Cuivre"],
  },
  {
    key: "agriculture",
    labelKey: "commodities_groupAgri",
    items: ["Blé", "Maïs", "Coton", "Sucre", "Café"],
  },
];

// Map commodity name to icon
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  WTI: Flame,
  Brent: Droplets,
  "Gaz naturel": Zap,
  Cuivre: CircleDot,
  "Blé": Wheat,
  "Maïs": Sprout,
  Coton: Shirt,
  Sucre: Candy,
  "Café": Coffee,
};

// Map commodity name to i18n key
const NAME_KEY_MAP: Record<string, string> = {
  WTI: "commodities_wti",
  Brent: "commodities_brent",
  "Gaz naturel": "commodities_naturalGas",
  Cuivre: "commodities_copper",
  "Blé": "commodities_wheat",
  "Maïs": "commodities_corn",
  Coton: "commodities_cotton",
  Sucre: "commodities_sugar",
  "Café": "commodities_coffee",
};

// ---------------------------------------------------------------------------
// Mini Sparkline SVG
// ---------------------------------------------------------------------------
function Sparkline({
  data,
  positive,
}: {
  data: number[];
  positive: boolean;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  const color = positive ? "#22c55e" : "#ef4444";

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Commodity Card
// ---------------------------------------------------------------------------
function CommodityCard({
  item,
  t,
}: {
  item: CommodityItem;
  t: (key: string) => string;
}) {
  const Icon = ICON_MAP[item.commodity] ?? Flame;
  const nameKey = NAME_KEY_MAP[item.commodity] ?? item.commodity;
  const isPositive = item.change >= 0;
  const isZero = item.change === 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 flex flex-col gap-3 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {t(nameKey)}
          </span>
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            isZero
              ? "bg-gray-100 dark:bg-gray-800 text-gray-500"
              : isPositive
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-red-500/10 text-red-500"
          }`}
        >
          {isZero ? (
            <Minus className="w-3 h-3" />
          ) : isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {isPositive && item.change > 0 ? "+" : ""}
          {item.change.toFixed(2)}%
        </div>
      </div>

      {/* Price + sparkline */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {item.price.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{item.date}</p>
          {item.isFallback && (
            <p className="text-[10px] text-amber-500 mt-0.5">
              {t("commodities_fallbackNote") !== "commodities_fallbackNote"
                ? t("commodities_fallbackNote")
                : "Donn\u00e9es en cache"}
            </p>
          )}
        </div>
        <Sparkline data={item.history} positive={isPositive} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function CommoditiesPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<CommodityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/commodities");
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        setData(json);
      } else if (json.error) {
        // API returned an error but we still want to show something
        setError(json.error);
        // Keep existing data if we have it
        if (data.length === 0) {
          setData([]); // will show empty state
        }
      } else {
        setData([]);
      }
    } catch {
      setError(t("commodities_error"));
      // Keep existing data on network error
    } finally {
      setLoading(false);
    }
  }, [t, data.length]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = (groupItems: string[]) =>
    groupItems
      .map((name) => data.find((d) => d.commodity === name))
      .filter((d): d is CommodityItem => d !== undefined);

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("commodities_title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("commodities_subtitle")}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {t("commodities_refresh")}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && data.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 h-[120px] animate-pulse"
            >
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Groups */}
      {!loading &&
        data.length > 0 &&
        GROUPS.map((group) => {
          const items = grouped(group.items);
          if (items.length === 0) return null;
          return (
            <section key={group.key}>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                {t(group.labelKey)}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <CommodityCard key={item.commodity} item={item} t={t} />
                ))}
              </div>
            </section>
          );
        })}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          {t("commodities_noData")}
        </div>
      )}

      {/* Source note */}
      {data.length > 0 && (
        <p className="text-[11px] text-gray-400 text-center">
          {t("commodities_source")}
        </p>
      )}
    </div>
  );
}
