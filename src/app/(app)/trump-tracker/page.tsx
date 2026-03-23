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
// Components
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

  // ---- fetch market quotes (DXY, Gold, S&P500) ----
  const fetchMarketQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/live-prices");
      if (!res.ok) return;
      const data = await res.json();

      const quotes: MarketQuote[] = [];

      // Try to find DXY in indices or forex
      const dxy = data?.indices?.find((i: MarketQuote) => i.symbol === "DXY" || i.symbol === "DX-Y.NYB") ||
        data?.forex?.find((i: MarketQuote) => i.symbol === "DXY");
      if (dxy) {
        quotes.push({ symbol: "DXY", price: dxy.price, change: dxy.change });
      }

      // Gold from commodities
      const gold = data?.commodities?.find((c: MarketQuote) => c.symbol === "XAU/USD" || c.symbol === "GOLD" || c.symbol === "GC=F");
      if (gold) {
        quotes.push({ symbol: "Gold", price: gold.price, change: gold.change });
      }

      // S&P 500 from indices
      const sp500 = data?.indices?.find((i: MarketQuote) => i.symbol === "SPY" || i.symbol === "^GSPC" || i.symbol === "S&P500" || i.symbol === "ES=F");
      if (sp500) {
        quotes.push({ symbol: "S&P 500", price: sp500.price, change: sp500.change });
      }

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
    let totalNormal = 0;
    let countNormal = 0;
    const assetImpactMap = new Map<string, { total: number; count: number }>();

    for (const trade of trades) {
      const tradeDate = trade.date?.slice(0, 10);
      if (!tradeDate) continue;

      if (announcementDates.has(tradeDate)) {
        totalAnnouncement += trade.result;
        countAnnouncement++;

        const existing = assetImpactMap.get(trade.asset) || { total: 0, count: 0 };
        existing.total += trade.result;
        existing.count++;
        assetImpactMap.set(trade.asset, existing);
      } else {
        totalNormal += trade.result;
        countNormal++;
      }
    }

    const avgAnnouncement = countAnnouncement > 0 ? totalAnnouncement / countAnnouncement : 0;
    const avgNormal = countNormal > 0 ? totalNormal / countNormal : 0;

    const topImpacted = Array.from(assetImpactMap.entries())
      .map(([asset, data]) => ({ asset, avg: data.total / data.count, count: data.count }))
      .sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg))
      .slice(0, 5);

    return {
      avgAnnouncement,
      avgNormal,
      countAnnouncement,
      countNormal,
      topImpacted,
    };
  }, [trades]);

  // ---- Metrics ----
  const activeTariffs = TARIFF_DATA.filter((t) => t.status === "Actif").length;
  const recentBearish = TIMELINE_DATA.slice(0, 5).filter((e) =>
    e.impacts.filter((i) => i.asset === "USD" && i.impact === "bearish").length > 0
  ).length;
  const sentiment = recentBearish >= 3 ? "Risk-Off" : recentBearish >= 1 ? "Mixte" : "Risk-On";
  const sentimentColor = sentiment === "Risk-Off" ? "text-red-400" : sentiment === "Risk-On" ? "text-emerald-400" : "text-amber-400";

  const displayedTimeline = timelineExpanded ? TIMELINE_DATA : TIMELINE_DATA.slice(0, 8);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 p-4 md:p-6">
      {/* ================================================================
          1. HEADER
      ================================================================ */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
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
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Derni&egrave;re mise &agrave; jour : {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
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
          1b. LIVE MARKET IMPACT INDICATORS
      ================================================================ */}
      {marketQuotes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {marketQuotes.map((q) => {
            const isUp = q.change >= 0;
            return (
              <div
                key={q.symbol}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/60 backdrop-blur-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">{q.symbol}</p>
                  <p className="text-xl font-bold text-[var(--text-primary)] font-mono mt-0.5">
                    {q.price.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`flex items-center gap-1.5 text-sm font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                  {isUp ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  <span>{isUp ? "+" : ""}{q.change.toFixed(2)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================
          2. KEY METRICS (4 cards)
      ================================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active tariffs */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-red-500/15">
              <Shield className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              {t("trumpTrackerActiveTariffs")}
            </span>
          </div>
          <div className="text-3xl font-bold text-[var(--text-primary)]">{activeTariffs}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {TARIFF_DATA.filter((t) => t.status === "Menace").length} {t("trumpTrackerThreatened")}
          </p>
        </GlassCard>

        {/* DXY Impact */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/15">
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              {t("trumpTrackerDxyImpact")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
            <span className="text-3xl font-bold text-emerald-400">+1.2%</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">{t("trumpTrackerDxyDesc")}</p>
        </GlassCard>

        {/* Next decision */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/15">
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              {t("trumpTrackerNextDecision")}
            </span>
          </div>
          <div className="text-lg font-bold text-[var(--text-primary)]">28 mars 2026</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">{t("trumpTrackerNextDecisionDesc")}</p>
        </GlassCard>

        {/* Market Sentiment */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/15">
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              {t("trumpTrackerSentiment")}
            </span>
          </div>
          <div className={`text-2xl font-bold ${sentimentColor}`}>{sentiment}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">{t("trumpTrackerSentimentDesc")}</p>
        </GlassCard>
      </div>

      {/* ================================================================
          3. TIMELINE
      ================================================================ */}
      <GlassCard>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            {t("trumpTrackerTimeline")}
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            {TIMELINE_DATA.length} {t("trumpTrackerEvents")}
          </span>
        </div>

        <div className="space-y-0">
          {displayedTimeline.map((entry, idx) => (
            <div
              key={idx}
              className={`relative pl-6 pb-6 border-l-2 ${timelineEntryBorderColor(entry)} last:pb-0`}
            >
              {/* dot */}
              <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-[var(--bg-card)] border-2 border-current" style={{ borderColor: entry.impacts.some(i => i.impact === "bearish") ? "rgb(248,113,113)" : entry.impacts.some(i => i.impact === "bullish") ? "rgb(52,211,153)" : "rgb(251,191,36)" }} />

              <div className="ml-2">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs text-[var(--text-muted)]">{formatDate(entry.date)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${categoryColor(entry.category)}`}>
                    {categoryLabel(entry.category)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{entry.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed">{entry.description}</p>
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
          ))}
        </div>

        {TIMELINE_DATA.length > 8 && (
          <button
            onClick={() => setTimelineExpanded(!timelineExpanded)}
            className="mt-4 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors mx-auto"
          >
            {timelineExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> {t("trumpTrackerShowLess")}
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> {t("trumpTrackerShowAll")} ({TIMELINE_DATA.length})
              </>
            )}
          </button>
        )}
      </GlassCard>

      {/* ================================================================
          4. TARIFF TRACKER TABLE
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
                    <span className="font-mono font-bold text-red-400">{row.rate}%</span>
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

      {/* ================================================================
          5. MARKET IMPACT ANALYSIS
      ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Impact on trades */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            {t("trumpTrackerTradeImpact")}
          </h2>

          {tradeImpactAnalysis && tradeImpactAnalysis.countAnnouncement > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--bg-hover)] p-3">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">
                    {t("trumpTrackerAvgAnnouncementDay")}
                  </p>
                  <p className={`text-xl font-bold ${tradeImpactAnalysis.avgAnnouncement >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {tradeImpactAnalysis.avgAnnouncement >= 0 ? "+" : ""}
                    {tradeImpactAnalysis.avgAnnouncement.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {tradeImpactAnalysis.countAnnouncement} trades
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--bg-hover)] p-3">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">
                    {t("trumpTrackerAvgNormalDay")}
                  </p>
                  <p className={`text-xl font-bold ${tradeImpactAnalysis.avgNormal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {tradeImpactAnalysis.avgNormal >= 0 ? "+" : ""}
                    {tradeImpactAnalysis.avgNormal.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {tradeImpactAnalysis.countNormal} trades
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-[var(--bg-hover)] p-3">
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
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
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
          6. NEWS FEED (from /api/trump-news)
      ================================================================ */}
      <GlassCard>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-400" />
            Actualites Trump &amp; Commerce
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--text-muted)]">
              Mise &agrave; jour auto : 5 min
            </span>
            <button
              onClick={handleManualRefresh}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-cyan-400 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${newsLoading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </div>

        {newsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-[var(--bg-hover)] h-24" />
            ))}
          </div>
        ) : trumpNews.length > 0 ? (
          <div className="space-y-2">
            {trumpNews.map((article, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-[var(--bg-hover)] transition-colors border border-transparent hover:border-[var(--border)] group"
              >
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt=""
                    className="w-20 h-16 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {timeAgo(article.publishedAt)}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sourceBadgeColor(article.source)}`}>
                      {article.source}
                    </span>
                    {sentimentBadge(article.sentiment)}
                  </div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  {article.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                      {article.description}
                    </p>
                  )}
                  <div className="mt-2">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                    >
                      Lire
                      <ExternalLink className="w-3 h-3" />
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
    </div>
  );
}
