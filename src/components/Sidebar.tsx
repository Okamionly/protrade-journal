"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  CalendarDays,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Gauge,
  Trophy,
  Grid3x3,
  Upload,
  Crosshair,
  Clock,
  BookMarked,
  Activity,
  Calculator,
  Brain,
  Play,
  GitCompare,
  Layers,
  Eye,
  CheckSquare,
  Swords,
  FlaskConical,
  Monitor,
  Medal,
  FileText,
  Crown,
  Shield,
  AlertOctagon,
  Award,
  Target,
  TrendingUp,
  Globe,
  Zap,
  FileBarChart,
  Camera,
  User,
  Users,
  CreditCard,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/i18n/context";
import type { Locale } from "@/i18n/types";

const LOCALE_FLAGS: Record<Locale, { flag: string; short: string }> = {
  fr: { flag: "🇫🇷", short: "FR" },
  en: { flag: "🇬🇧", short: "EN" },
  ar: { flag: "🇸🇦", short: "AR" },
  es: { flag: "🇪🇸", short: "ES" },
  de: { flag: "🇩🇪", short: "DE" },
};
const LOCALE_STORAGE_KEY = "lbma-locale";

// Admin nav item (shown only for ADMIN users)
const adminItem = {
  href: "/admin",
  labelKey: "sidebarAdminPanel",
  icon: Shield,
  isAdmin: true,
};

