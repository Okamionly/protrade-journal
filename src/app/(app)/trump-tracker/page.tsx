"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "@/i18n/context";
import { useTrades } from "@/hooks/useTrades";
import {
  Flag,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Shield,
  DollarSign,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Newspaper,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  Filter,
  Activity,
  Globe,
  Flame,
  Gavel,
  Landmark,
  Ban,
  FileText,
} from "lucide-react";

// ============================================================
// Types
// ============================================================

type MarketImpact = "bullish" | "bearish" | "neutral";

interface TimelineEntry {
  date: string;
  title: string;
  description: string;
  impacts: { asset: string; impact: MarketImpact }[];
  category: "tariff" | "trade_deal" | "fed" | "tax" | "sanctions" | "executive_order";
}

interface TariffEntry {
  country: string;
  rate: number;
  effectiveDate: string;
  status: "Actif" | "Suspendu" | "Menace";
  estimatedImpact: string;
}

interface TrumpNewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: "bullish" | "bearish" | "neutral";
  imageUrl: string;
}

interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
}

// ============================================================
// Data
// ============================================================

const TIMELINE_DATA: TimelineEntry[] = [
  {
    date: "2026-03-15",
    title: "Hausse des tarifs sur les semi-conducteurs chinois",
    description: "Augmentation des droits de douane de 25% a 50% sur les puces electroniques importees de Chine, visant a renforcer la production domestique.",
    impacts: [
      { asset: "USD", impact: "bullish" },
      { asset: "Actions", impact: "bearish" },
      { asset: "Or", impact: "bullish" },
    ],
    category: "tariff",
  },
  {
    date: "2026-03-08",
    title: "Accord commercial partiel avec le Royaume-Uni",
    description: "Signature d'un accord de libre-echange partiel reduisant les barrieres sur les services financiers et l'agriculture.",
    impacts: [
      { asset: "USD", impact: "neutral" },
      { asset: "Actions", impact: "bullish" },
      { asset: "Or", impact: "bearish" },
    ],
    category: "trade_deal",
  },
  {
    date: "2026-02-28",
    title: "Pression sur la Fed pour baisser les taux",
    description: "Declarations publiques exigeant une baisse de 50 points de base des taux directeurs pour stimuler l'economie.",
    impacts: [
      { asset: "USD", impact: "bearish" },
      { asset: "Actions", impact: "bullish" },
      { asset: "Or", impact: "bullish" },
    ],
    category: "fed",
  },
  {
    date: "2026-02-20",
    title: "Nouvelles sanctions contre l'Iran",
    description: "Renforcement des sanctions petrolieres contre l'Iran, impactant l'offre mondiale de petrole brut.",
    impacts: [
      { asset: "USD", impact: "bullish" },
      { asset: "Actions", impact: "bearish" },
      { asset: "Or", impact: "bullish" },
    ],
    category: "sanctions",
  },
  {
    date: "2026-02-12",
    title: "Extension du Tax Cuts and Jobs Act",
    description: "Prolongation des baisses d'impots sur les entreprises jusqu'en 2032, taux d'imposition maintenu a 21%.",
    impacts: [
      { asset: "USD", impact: "bullish" },
      { asset: "Actions", impact: "bullish" },
      { asset: "Or", impact: "neutral" },
    ],
    category: "tax",
  },
  {
    date: "2026-02-01",
    title: "Tarifs de 25% sur les vehicules europeens",
    description: "Imposition de droits de douane de 25% sur toutes les importations automobiles de l'Union europeenne.",
    impacts: [
      { asset: "USD", impact: "bullish" },
      { asset: "Actions", impact: "bearish" },
      { asset: "Or", impact: "bullish" },
    ],
    category: "tariff",
  },
  {
    date: "2026-01-20",
    title: "Menace de retrait de l'OMC",
    description: "Declaration d'intention de quitter l'Organisation mondiale du commerce si les reformes ne sont pas adoptees.",
    impacts: [
      { asset: "USD", impact: "bearish" },
      { asset: "Actions", impact: "bearish" },
      { asset: "Or", impact: "bullish" },
    ],
    category: "trade_deal",
  },
  {
    date: "2026-01-10",
    title: "Tarifs de represailles contre le Canada",
    description: "Imposition de tarifs de 15% sur le bois, l'aluminium et les produits laitiers canadiens en reponse aux restrictions sur les exportations US.",
    impacts: [
      { asset: "USD", impact: "neutral" },
      { asset: "Actions", impact: "bearish" },
      { asset: "Or", impact: "bullish" },
    ],
    category: "tariff",
  },
  {
    date: "2025-12-18",
    title: "Decret sur le rapatriement des capitaux",
    description: "Incitations fiscales pour le rapatriement des benefices des entreprises americaines a l'etranger avec un taux reduit de 8%.",
    impacts: [
      { asset: "USD", impact: "bullish" },
      { asset: "Actions", impact: "bullish" },
      { asset: "Or", impact: "bearish" },
    ],
    category: "tax",
  },
  {
    date: "2025-12-05",
    title: "Suspension temporaire des tarifs sur le Mexique",
    description: "Pause de 90 jours sur les tarifs mexicains en echange de mesures renforcees a la frontiere.",
    impacts: [
      { asset: "USD", impact: "neutral" },
      { asset: "Actions", impact: "bullish" },
      { asset: "Or", impact: "bearish" },
    ],
    category: "tariff",
  },
  {
    date: "2025-11-20",
    title: "Sanctions contre la Russie renforcees",
    description: "Nouvelles restrictions sur les exportations technologiques vers la Russie et gel d'actifs supplementaires.",
    impacts: [
      { asset: "USD", impact: "bullish" },
      { asset: "Actions", impact: "neutral" },
      { asset: "Or", impact: "bullish" },
    ],
    category: "sanctions",
  },
  {
    date: "2025-11-08",
    title: "Augmentation des tarifs sur l'acier mondial",
    description: "Hausse des droits de douane sur l'acier importe de 25% a 40% pour tous les pays sauf le Royaume-Uni.",
    impacts: [
      { asset: "USD", impact: "bullish" },
      { asset: "Actions", impact: "bearish" },
      { asset: "Or", impact: "bullish" },
    ],
    category: "tariff",
  },
  {
    date: "2025-10-25",
    title: "Accord commercial Phase 2 avec la Chine",
    description: "Signature d'un accord elargissant les achats chinois de produits agricoles et energetiques americains de 200 milliards USD.",
    impacts: [
      { asset: "USD", impact: "neutral" },
      { asset: "Actions", impact: "bullish" },
      { asset: "Or", impact: "bearish" },
    ],
    category: "trade_deal",
  },
  {
    date: "2025-10-10",
    title: "Decret executif : Buy American renforcee",
    description: "Obligation pour toutes les agences federales d'acheter exclusivement des produits fabriques aux Etats-Unis pour les contrats publics.",
    impacts: [
      { asset: "USD", impact: "bullish" },
      { asset: "Actions", impact: "bullish" },
      { asset: "Or", impact: "neutral" },
    ],
    category: "executive_order",
  },
  {
    date: "2025-09-28",
    title: "Critique publique du president de la Fed",
    description: "Tweet qualifiant Jerome Powell de 'pire president de la Fed de l'histoire' et menace de destitution.",
    impacts: [
      { asset: "USD", impact: "bearish" },
      { asset: "Actions", impact: "bearish" },
      { asset: "Or", impact: "bullish" },
    ],
    category: "fed",
  },
  {
    date: "2025-09-15",
    title: "Tarifs sur les panneaux solaires chinois",
    description: "Imposition de droits anti-dumping de 60% sur les panneaux solaires et batteries lithium importes de Chine.",
    impacts: [
      { asset: "USD", impact: "bullish" },
      { asset: "Actions", impact: "bearish" },
      { asset: "Or", impact: "neutral" },
    ],
    category: "tariff",
  },
];

