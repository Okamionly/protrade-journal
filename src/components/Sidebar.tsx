"use client";

import Link from "next/link";
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
} from "lucide-react";
import { useState, useEffect } from "react";

// Admin nav item (shown only for ADMIN users)
const adminItem = {
  href: "/admin",
  label: "Admin Panel",
  icon: Shield,
  isAdmin: true,
};

const navItems = [
  // TRADING
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/analytics/distribution", label: "Distribution", icon: Clock },
  { href: "/risk", label: "Risk Manager", icon: Shield },
  { href: "/mistakes", label: "Erreurs", icon: AlertOctagon },
  { href: "/strategies", label: "Stratégies", icon: Crosshair },
  { href: "/playbook", label: "Playbook", icon: BookMarked },
  { href: "/checklist", label: "Checklist", icon: CheckSquare },
  { href: "/import", label: "Import CSV", icon: Upload },
  // PERFORMANCE
  { divider: true, label: "PERFORMANCE" },
  { href: "/performance", label: "Score", icon: Trophy },
  { href: "/performance/grading", label: "Notation", icon: Award },
  { href: "/calendar", label: "P&L Calendar", icon: CalendarDays },
  { href: "/heatmap", label: "Heatmap", icon: Grid3x3 },
  { href: "/daily-bias", label: "Daily Bias", icon: Target },
  { href: "/challenges", label: "Challenges", icon: Swords },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal },
  // MARCHÉ
  { divider: true, label: "MARCHÉ" },
  { href: "/cot", label: "Rapport COT", icon: TrendingUp },
  { href: "/macro", label: "Macro", icon: Globe },
  { href: "/calendar-eco", label: "Calendrier Éco", icon: CalendarDays },
  { href: "/sentiment", label: "Sentiment", icon: Gauge },
  { href: "/currency-strength", label: "Force Devises", icon: Zap },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/market", label: "Market Data", icon: Activity },
  { href: "/scanner", label: "Scanner", icon: Crosshair },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/sector-heatmap", label: "Heatmap Secteurs", icon: Grid3x3 },
  { href: "/volatility", label: "Volatilité", icon: Gauge },
  { href: "/earnings", label: "Earnings", icon: CalendarDays },
  { href: "/flow", label: "Options Flow", icon: Zap },
  // AVANCÉ
  { divider: true, label: "AVANCÉ" },
  { href: "/ai-coach", label: "AI Coach", icon: Brain },
  { href: "/war-room", label: "War Room", icon: Monitor },
  { href: "/backtest", label: "Backtesting", icon: FlaskConical },
  { href: "/calculator", label: "Calculateur", icon: Calculator },
  { href: "/replay", label: "Replay", icon: Play },
  { href: "/correlation", label: "Corrélation", icon: Layers },
  { href: "/compare", label: "Comparaison", icon: GitCompare },
  // OUTILS
  { divider: true, label: "OUTILS" },
  { href: "/custom-dashboard", label: "Mon Dashboard", icon: Layers },
  { href: "/reports", label: "Rapports PDF", icon: FileText },
  { href: "/recaps", label: "Recaps", icon: FileBarChart },
  { href: "/screenshots", label: "Screenshots", icon: Camera },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  // PREMIUM
  { divider: true, label: "PREMIUM" },
  { href: "/vip", label: "VIP", icon: Crown, isVip: true },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

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

  return (
    <aside
      className={`fixed left-0 top-8 h-[calc(100%-2rem)] z-50 flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      } bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800`}
    >
      {/* Logo area */}
      <div className="flex items-center h-14 px-3 border-b border-gray-200 dark:border-gray-800">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
          <BarChart3 className="text-white w-5 h-5" />
        </div>
        {!collapsed && (
          <span className="ml-2.5 text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent whitespace-nowrap">
            MarketPhase
          </span>
        )}
      </div>

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
                title={collapsed ? adminItem.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-rose-400" />
                )}
                <AdminIcon className={`w-[18px] h-[18px] flex-shrink-0 ${
                  isActive ? "text-rose-400" : "text-rose-500/70 dark:text-rose-400/70 group-hover:text-rose-400"
                }`} />
                {!collapsed && <span className="truncate">{adminItem.label}</span>}
              </Link>
              <div className="pt-1 pb-1">
                {!collapsed && (
                  <span className="px-3 text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-600 uppercase">TRADING</span>
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
                {!collapsed && "label" in item && item.label && (
                  <span className="px-3 text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-600 uppercase">{item.label}</span>
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
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
              }`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${isVipItem ? "bg-amber-400" : "bg-cyan-400"}`} />
              )}
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${
                isVipItem
                  ? isActive ? "text-amber-400" : "text-amber-500/70 dark:text-amber-400/70 group-hover:text-amber-400"
                  : isActive ? "text-cyan-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
              }`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition text-xs"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Réduire</span></>}
        </button>
      </div>
    </aside>
  );
}