// Nav items use labelKey which maps to t("sidebarXxx") translation keys
const navItems = [
  // TRADING
  { href: "/dashboard", labelKey: "sidebarDashboard", icon: LayoutDashboard },
  { href: "/journal", labelKey: "sidebarJournal", icon: BookOpen },
  { href: "/analytics", labelKey: "sidebarAnalytics", icon: BarChart3 },
  { href: "/analytics/distribution", labelKey: "sidebarDistribution", icon: Clock },
  { href: "/risk", labelKey: "sidebarRiskManager", icon: Shield },
  { href: "/mistakes", labelKey: "sidebarErrors", icon: AlertOctagon },
  { href: "/strategies", labelKey: "sidebarStrategies", icon: Crosshair },
  { href: "/playbook", labelKey: "sidebarPlaybook", icon: BookMarked },
  { href: "/checklist", labelKey: "sidebarChecklist", icon: CheckSquare },
  { href: "/import", labelKey: "sidebarImportCsv", icon: Upload },
  // PERFORMANCE
  { divider: true, labelKey: "sidebarSecPerformance" },
  { href: "/performance", labelKey: "sidebarScore", icon: Trophy },
  { href: "/performance/grading", labelKey: "sidebarGrading", icon: Award },
  { href: "/calendar", labelKey: "sidebarPlCalendar", icon: CalendarDays },
  { href: "/heatmap", labelKey: "sidebarHeatmap", icon: Grid3x3 },
  { href: "/daily-bias", labelKey: "sidebarDailyBias", icon: Target },
  { href: "/challenges", labelKey: "sidebarChallenges", icon: Swords },
  { href: "/leaderboard", labelKey: "sidebarLeaderboard", icon: Medal },
  { href: "/badges", labelKey: "sidebarBadges", icon: Award },
  { href: "/analytics/sessions", labelKey: "sidebarSessions", icon: Clock },
  // MARKET
  { divider: true, labelKey: "sidebarSecMarket" },
  { href: "/cot", labelKey: "sidebarCotReport", icon: TrendingUp },
  { href: "/macro", labelKey: "sidebarMacro", icon: Globe },
  { href: "/calendar-eco", labelKey: "sidebarEcoCalendar", icon: CalendarDays },
  { href: "/sentiment", labelKey: "sidebarSentiment", icon: Gauge },
  { href: "/currency-strength", labelKey: "sidebarCurrencyStrength", icon: Zap },
  { href: "/news", labelKey: "sidebarNews", icon: Newspaper },
  { href: "/market", labelKey: "sidebarMarketData", icon: Activity },
  { href: "/lbma", labelKey: "sidebarLbmaMetals", icon: Award },
  { href: "/scanner", labelKey: "sidebarScanner", icon: Crosshair },
  { href: "/watchlist", labelKey: "sidebarWatchlist", icon: Eye },
  { href: "/sector-heatmap", labelKey: "sidebarSectorHeatmap", icon: Grid3x3 },
  { href: "/volatility", labelKey: "sidebarVolatility", icon: Gauge },
  { href: "/earnings", labelKey: "sidebarEarnings", icon: CalendarDays },
  { href: "/flow", labelKey: "sidebarOptionsFlow", icon: Zap },
  // ADVANCED
  { divider: true, labelKey: "sidebarSecAdvanced" },
  { href: "/ai-coach", labelKey: "sidebarAiCoach", icon: Brain },
  { href: "/war-room", labelKey: "sidebarWarRoom", icon: Monitor },
  { href: "/backtest", labelKey: "sidebarBacktesting", icon: FlaskConical },
  { href: "/calculator", labelKey: "sidebarCalculator", icon: Calculator },
  { href: "/replay", labelKey: "sidebarReplay", icon: Play },
  { href: "/correlation", labelKey: "sidebarCorrelation", icon: Layers },
  { href: "/compare", labelKey: "sidebarComparison", icon: GitCompare },
  // TOOLS
  { divider: true, labelKey: "sidebarSecTools" },
  { href: "/custom-dashboard", labelKey: "sidebarMyDashboard", icon: Layers },
  { href: "/reports", labelKey: "sidebarPdfReports", icon: FileText },
  { href: "/recaps", labelKey: "sidebarRecaps", icon: FileBarChart },
  { href: "/screenshots", labelKey: "sidebarScreenshots", icon: Camera },
  { href: "/chat", labelKey: "sidebarChat", icon: MessageCircle },
  // MY SPACE
  { divider: true, labelKey: "sidebarSecMySpace" },
  { href: "/profile", labelKey: "sidebarProfile", icon: User },
  { href: "/community", labelKey: "sidebarCommunity", icon: Users },
  { href: "/pricing", labelKey: "sidebarPricing", icon: CreditCard },
  // PREMIUM
  { divider: true, labelKey: "sidebarSecPremium" },
  { href: "/vip", labelKey: "sidebarVip", icon: Crown, isVip: true },
  { href: "/vip/indicateurs", labelKey: "sidebarIndicators", icon: Crosshair, isVip: true },
  { href: "/vip/analyses", labelKey: "sidebarMacroAnalyses", icon: Globe, isVip: true },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (storedLocale && LOCALE_FLAGS[storedLocale]) setLocaleState(storedLocale);
  }, []);

  // Sync locale from Header/LBMA changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCALE_STORAGE_KEY && e.newValue && LOCALE_FLAGS[e.newValue as Locale]) {
        setLocaleState(e.newValue as Locale);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Close lang dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    if (langOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [langOpen]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_STORAGE_KEY, l);
    window.dispatchEvent(new StorageEvent("storage", { key: LOCALE_STORAGE_KEY, newValue: l }));
    setLangOpen(false);
  };

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role) setUserRole(data.role);
      })
      .catch(() => {});
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
    window.dispatchEvent(new Event("sidebar-toggle"));
  };

  const [mobileOpen, setMobileOpen] = useState(false);

  // Listen for mobile toggle events from AppShell
  useEffect(() => {
    const handler = (e: CustomEvent) => setMobileOpen(e.detail);
    window.addEventListener("mobile-sidebar" as string, handler as EventListener);
    return () => window.removeEventListener("mobile-sidebar" as string, handler as EventListener);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
    window.dispatchEvent(new CustomEvent("mobile-sidebar-closed"));
  }, [pathname]);

  return (
    <aside
      className={`fixed left-0 top-8 h-[calc(100%-2rem)] z-50 flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      } bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 ${
        mobileOpen ? "flex" : "hidden md:flex"
      }`}
    >
      {/* Logo area — click to go to dashboard */}
      <Link href="/dashboard" className="flex items-center h-16 px-3 border-b border-gray-200 dark:border-gray-800 hover:opacity-80 transition-opacity">
        <Image src="/logo-icon.png" alt="MarketPhase" width={44} height={44} className="w-11 h-11 rounded-xl flex-shrink-0" />
        {!collapsed && (
          <span className="ml-2.5 text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent whitespace-nowrap">
            MarketPhase
          </span>
        )}
      </Link>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {/* Admin link - only visible for ADMIN users */}
        {userRole === "ADMIN" && (() => {
          const isActive = pathname === adminItem.href || pathname?.startsWith(adminItem.href + "/");
          const AdminIcon = adminItem.icon;
          return (
            <>
              <Link
                href={adminItem.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group relative ${
                  isActive
                    ? "bg-rose-500/15 text-rose-400"
                    : "text-rose-500/80 dark:text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10"
                }`}
                title={collapsed ? t(adminItem.labelKey) : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-rose-400" />
                )}
                <AdminIcon className={`w-[18px] h-[18px] flex-shrink-0 ${
                  isActive ? "text-rose-400" : "text-rose-500/70 dark:text-rose-400/70 group-hover:text-rose-400"
                }`} />
                {!collapsed && <span className="truncate">{t(adminItem.labelKey)}</span>}
              </Link>
              <div className="pt-1 pb-1">
                {!collapsed && (
                  <span className="px-3 text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-600 uppercase">{t("sidebarSecTrading")}</span>
                )}
                {collapsed && <div className="border-t border-gray-200 dark:border-gray-800 mx-2" />}
              </div>
            </>
          );
        })()}
        {navItems.map((item, i) => {
          if ("divider" in item && item.divider) {
            return (
              <div key={`div-${i}`} className="pt-3 pb-1">
                {!collapsed && (
                  <span className="px-3 text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-600 uppercase">{t(item.labelKey)}</span>
                )}
                {collapsed && <div className="border-t border-gray-200 dark:border-gray-800 mx-2" />}
              </div>
            );
          }

          if (!("href" in item)) return null;
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const isVipItem = "isVip" in item && item.isVip;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group relative ${
                isVipItem
                  ? isActive
                    ? "bg-amber-500/15 text-amber-400"
                    : "text-amber-500/80 dark:text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/10"
                  : isActive
                    ? "bg-cyan-500/15 text-cyan-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"
              }`}
              title={collapsed ? t(item.labelKey) : undefined}
            >
              {isActive && (
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${isVipItem ? "bg-amber-400" : "bg-cyan-400"}`} />
              )}
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${
                isVipItem
                  ? isActive ? "text-amber-400" : "text-amber-500/70 dark:text-amber-400/70 group-hover:text-amber-400"
                  : isActive ? "text-cyan-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
              }`} />
              {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
        {/* Collapse */}
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition text-xs"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>{t("sidebarCollapse")}</span></>}
        </button>
      </div>
    </aside>
  );
}