const TARIFF_DATA: TariffEntry[] = [
  { country: "Chine", rate: 50, effectiveDate: "2026-03-15", status: "Actif", estimatedImpact: "Fort negatif - risque de recession des echanges" },
  { country: "Union Europeenne", rate: 25, effectiveDate: "2026-02-01", status: "Actif", estimatedImpact: "Negatif - hausse des prix automobiles" },
  { country: "Canada", rate: 15, effectiveDate: "2026-01-10", status: "Actif", estimatedImpact: "Modere - impact sur construction et agriculture" },
  { country: "Mexique", rate: 20, effectiveDate: "2025-12-05", status: "Suspendu", estimatedImpact: "Suspendu - conditionnel a la frontiere" },
  { country: "Japon", rate: 10, effectiveDate: "2025-08-15", status: "Actif", estimatedImpact: "Modere - automobile et electronique" },
  { country: "Coree du Sud", rate: 15, effectiveDate: "2025-07-01", status: "Actif", estimatedImpact: "Modere - semi-conducteurs et automobile" },
  { country: "Inde", rate: 20, effectiveDate: "2025-11-01", status: "Menace", estimatedImpact: "Eleve si applique - tech et pharma" },
  { country: "Taivwan", rate: 10, effectiveDate: "2025-06-15", status: "Actif", estimatedImpact: "Semi-conducteurs - TSMC impacte" },
  { country: "Bresil", rate: 12, effectiveDate: "2026-01-20", status: "Menace", estimatedImpact: "Agriculture et minerais" },
  { country: "Vietnam", rate: 35, effectiveDate: "2025-09-01", status: "Actif", estimatedImpact: "Fort - reorientation des chaines d'approvisionnement" },
];

