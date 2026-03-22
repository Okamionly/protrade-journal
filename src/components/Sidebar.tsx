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
  ChevronDown,
  ChevronUp,
  Newspaper,
  Gauge,
  Trophy,
  Grid3x3,
  Upload,
  Crosshair,
  Clock,
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
  FileText,
  Crown,
  Shield,
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
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n/context";

// Admin nav item (shown only for ADMIN users)
const adminItem = {
  href: "/admin",
  labelKey: "sidebarAdminPanel",
  icon: Shield,
  isAdmin: true,
};

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  isVip?: boolean;
};

type SectionDef = {
  id: string;
  labelKey: string;
  items: NavItem[];
  alwaysExpanded?: boolean;
  defaultCollapsed?: boolean;
  isVip?: boolean;
};

const sections: SectionDef[] = [
  // TRADING (always expanded)
  {
    id: "trading",
    labelKey: "sidebarSecTrading",
    alwaysExpanded: true,
    items: [
      { href: "/dashboard", labelKey: "sidebarDashboard", icon: LayoutDashboard },
      { href: "/journal", labelKey: "sidebarJournal", icon: BookOpen },
      { href: "/import", labelKey: "sidebarImportCsv", icon: Upload },
      { href: "/checklist", labelKey: "sidebarChecklist", icon: CheckSquare },
      { href: "/daily-bias", labelKey: "sidebarDailyBias", icon: Target },
    ],
  },
  // ANALYTICS (collapsible)
  {
    id: "analytics",
    labelKey: "sidebarSecAnalytics",
    items: [
      { href: "/analytics", labelKey: "sidebarAnalytics", icon: BarChart3 },
      { href: "/performance", labelKey: "sidebarScore", icon: Trophy },
      { href: "/calendar", labelKey: "sidebarPlCalendar", icon: CalendarDays },
      { href: "/heatmap", labelKey: "sidebarHeatmap", icon: Grid3x3 },
      { href: "/recaps", labelKey: "sidebarRecaps", icon: FileBarChart },
      { href: "/analytics/distribution", labelKey: "sidebarDistribution", icon: Clock },
    ],
  },
  // MARCHÉ (collapsible, collapsed by default)
  {
    id: "market",
    labelKey: "sidebarSecMarket",
    defaultCollapsed: true,
    items: [
      { href: "/cot", labelKey: "sidebarCotReport", icon: TrendingUp },
      { href: "/macro", labelKey: "sidebarMacro", icon: Globe },
      { href: "/calendar-eco", labelKey: "sidebarEcoCalendar", icon: CalendarDays },
      { href: "/news", labelKey: "sidebarNews", icon: Newspaper },
      { href: "/market", labelKey: "sidebarMarketData", icon: Activity },
      { href: "/watchlist", labelKey: "sidebarWatchlist", icon: Eye },
      { href: "/volatility", labelKey: "sidebarVolatility", icon: Gauge },
      { href: "/earnings", labelKey: "sidebarEarnings", icon: CalendarDays },
    ],
  },
  // AVANCÉ (collapsible, collapsed by default)
  {
    id: "advanced",
    labelKey: "sidebarSecAdvanced",
    defaultCollapsed: true,
    items: [
      { href: "/ai-coach", labelKey: "sidebarAiCoach", icon: Brain },
      { href: "/war-room", labelKey: "sidebarWarRoom", icon: Monitor },
      { href: "/backtest", labelKey: "sidebarBacktesting", icon: FlaskConical },
      { href: "/calculator", labelKey: "sidebarCalculator", icon: Calculator },
      { href: "/replay", labelKey: "sidebarReplay", icon: Play },
      { href: "/correlation", labelKey: "sidebarCorrelation", icon: Layers },
      { href: "/compare", labelKey: "sidebarComparison", icon: GitCompare },
    ],
  },
  // OUTILS (collapsible)
  {
    id: "tools",
    labelKey: "sidebarSecTools",
    items: [
      { href: "/custom-dashboard", labelKey: "sidebarMyDashboard", icon: Layers },
      { href: "/reports", labelKey: "sidebarPdfReports", icon: FileText },
      { href: "/screenshots", labelKey: "sidebarScreenshots", icon: Camera },
      { href: "/strategies", labelKey: "sidebarStrategies", icon: Crosshair },
    ],
  },
  // MON ESPACE (always expanded)
  {
    id: "myspace",
    labelKey: "sidebarSecMySpace",
    alwaysExpanded: true,
    items: [
      { href: "/profile", labelKey: "sidebarProfile", icon: User },
      { href: "/pricing", labelKey: "sidebarPricing", icon: CreditCard },
    ],
  },
  // PREMIUM (always expanded, highlighted)
  {
    id: "premium",
    labelKey: "sidebarSecPremium",
    alwaysExpanded: true,
    isVip: true,
    items: [
      { href: "/vip", labelKey: "sidebarVip", icon: Crown, isVip: true },
      { href: "/vip/indicateurs", labelKey: "sidebarIndicators", icon: Crosshair, isVip: true },
      { href: "/vip/analyses", labelKey: "sidebarMacroAnalyses", icon: Globe, isVip: true },
      { href: "/community", labelKey: "sidebarCommunity", icon: Users, isVip: true },
      { href: "/chat", labelKey: "sidebarChat", icon: MessageCircle, isVip: true },
    ],
  },
];

