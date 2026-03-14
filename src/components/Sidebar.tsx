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
} from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { divider: true },
  { href: "/cot", label: "Rapport COT", icon: TrendingUp },
  { href: "/macro", label: "Macro", icon: Globe },
  { href: "/calendar-eco", label: "Calendrier Éco", icon: CalendarDays },
  { divider: true },
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
      className={`fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      } bg-gray-900/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-800`}
    >
      {/* Logo area */}
      <div className="flex items-center h-14 px-3 border-b border-gray-800">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center flex-shrink-0">
          <BarChart3 className="text-white w-5 h-5" />
        </div>
        {!collapsed && (
          <span className="ml-2.5 text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent whitespace-nowrap">
            MarketPhase
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          if ("divider" in item) {
            return <div key={`div-${i}`} className="my-2 border-t border-gray-800" />;
          }

          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-cyan-400" : "text-gray-500 group-hover:text-gray-300"}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="p-2 border-t border-gray-800">
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition text-xs"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Réduire</span></>}
        </button>
      </div>
    </aside>
  );
}