const CATEGORY_FILTERS = [
  { key: "all", label: "Tout" },
  { key: "tariff", label: "Tarifs" },
  { key: "trade_deal", label: "Accords" },
  { key: "fed", label: "Fed" },
  { key: "tax", label: "Fiscalite" },
  { key: "sanctions", label: "Sanctions" },
  { key: "executive_order", label: "Decrets" },
] as const;

// Target date for next decision countdown
const NEXT_DECISION_DATE = new Date("2026-03-28T14:00:00Z");

// ============================================================
// Helpers
// ============================================================

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function impactIcon(impact: MarketImpact) {
  if (impact === "bullish") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (impact === "bearish") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-amber-400" />;
}

function impactColor(impact: MarketImpact) {
  if (impact === "bullish") return "text-emerald-400";
  if (impact === "bearish") return "text-red-400";
  return "text-amber-400";
}

function categoryColor(cat: TimelineEntry["category"]) {
  const map: Record<string, string> = {
    tariff: "bg-red-500/20 text-red-400 border-red-500/30",
    trade_deal: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    fed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    tax: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    sanctions: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    executive_order: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  };
  return map[cat] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

function categoryLabel(cat: TimelineEntry["category"]) {
  const map: Record<string, string> = {
    tariff: "Tarif douanier",
    trade_deal: "Accord commercial",
    fed: "Politique Fed",
    tax: "Fiscalite",
    sanctions: "Sanctions",
    executive_order: "Decret executif",
  };
  return map[cat] || cat;
}

function categoryIcon(cat: TimelineEntry["category"]) {
  const map: Record<string, React.ReactNode> = {
    tariff: <Shield className="w-3 h-3" />,
    trade_deal: <Globe className="w-3 h-3" />,
    fed: <Landmark className="w-3 h-3" />,
    tax: <DollarSign className="w-3 h-3" />,
    sanctions: <Ban className="w-3 h-3" />,
    executive_order: <FileText className="w-3 h-3" />,
  };
  return map[cat] || null;
}

function statusBadge(status: TariffEntry["status"]) {
  const map: Record<string, string> = {
    Actif: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Suspendu: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Menace: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return map[status] || "";
}

function timelineEntryBorderColor(entry: TimelineEntry): string {
  const hasB = entry.impacts.some((i) => i.impact === "bearish");
  const hasBull = entry.impacts.some((i) => i.impact === "bullish");
  if (hasB && hasBull) return "border-l-amber-400";
  if (hasB) return "border-l-red-400";
  if (hasBull) return "border-l-emerald-400";
  return "border-l-gray-500";
}

function timelineEntryDotColor(entry: TimelineEntry): string {
  const hasB = entry.impacts.some((i) => i.impact === "bearish");
  const hasBull = entry.impacts.some((i) => i.impact === "bullish");
  if (hasB && !hasBull) return "rgb(248,113,113)";
  if (hasBull && !hasB) return "rgb(52,211,153)";
  return "rgb(251,191,36)";
}

/** Relative time string in French */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "";
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "il y a quelques secondes";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "il y a 1 jour";
  return `il y a ${diffD} jours`;
}

function sentimentBadge(s: "bullish" | "bearish" | "neutral") {
  if (s === "bullish")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <TrendingUp className="w-3 h-3" /> Haussier
      </span>
    );
  if (s === "bearish")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
        <TrendingDown className="w-3 h-3" /> Baissier
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400 border border-gray-500/30">
      <Minus className="w-3 h-3" /> Neutre
    </span>
  );
}

function sourceBadgeColor(source: string): string {
  const map: Record<string, string> = {
    MarketAux: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    Finnhub: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    NewsData: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  };
  return map[source] || "bg-gray-500/15 text-gray-400 border-gray-500/30";
}