const STORAGE_KEY = "sidebar-sections-collapsed";

function getDefaultCollapsed(): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const s of sections) {
    if (s.defaultCollapsed) defaults[s.id] = true;
  }
  return defaults;
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>(getDefaultCollapsed);

  // Restore sidebar collapsed state
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setSidebarCollapsed(true);
  }, []);

  // Restore section collapsed state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSectionCollapsed((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role) setUserRole(data.role);
      })
      .catch(() => {});
  }, []);

  const toggleSidebarCollapsed = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
    window.dispatchEvent(new Event("sidebar-toggle"));
  };

  const toggleSection = useCallback((sectionId: string) => {
    setSectionCollapsed((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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

  // Auto-expand a section if the active route is inside it
  useEffect(() => {
    for (const section of sections) {
      if (section.alwaysExpanded) continue;
      const hasActive = section.items.some(
        (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
      );
      if (hasActive && sectionCollapsed[section.id]) {
        setSectionCollapsed((prev) => {
          const next = { ...prev, [section.id]: false };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      }
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
    const isVipItem = !!item.isVip;

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
        title={sidebarCollapsed ? t(item.labelKey) : undefined}
      >
        {isActive && (
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${isVipItem ? "bg-amber-400" : "bg-cyan-400"}`} />
        )}
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${
          isVipItem
            ? isActive ? "text-amber-400" : "text-amber-500/70 dark:text-amber-400/70 group-hover:text-amber-400"
            : isActive ? "text-cyan-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
        }`} />
        {!sidebarCollapsed && <span className="truncate">{t(item.labelKey)}</span>}
      </Link>
    );
  };

  const renderSection = (section: SectionDef, idx: number) => {
    const isCollapsible = !section.alwaysExpanded;
    const isOpen = section.alwaysExpanded || !sectionCollapsed[section.id];

    return (
      <div key={section.id}>
        {/* Section header */}
        <div className={`${idx > 0 ? "pt-3" : ""} pb-1`}>
          {!sidebarCollapsed ? (
            isCollapsible ? (
              <button
                onClick={() => toggleSection(section.id)}
                className="flex items-center justify-between w-full px-3 text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-600 uppercase hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                <span>{t(section.labelKey)}</span>
                {isOpen ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            ) : (
              <span className="px-3 text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-600 uppercase">
                {t(section.labelKey)}
              </span>
            )
          ) : (
            <div className="border-t border-gray-200 dark:border-gray-800 mx-2" />
          )}
        </div>

        {/* Section items with smooth collapse */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-0.5">
            {section.items.map(renderNavItem)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-8 h-[calc(100%-2rem)] z-50 flex-col transition-all duration-300 ${
        sidebarCollapsed ? "w-16" : "w-56"
      } bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 ${
        mobileOpen ? "flex" : "hidden md:flex"
      }`}
    >
      {/* Logo area — click to go to dashboard */}
      <Link href="/dashboard" className="flex items-center h-16 px-3 border-b border-gray-200 dark:border-gray-800 hover:opacity-80 transition-opacity">
        <Image src="/logo-icon.png" alt="MarketPhase" width={44} height={44} className="w-11 h-11 rounded-xl flex-shrink-0" />
        {!sidebarCollapsed && (
          <span className="ml-2.5 text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent whitespace-nowrap">
            MarketPhase
          </span>
        )}
      </Link>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-thin">
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
                title={sidebarCollapsed ? t(adminItem.labelKey) : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-rose-400" />
                )}
                <AdminIcon className={`w-[18px] h-[18px] flex-shrink-0 ${
                  isActive ? "text-rose-400" : "text-rose-500/70 dark:text-rose-400/70 group-hover:text-rose-400"
                }`} />
                {!sidebarCollapsed && <span className="truncate">{t(adminItem.labelKey)}</span>}
              </Link>
            </>
          );
        })()}

        {sections.map((section, idx) => renderSection(section, idx))}
      </nav>

      {/* Collapse button */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <button
          onClick={toggleSidebarCollapsed}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition text-xs"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>{t("sidebarCollapse")}</span></>}
        </button>
      </div>
    </aside>
  );
}
