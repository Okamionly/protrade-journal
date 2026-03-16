"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  TrendingUp,
  Globe,
  CalendarDays,
  Camera,
  CalendarRange,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Gauge,
  Trophy,
  Grid3x3,
  Target,
  Zap,
  Upload,
  Crosshair,
  FileBarChart,
  Shield,
  AlertOctagon,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/analytics/distribution", label: "Distribution", icon: Clock },
  { href: "/risk", label: "Risk Manager", icon: Shield },
  { href: "/mistakes", label: "Erreurs", icon: AlertOctagon },
  { href: "/strategies", label: "Stratégies", icon: Crosshair },
  { href: "/import", label: "Import CSV", icon: Upload },
  { divider: true, label: "PERFORMANCE" },
  { href: "/performance", label: "Score", icon: Trophy },
  { href: "/heatmap", label: "Heatmap", icon: Grid3x3 },
  { href: "/daily-bias", label: "Daily Bias", icon: Target },
  { divider: true, label: "MARCHÉ" },
  { href: "/cot", label: "Rapport COT", icon: TrendingUp },
  { href: "/macro", label: "Macro", icon: Globe },
  { href: "/calendar-eco", label: "Calendrier Éco", icon: CalendarDays },
  { href: "/sentiment", label: "Sentiment", icon: Gauge },
  { href: "/currency-strength", label: "Force Devises", icon: Zap },
  { href: "/news", label: "News", icon: Newspaper },
  { divider: true, label: "OUTILS" },
  { href: "/recaps", label: "Recaps", icon: FileBarChart },
  { href: "/screenshots", label: "Screenshots", icon: Camera },
  { href: "/calendar", label: "Planning", icon: CalendarRange },
  { href: "/chat", label: "Chat", icon: MessageCircle },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
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

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group relative ${
                isActive
                  ? "bg-cyan-500/15 text-cyan-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
              }`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-cyan-400 rounded-r-full" />
              )}
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-cyan-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"}`} />
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