// ============================================================
// Sub-components
// ============================================================

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/60 backdrop-blur-xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/** Mini bar chart for tariff rates - top 5 countries */
function TariffMiniChart() {
  const top5 = TARIFF_DATA.filter((t) => t.status === "Actif")
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);
  const maxRate = Math.max(...top5.map((t) => t.rate));

  return (
    <div className="flex items-end gap-1.5 h-10 mt-2">
      {top5.map((t) => {
        const heightPct = (t.rate / maxRate) * 100;
        return (
          <div key={t.country} className="flex flex-col items-center flex-1 min-w-0">
            <div
              className="w-full rounded-t bg-gradient-to-t from-red-500/60 to-red-400/30 transition-all"
              style={{ height: `${heightPct}%`, minHeight: 4 }}
              title={`${t.country}: ${t.rate}%`}
            />
            <span className="text-[8px] text-[var(--text-muted)] mt-0.5 truncate w-full text-center leading-tight">
              {t.country.slice(0, 4)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Countdown timer to next decision */
function CountdownTimer({ target }: { target: Date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return <span className="text-amber-400 font-bold text-lg">Imminent</span>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="flex items-baseline gap-0.5 font-mono mt-1">
      <span className="text-2xl font-bold text-[var(--text-primary)]">{String(days).padStart(2, "0")}</span>
      <span className="text-xs text-[var(--text-muted)]">j</span>
      <span className="text-[var(--text-muted)] mx-0.5">:</span>
      <span className="text-2xl font-bold text-[var(--text-primary)]">{String(hours).padStart(2, "0")}</span>
      <span className="text-xs text-[var(--text-muted)]">h</span>
      <span className="text-[var(--text-muted)] mx-0.5">:</span>
      <span className="text-2xl font-bold text-[var(--text-primary)]">{String(mins).padStart(2, "0")}</span>
      <span className="text-xs text-[var(--text-muted)]">min</span>
    </div>
  );
}

/** Sentiment gauge / meter */
function SentimentGauge({ level }: { level: number }) {
  // level: 0 = full risk-on, 100 = full risk-off
  const rotation = -90 + (level / 100) * 180; // -90 to 90 degrees
  const color = level >= 66 ? "#f87171" : level >= 33 ? "#fbbf24" : "#34d399";

  return (
    <div className="relative w-20 h-11 mt-1">
      {/* Arc background */}
      <svg viewBox="0 0 100 55" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-[var(--border)]"
          strokeLinecap="round"
        />
        {/* Colored segments */}
        <path
          d="M 10 50 A 40 40 0 0 1 36.7 16.5"
          fill="none"
          stroke="#34d399"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M 36.7 16.5 A 40 40 0 0 1 63.3 16.5"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M 63.3 16.5 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="#f87171"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* Needle */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="16"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${rotation} 50 50)`}
        />
        <circle cx="50" cy="50" r="3" fill={color} />
      </svg>
      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-0.5">
        <span className="text-[7px] text-emerald-400">Risk-On</span>
        <span className="text-[7px] text-red-400">Risk-Off</span>
      </div>
    </div>
  );
}

/** Mini sparkline for DXY (simulated from timeline data) */
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 28;
  const w = 80;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="mt-1">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={w}
          cy={h - ((data[data.length - 1] - min) / range) * (h - 4) - 2}
          r="2.5"
          fill={color}
        />
      )}
    </svg>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function TrumpTrackerPage() {
  const { t } = useTranslation();
  const { trades } = useTrades();
  const [trumpNews, setTrumpNews] = useState<TrumpNewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [marketQuotes, setMarketQuotes] = useState<MarketQuote[]>([]);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- fetch trump news from dedicated API ----
  const fetchTrumpNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const res = await fetch("/api/trump-news");
      if (res.ok) {
        const data = await res.json();
        if (data?.articles && Array.isArray(data.articles)) {
          setTrumpNews(data.articles);
        }
      }
    } catch {
      /* silent */
    } finally {
      setNewsLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  // ---- fetch market quotes (6 instruments) ----
  const fetchMarketQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/live-prices");
      if (!res.ok) return;
      const data = await res.json();

      const quotes: MarketQuote[] = [];

      // DXY
      const dxy = data?.indices?.find((i: MarketQuote) => i.symbol === "DXY" || i.symbol === "DX-Y.NYB") ||
        data?.forex?.find((i: MarketQuote) => i.symbol === "DXY");
      if (dxy) quotes.push({ symbol: "DXY", price: dxy.price, change: dxy.change });

      // Gold
      const gold = data?.commodities?.find((c: MarketQuote) => c.symbol === "XAU/USD" || c.symbol === "GOLD" || c.symbol === "GC=F");
      if (gold) quotes.push({ symbol: "Gold", price: gold.price, change: gold.change });

      // S&P 500
      const sp500 = data?.indices?.find((i: MarketQuote) => i.symbol === "SPY" || i.symbol === "^GSPC" || i.symbol === "S&P500" || i.symbol === "S&P 500" || i.symbol === "ES=F");
      if (sp500) quotes.push({ symbol: "S&P 500", price: sp500.price, change: sp500.change });

      // EUR/USD
      const eurusd = data?.forex?.find((f: MarketQuote) => f.symbol === "EUR/USD" || f.symbol === "EURUSD");
      if (eurusd) quotes.push({ symbol: "EUR/USD", price: eurusd.price, change: eurusd.change });

      // US 10Y (may not be in API, add if available)
      const us10y = data?.indices?.find((i: MarketQuote) => i.symbol === "US10Y" || i.symbol === "^TNX") ||
        data?.commodities?.find((c: MarketQuote) => c.symbol === "US10Y");
      if (us10y) quotes.push({ symbol: "US10Y", price: us10y.price, change: us10y.change });

      // BTC
      const btc = data?.crypto?.find((c: MarketQuote) => c.symbol === "BTC/USD" || c.symbol === "BTC" || c.symbol === "BTCUSD");
      if (btc) quotes.push({ symbol: "BTC", price: btc.price, change: btc.change });

      setMarketQuotes(quotes);
    } catch {
      /* silent */
    }
  }, []);

  // ---- Initial fetch + auto-refresh every 5 min ----
  useEffect(() => {
    fetchTrumpNews();
    fetchMarketQuotes();

    refreshTimerRef.current = setInterval(() => {
      fetchTrumpNews();
      fetchMarketQuotes();
    }, 5 * 60 * 1000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchTrumpNews, fetchMarketQuotes]);

  const handleManualRefresh = useCallback(() => {
    fetchTrumpNews();
    fetchMarketQuotes();
  }, [fetchTrumpNews, fetchMarketQuotes]);

  // ---- trade impact analysis ----
  const tradeImpactAnalysis = useMemo(() => {
    if (!trades || trades.length === 0) return null;

    const announcementDates = new Set(TIMELINE_DATA.map((e) => e.date));

    let totalAnnouncement = 0;
    let countAnnouncement = 0;
    let winsAnnouncement = 0;
    let totalNormal = 0;
    let countNormal = 0;
    let winsNormal = 0;
    const assetImpactMap = new Map<string, { total: number; count: number }>();

    for (const trade of trades) {
      const tradeDate = trade.date?.slice(0, 10);
      if (!tradeDate) continue;

      if (announcementDates.has(tradeDate)) {
        totalAnnouncement += trade.result;
        countAnnouncement++;
        if (trade.result > 0) winsAnnouncement++;

        const existing = assetImpactMap.get(trade.asset) || { total: 0, count: 0 };
        existing.total += trade.result;
        existing.count++;
        assetImpactMap.set(trade.asset, existing);
      } else {
        totalNormal += trade.result;
        countNormal++;
        if (trade.result > 0) winsNormal++;
      }
    }

    const avgAnnouncement = countAnnouncement > 0 ? totalAnnouncement / countAnnouncement : 0;
    const avgNormal = countNormal > 0 ? totalNormal / countNormal : 0;
    const wrAnnouncement = countAnnouncement > 0 ? (winsAnnouncement / countAnnouncement) * 100 : 0;
    const wrNormal = countNormal > 0 ? (winsNormal / countNormal) * 100 : 0;

    const topImpacted = Array.from(assetImpactMap.entries())
      .map(([asset, data]) => ({ asset, avg: data.total / data.count, count: data.count }))
      .sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg))
      .slice(0, 5);

    return {
      avgAnnouncement,
      avgNormal,
      countAnnouncement,
      countNormal,
      wrAnnouncement,
      wrNormal,
      topImpacted,
    };
  }, [trades]);

  // ---- Metrics ----
  const activeTariffs = TARIFF_DATA.filter((t) => t.status === "Actif").length;
  const recentBearish = TIMELINE_DATA.slice(0, 5).filter((e) =>
    e.impacts.filter((i) => i.asset === "USD" && i.impact === "bearish").length > 0
  ).length;
  const sentimentLevel = recentBearish >= 3 ? 80 : recentBearish >= 2 ? 60 : recentBearish >= 1 ? 40 : 20;
  const sentiment = recentBearish >= 3 ? "Risk-Off" : recentBearish >= 1 ? "Mixte" : "Risk-On";
  const sentimentColor = sentiment === "Risk-Off" ? "text-red-400" : sentiment === "Risk-On" ? "text-emerald-400" : "text-amber-400";

  // Simulated DXY sparkline data (last 7 data points)
  const dxySparkData = useMemo(() => [103.2, 103.8, 104.1, 103.5, 104.3, 104.8, 105.1], []);

  // Filtered timeline
  const filteredTimeline = useMemo(() => {
    if (categoryFilter === "all") return TIMELINE_DATA;
    return TIMELINE_DATA.filter((e) => e.category === categoryFilter);
  }, [categoryFilter]);

  const displayedTimeline = timelineExpanded ? filteredTimeline : filteredTimeline.slice(0, 5);

  // Gradient border helper
  function kpiBorderClass(type: "green" | "amber" | "red" | "blue") {
    const map: Record<string, string> = {
      green: "border-emerald-500/40",
      amber: "border-amber-500/40",
      red: "border-red-500/40",
      blue: "border-blue-500/40",
    };
    return map[type] || "border-[var(--border)]";
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 p-4 md:p-6">
      {/* ================================================================
          HEADER
      ================================================================ */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30">
            <Flag className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("trumpTrackerTitle")}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("trumpTrackerSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Derni&egrave;re MAJ : {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={handleManualRefresh}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] hover:bg-cyan-500/15 text-[var(--text-secondary)] hover:text-cyan-400 transition-colors text-xs font-medium"
            title="Actualiser"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${newsLoading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ================================================================
          1. LIVE MARKET IMPACT BAR - 6 mini cards
      ================================================================ */}
      {marketQuotes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {marketQuotes.map((q) => {
            const isUp = q.change >= 0;
            return (
              <div
                key={q.symbol}
                className={`relative rounded-xl border overflow-hidden transition-all h-12 flex items-center justify-between px-3 ${
                  isUp
                    ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                    : "border-red-500/20 bg-red-500/[0.04]"
                }`}
              >
                {/* Subtle gradient background */}
                <div
                  className={`absolute inset-0 opacity-[0.03] ${
                    isUp ? "bg-gradient-to-r from-emerald-500 to-transparent" : "bg-gradient-to-r from-red-500 to-transparent"
                  }`}
                />
                <div className="relative z-10 min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide leading-none">
                    {q.symbol}
                  </p>
                  <p className="text-sm font-bold text-[var(--text-primary)] font-mono leading-tight mt-0.5">
                    {q.price.toLocaleString("fr-FR", { maximumFractionDigits: q.price > 1000 ? 0 : 2 })}
                  </p>
                </div>
                <div className={`relative z-10 flex items-center gap-0.5 text-xs font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                  {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{isUp ? "+" : ""}{q.change.toFixed(2)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================
          2. KPI CARDS - 4 enhanced cards
      ================================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active tariffs with mini bar chart */}
        <GlassCard className={`${kpiBorderClass("red")} border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/15">
              <Shield className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              {t("trumpTrackerActiveTariffs")}
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-[var(--text-primary)]">{activeTariffs}</div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {TARIFF_DATA.filter((t) => t.status === "Menace").length} {t("trumpTrackerThreatened")}
              </p>
            </div>
            <TariffMiniChart />
          </div>
        </GlassCard>

        {/* DXY Impact with sparkline */}
        <GlassCard className={`${kpiBorderClass("blue")} border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/15">
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              {t("trumpTrackerDxyImpact")}
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span className="text-2xl font-bold text-emerald-400">+1.2%</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t("trumpTrackerDxyDesc")}</p>
            </div>
            <MiniSparkline data={dxySparkData} color="#60a5fa" />
          </div>
        </GlassCard>

        {/* Next decision with countdown */}
        <GlassCard className={`${kpiBorderClass("amber")} border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/15">
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              {t("trumpTrackerNextDecision")}
            </span>
          </div>
          <CountdownTimer target={NEXT_DECISION_DATE} />
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t("trumpTrackerNextDecisionDesc")}</p>
        </GlassCard>

        {/* Market Sentiment with gauge */}
        <GlassCard className={`${kpiBorderClass(sentiment === "Risk-Off" ? "red" : sentiment === "Risk-On" ? "green" : "amber")} border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/15">
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              {t("trumpTrackerSentiment")}
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className={`text-2xl font-bold ${sentimentColor}`}>{sentiment}</div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t("trumpTrackerSentimentDesc")}</p>
            </div>
            <SentimentGauge level={sentimentLevel} />
          </div>
        </GlassCard>
      </div>

      {/* ================================================================
          3. TIMELINE - with category filter pills + hover expand
      ================================================================ */}
      <GlassCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            {t("trumpTrackerTimeline")}
            <span className="text-xs font-normal text-[var(--text-muted)] ml-1">
              {filteredTimeline.length} {t("trumpTrackerEvents")}
            </span>
          </h2>
          {/* Category filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] mr-1" />
            {CATEGORY_FILTERS.map((cf) => (
              <button
                key={cf.key}
                onClick={() => { setCategoryFilter(cf.key); setTimelineExpanded(false); setExpandedEvent(null); }}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                  categoryFilter === cf.key
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                    : "bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-cyan-500/30 hover:text-[var(--text-secondary)]"
                }`}
              >
                {cf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-0">
          {displayedTimeline.map((entry, idx) => {
            const isExpanded = expandedEvent === idx;
            return (
              <div
                key={`${entry.date}-${idx}`}
                className={`relative pl-6 pb-4 border-l-2 ${timelineEntryBorderColor(entry)} last:pb-0 cursor-pointer group`}
                onClick={() => setExpandedEvent(isExpanded ? null : idx)}
              >
                {/* dot */}
                <div
                  className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-[var(--bg-card)] border-2 transition-transform group-hover:scale-125"
                  style={{ borderColor: timelineEntryDotColor(entry) }}
                />

                <div className="ml-2">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs text-[var(--text-muted)]">{formatDate(entry.date)}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${categoryColor(entry.category)}`}>
                      {categoryIcon(entry.category)}
                      {categoryLabel(entry.category)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 group-hover:text-cyan-400 transition-colors">
                    {entry.title}
                  </h3>

                  {/* Expanded description */}
                  <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                    <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed">{entry.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {entry.impacts.map((imp, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs">
                        {impactIcon(imp.impact)}
                        <span className={impactColor(imp.impact)}>{imp.asset}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTimeline.length > 5 && (
          <button
            onClick={() => setTimelineExpanded(!timelineExpanded)}
            className="mt-3 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors mx-auto"
          >
            {timelineExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Voir moins
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Voir tout ({filteredTimeline.length})
              </>
            )}
          </button>
        )}
      </GlassCard>

      {/* ================================================================
          4. NEWS FEED - card-based with "En direct" indicator
      ================================================================ */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-400" />
            Actualites Trump &amp; Commerce
            {/* "En direct" pulsing indicator */}
            <span className="inline-flex items-center gap-1.5 ml-2 text-[10px] text-red-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              En direct
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--text-muted)]">MAJ auto : 5 min</span>
            <button
              onClick={handleManualRefresh}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-cyan-400 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${newsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {newsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-[var(--bg-hover)] h-28" />
            ))}
          </div>
        ) : trumpNews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trumpNews.map((article, idx) => (
              <div
                key={idx}
                className="flex gap-3 p-3 rounded-xl border border-[var(--border)]/50 bg-[var(--bg-card)]/40 hover:border-cyan-500/30 hover:bg-[var(--bg-hover)] transition-all group"
              >
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {timeAgo(article.publishedAt)}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${sourceBadgeColor(article.source)}`}>
                      {article.source}
                    </span>
                    {sentimentBadge(article.sentiment)}
                  </div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug">
                    {article.title}
                  </h3>
                  <div className="mt-auto pt-1">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                    >
                      Lire <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Newspaper className="w-8 h-8 text-[var(--text-muted)] mb-2" />
            <p className="text-sm text-[var(--text-muted)]">Aucune actualite Trump disponible</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Les articles apparaitront automatiquement lors de la prochaine mise a jour</p>
          </div>
        )}
      </GlassCard>

      {/* ================================================================
          5. IMPACT SUR VOS TRADES + Tariff Table side by side
      ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Impact on your trades - enhanced */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            Impact sur vos Trades
          </h2>

          {tradeImpactAnalysis && tradeImpactAnalysis.countAnnouncement > 0 ? (
            <div className="space-y-3">
              {/* WR comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--bg-hover)] p-3 border border-[var(--border)]/50">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">
                    Jours d&apos;annonces Trump
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${tradeImpactAnalysis.avgAnnouncement >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {tradeImpactAnalysis.avgAnnouncement >= 0 ? "+" : ""}{tradeImpactAnalysis.avgAnnouncement.toFixed(2)}&euro;
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--text-muted)]">WR</span>
                    <span className={`text-xs font-bold ${tradeImpactAnalysis.wrAnnouncement >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                      {tradeImpactAnalysis.wrAnnouncement.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">({tradeImpactAnalysis.countAnnouncement} trades)</span>
                  </div>
                </div>
                <div className="rounded-xl bg-[var(--bg-hover)] p-3 border border-[var(--border)]/50">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">
                    Jours normaux
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${tradeImpactAnalysis.avgNormal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {tradeImpactAnalysis.avgNormal >= 0 ? "+" : ""}{tradeImpactAnalysis.avgNormal.toFixed(2)}&euro;
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--text-muted)]">WR</span>
                    <span className={`text-xs font-bold ${tradeImpactAnalysis.wrNormal >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                      {tradeImpactAnalysis.wrNormal.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">({tradeImpactAnalysis.countNormal} trades)</span>
                  </div>
                </div>
              </div>

              {/* Comparison bar */}
              <div className="rounded-xl bg-[var(--bg-hover)] p-3 border border-[var(--border)]/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Comparaison P&amp;L moyen</span>
                  <Activity className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    {(() => {
                      const maxVal = Math.max(Math.abs(tradeImpactAnalysis.avgAnnouncement), Math.abs(tradeImpactAnalysis.avgNormal), 1);
                      const annPct = (Math.abs(tradeImpactAnalysis.avgAnnouncement) / maxVal) * 50;
                      const normPct = (Math.abs(tradeImpactAnalysis.avgNormal) / maxVal) * 50;
                      return (
                        <div className="flex h-full">
                          <div
                            className={`${tradeImpactAnalysis.avgAnnouncement >= 0 ? "bg-amber-400" : "bg-red-400"} transition-all`}
                            style={{ width: `${annPct}%` }}
                          />
                          <div
                            className={`${tradeImpactAnalysis.avgNormal >= 0 ? "bg-cyan-400" : "bg-red-300"} transition-all`}
                            style={{ width: `${normPct}%` }}
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="flex items-center gap-1 text-[10px] text-amber-400">
                    <Flame className="w-3 h-3" /> Annonces Trump
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-cyan-400">
                    <Activity className="w-3 h-3" /> Jours normaux
                  </span>
                </div>
              </div>

              {/* Insight */}
              <div className="rounded-xl bg-[var(--bg-hover)] p-3 border border-[var(--border)]/50">
                <p className="text-xs text-[var(--text-secondary)]">
                  {tradeImpactAnalysis.avgAnnouncement > tradeImpactAnalysis.avgNormal
                    ? t("trumpTrackerPerformBetterAnnouncement")
                    : tradeImpactAnalysis.avgAnnouncement < tradeImpactAnalysis.avgNormal
                      ? t("trumpTrackerPerformWorseAnnouncement")
                      : t("trumpTrackerPerformSameAnnouncement")}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="w-8 h-8 text-[var(--text-muted)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">{t("trumpTrackerNoTradeData")}</p>
            </div>
          )}
        </GlassCard>

        {/* Most impacted assets */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            {t("trumpTrackerMostImpacted")}
          </h2>

          {tradeImpactAnalysis && tradeImpactAnalysis.topImpacted.length > 0 ? (
            <div className="space-y-2">
              {tradeImpactAnalysis.topImpacted.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors border border-transparent hover:border-[var(--border)]/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[var(--text-muted)] w-5">#{idx + 1}</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{item.asset}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-muted)]">{item.count} trades</span>
                    <span className={`text-sm font-bold ${item.avg >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {item.avg >= 0 ? "+" : ""}{item.avg.toFixed(2)}
                    </span>
                    {item.avg >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="w-8 h-8 text-[var(--text-muted)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">{t("trumpTrackerNoTradeData")}</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ================================================================
          6. TARIFF TRACKER TABLE
      ================================================================ */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-5">
          <Target className="w-5 h-5 text-red-400" />
          {t("trumpTrackerTariffTable")}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border)]">
                <th className="text-left py-3 px-3 font-medium">{t("trumpTrackerCountry")}</th>
                <th className="text-center py-3 px-3 font-medium">{t("trumpTrackerRate")}</th>
                <th className="text-center py-3 px-3 font-medium">{t("trumpTrackerEffectiveDate")}</th>
                <th className="text-center py-3 px-3 font-medium">{t("trumpTrackerStatus")}</th>
                <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">{t("trumpTrackerEstimatedImpact")}</th>
              </tr>
            </thead>
            <tbody>
              {TARIFF_DATA.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{row.country}</td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono font-bold text-red-400">{row.rate}%</span>
                      {/* Mini rate bar */}
                      <div className="w-12 h-1.5 rounded-full bg-[var(--border)] overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full bg-red-400/60"
                          style={{ width: `${(row.rate / 50) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center text-[var(--text-secondary)]">
                    {formatDate(row.effectiveDate)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border ${statusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-[var(--text-muted)] hidden lg:table-cell max-w-[300px]">
                    {row.estimatedImpact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
