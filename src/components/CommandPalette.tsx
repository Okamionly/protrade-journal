"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  BookOpen,
  BarChart3,
  TrendingUp,
  Globe,
  CalendarDays,
  Camera,
  CalendarRange,
  MessageCircle,
  Newspaper,
  Gauge,
  Trophy,
  Grid3x3,
  Target,
  Zap,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";

interface Command {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const commands: Command[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, action: () => router.push("/dashboard"), keywords: "accueil home" },
    { id: "journal", label: "Journal", icon: BookOpen, action: () => router.push("/journal"), keywords: "trades" },
    { id: "analytics", label: "Analytics", icon: BarChart3, action: () => router.push("/analytics"), keywords: "statistiques stats" },
    { id: "performance", label: "Performance Score", icon: Trophy, action: () => router.push("/performance"), keywords: "score badge" },
    { id: "heatmap", label: "Heatmap", icon: Grid3x3, action: () => router.push("/heatmap"), keywords: "calendrier chaleur" },
    { id: "daily-bias", label: "Daily Bias", icon: Target, action: () => router.push("/daily-bias"), keywords: "plan biais" },
    { id: "cot", label: "Rapport COT", icon: TrendingUp, action: () => router.push("/cot"), keywords: "commitment traders" },
    { id: "macro", label: "Macro", icon: Globe, action: () => router.push("/macro"), keywords: "économie fred" },
    { id: "calendar-eco", label: "Calendrier Économique", icon: CalendarDays, action: () => router.push("/calendar-eco"), keywords: "événements" },
    { id: "sentiment", label: "Sentiment", icon: Gauge, action: () => router.push("/sentiment"), keywords: "fear greed peur" },
    { id: "currency", label: "Force Devises", icon: Zap, action: () => router.push("/currency-strength"), keywords: "devise monnaie" },
    { id: "news", label: "News", icon: Newspaper, action: () => router.push("/news"), keywords: "actualités" },
    { id: "screenshots", label: "Screenshots", icon: Camera, action: () => router.push("/screenshots") },
    { id: "planning", label: "Planning", icon: CalendarRange, action: () => router.push("/calendar") },
    { id: "chat", label: "Chat", icon: MessageCircle, action: () => router.push("/chat") },
    { id: "theme", label: theme === "dark" ? "Mode Clair" : "Mode Sombre", icon: theme === "dark" ? Sun : Moon, action: () => setTheme(theme === "dark" ? "light" : "dark"), keywords: "theme thème" },
  ];

  const filtered = query
    ? commands.filter((c) => {
        const searchStr = `${c.label} ${c.keywords || ""}`.toLowerCase();
        return query.toLowerCase().split(" ").every((w) => searchStr.includes(w));
      })
    : commands;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape") setOpen(false);
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const execute = (cmd: Command) => {
    cmd.action();
    setOpen(false);
    setQuery("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      execute(filtered[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Rechercher une page ou action..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-500 text-[10px] font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">Aucun résultat</div>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => execute(cmd)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    i === selectedIndex ? "bg-cyan-500/10 text-cyan-400" : "text-[--text-secondary] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{cmd.label}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-800 text-[10px] text-gray-600">
          <span>↑↓ naviguer</span>
          <span>↵ ouvrir</span>
          <span>esc fermer</span>
        </div>
      </div>
    </div>
  );
}
