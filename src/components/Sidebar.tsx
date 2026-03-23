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
  AlertCircle,
  GraduationCap,
  Medal,
  Heart,
  ArrowUpDown,
  Gem,
  Search,
  LayoutGrid,
  GitBranch,
  LineChart,
  Webhook,
  Flag,
  Compass,
  Wheat,
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
  // TRADING — core daily workflow (always expanded)
  {
    id: "trading",
    labelKey: "sidebarSecTrading",
    alwaysExpanded: true,
    items: [
      { href: "/dashboard", labelKey: "sidebarDashboard", icon: LayoutDashboard },
      { href: "/journal", labelKey: "sidebarJournal", icon: BookOpen },
      { href: "/chart", labelKey: "sidebarChart", icon: LineChart },
      { href: "/daily-bias", labelKey: "sidebarDailyBias", icon: Target },
      { href: "/checklist", labelKey: "sidebarChecklist", icon: CheckSquare },
    ],
  },
  // ANALYTICS — analysis tools (collapsible)
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
      { href: "/analytics/sessions", labelKey: "sidebarSessions", icon: Clock },
    ],
  },
  // PERFORMANCE — deeper performance analysis (collapsible)
  {
    id: "performance",
    labelKey: "sidebarSecPerformance",
    items: [
      { href: "/performance/grading", labelKey: "sidebarGrading", icon: GraduationCap },
      { href: "/badges", labelKey: "sidebarBadges", icon: Medal },
      { href: "/playbook", labelKey: "sidebarPlaybook", icon: BookOpen },
      { href: "/strategies", labelKey: "sidebarStrategies", icon: Crosshair },
      { href: "/mistakes", labelKey: "sidebarErrors", icon: AlertCircle },
      { href: "/risk", labelKey: "sidebarRiskManager", icon: Shield },
    ],
  },
  // MARCHÉ — market data (collapsible, collapsed by default)
  {
    id: "market",
    labelKey: "sidebarSecMarket",
    defaultCollapsed: true,
    items: [
      { href: "/market-phase", labelKey: "sidebarMarketPhase", icon: Compass },
      { href: "/cot", labelKey: "sidebarCotReport", icon: TrendingUp },
      { href: "/macro", labelKey: "sidebarMacro", icon: Globe },
      { href: "/calendar-eco", labelKey: "sidebarEcoCalendar", icon: CalendarDays },
      { href: "/news", labelKey: "sidebarNews", icon: Newspaper },
      { href: "/technical-analysis", labelKey: "sidebarTechnicalAnalysis", icon: Activity },
      { href: "/market", labelKey: "sidebarMarketData", icon: Activity },
      { href: "/watchlist", labelKey: "sidebarWatchlist", icon: Eye },
      { href: "/volatility", labelKey: "sidebarVolatility", icon: Gauge },
      { href: "/earnings", labelKey: "sidebarEarnings", icon: CalendarDays },
      { href: "/sentiment", labelKey: "sidebarSentiment", icon: Heart },
      { href: "/currency-strength", labelKey: "sidebarCurrencyStrength", icon: ArrowUpDown },
      { href: "/lbma", labelKey: "sidebarLbmaMetals", icon: Gem },
      { href: "/commodities", labelKey: "sidebarCommodities", icon: Wheat },
      { href: "/scanner", labelKey: "sidebarScanner", icon: Search },
      { href: "/sector-heatmap", labelKey: "sidebarSectorHeatmap", icon: LayoutGrid },
      { href: "/flow", labelKey: "sidebarOptionsFlow", icon: GitBranch },
      { href: "/trump-tracker", labelKey: "sidebarTrumpTracker", icon: Flag },
    ],
  },
  // AVANCÉ — advanced tools (collapsible, collapsed by default)
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
  // OUTILS — utility tools (collapsible)
  {
    id: "tools",
    labelKey: "sidebarSecTools",
    items: [
      { href: "/custom-dashboard", labelKey: "sidebarMyDashboard", icon: Layers },
      { href: "/reports", labelKey: "sidebarPdfReports", icon: FileText },
      { href: "/screenshots", labelKey: "sidebarScreenshots", icon: Camera },
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
      { href: "/challenges", labelKey: "sidebarChallenges", icon: Swords, isVip: true },
      { href: "/leaderboard", labelKey: "sidebarLeaderboard", icon: Trophy, isVip: true },
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
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group relative ${
          isVipItem
            ? isActive
              ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              : "text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
            : isActive
              ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              : "text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
        }`}
        title={sidebarCollapsed ? t(item.labelKey) : undefined}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-500 dark:bg-blue-400" />
        )}
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${
          isActive
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300"
        }`} />
        {!sidebarCollapsed && (
          <span className="truncate">
            {t(item.labelKey)}
          </span>
        )}
        {!sidebarCollapsed && isVipItem && !isActive && (
          <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
            VIP
          </span>
        )}
      </Link>
    );
  };

  const renderSection = (section: SectionDef, idx: number) => {
    const isCollapsible = !section.alwaysExpanded;
    const isOpen = section.alwaysExpanded || !sectionCollapsed[section.id];
    const isVipSection = !!section.isVip;

    return (
      <div key={section.id}>
        {/* Separator line above each section (except first) */}
        {idx > 0 && (
          <div className="mx-3 my-2 border-t border-gray-100 dark:border-zinc-800" />
        )}

        {/* VIP section wrapper */}
        <div className={isVipSection ? "mx-2 my-1 px-1 py-1 rounded-lg bg-blue-50/50 dark:bg-blue-500/5" : ""}>
          {/* Section header */}
          <div className="pb-1">
            {!sidebarCollapsed ? (
              isCollapsible ? (
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-between w-full px-3 text-xs font-medium tracking-widest text-gray-400 dark:text-zinc-500 uppercase hover:text-gray-600 dark:hover:text-zinc-400 transition-colors"
                >
                  <span>{t(section.labelKey)}</span>
                  {isOpen ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              ) : (
                <span className="px-3 text-xs font-medium tracking-widest text-gray-400 dark:text-zinc-500 uppercase">
                  {t(section.labelKey)}
                </span>
              )
            ) : (
              <div className="border-t border-gray-100 dark:border-zinc-800 mx-2" />
            )}
          </div>

          {/* Section items with smooth collapse */}
          <div
            className={`overflow-hidden transition-all duration-200 ease-in-out ${
              isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="space-y-0.5">
              {section.items.map(renderNavItem)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-8 h-[calc(100%-2rem)] z-50 flex-col transition-all duration-300 ${
        sidebarCollapsed ? "w-16" : "w-56"
      } bg-white dark:bg-zinc-900 border-r border-[--border] ${
        mobileOpen ? "flex" : "hidden md:flex"
      }`}
    >
      {/* Logo area */}
      <Link href="/dashboard" className="flex items-center h-16 px-3 border-b border-gray-100 dark:border-zinc-800 hover:opacity-80 transition-opacity">
        <Image src="/logo-icon.png" alt="MarketPhase" width={44} height={44} className="w-11 h-11 rounded-xl flex-shrink-0" />
        {!sidebarCollapsed && (
          <span className="ml-2.5 text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
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
              <div className="mx-2 mb-2 px-1 py-1 rounded-lg bg-red-50 dark:bg-red-500/5">
                <Link
                  href={adminItem.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group relative ${
                    isActive
                      ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                      : "text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10"
                  }`}
                  title={sidebarCollapsed ? t(adminItem.labelKey) : undefined}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-red-500" />
                  )}
                  <AdminIcon className={`w-[18px] h-[18px] flex-shrink-0 ${
                    isActive ? "text-red-600 dark:text-red-400" : "text-red-400 dark:text-red-500 group-hover:text-red-600 dark:group-hover:text-red-400"
                  }`} />
                  {!sidebarCollapsed && <span className="truncate">{t(adminItem.labelKey)}</span>}
                </Link>
              </div>
            </>
          );
        })()}

        {sections.map((section, idx) => renderSection(section, idx))}
      </nav>

      {/* Collapse button */}
      <div className="p-2 border-t border-gray-100 dark:border-zinc-800 space-y-1">
        <button
          onClick={toggleSidebarCollapsed}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition text-xs"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>{t("sidebarCollapse")}</span></>}
        </button>
      </div>
    </aside>
  );
}
