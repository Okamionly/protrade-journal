"use client";

import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Sun, Moon, LogOut, Monitor, ChevronDown, Globe } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { NotificationCenter } from "./NotificationCenter";
import { NewsTicker } from "./NewsTicker";
import { useTrades } from "@/hooks/useTrades";
import type { Locale } from "@/i18n/types";

const LOCALE_FLAGS: Record<Locale, { flag: string; label: string }> = {
  fr: { flag: "🇫🇷", label: "Français" },
  en: { flag: "🇬🇧", label: "English" },
  ar: { flag: "🇸🇦", label: "العربية" },
  es: { flag: "🇪🇸", label: "Español" },
  de: { flag: "🇩🇪", label: "Deutsch" },
};

const LOCALE_STORAGE_KEY = "lbma-locale";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { trades } = useTrades();
  const [langOpen, setLangOpen] = useState(false);
  const [locale, setLocaleState] = useState<Locale>("fr");
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (stored && LOCALE_FLAGS[stored]) setLocaleState(stored);
  }, []);

  // Sync locale if changed from LBMA page
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCALE_STORAGE_KEY && e.newValue) {
        const newLocale = e.newValue as Locale;
        if (LOCALE_FLAGS[newLocale]) setLocaleState(newLocale);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    if (langOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [langOpen]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_STORAGE_KEY, l);
    // Dispatch event so LBMA page picks up the change
    window.dispatchEvent(new StorageEvent("storage", { key: LOCALE_STORAGE_KEY, newValue: l }));
    setLangOpen(false);
  };

  const current = LOCALE_FLAGS[locale];

  return (
    <header className="fixed top-8 right-0 left-0 z-40 h-14 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
      <div className="h-full flex items-center gap-2 px-4 sm:px-6">
        {/* News ticker in the middle */}
        <NewsTicker />

        {/* Theme toggle: dark → light → oled → dark */}
        <button
          onClick={() => {
            if (theme === "dark") setTheme("light");
            else if (theme === "light") setTheme("oled");
            else setTheme("dark");
          }}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          title={mounted ? `Thème: ${theme === "oled" ? "OLED" : theme === "dark" ? "Sombre" : "Clair"}` : "Thème"}
        >
          {mounted && (theme === "dark" ? (
            <Sun className="w-[18px] h-[18px] text-yellow-500" />
          ) : theme === "light" ? (
            <Monitor className="w-[18px] h-[18px] text-purple-500" />
          ) : (
            <Moon className="w-[18px] h-[18px] text-blue-500" />
          ))}
        </button>

        {/* Notifications */}
        <NotificationCenter trades={trades} />

        {/* Language dropdown with flags */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition text-sm"
            style={{ color: "var(--text-secondary)" }}
            title="Langue"
          >
            <span className="text-base leading-none">{current.flag}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
          </button>

          {langOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-44 rounded-xl overflow-hidden shadow-xl z-50"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              {(Object.keys(LOCALE_FLAGS) as Locale[]).map((l) => {
                const isActive = locale === l;
                const { flag, label } = LOCALE_FLAGS[l];
                return (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition hover:bg-[var(--bg-hover)] ${isActive ? "bg-blue-500/10" : ""}`}
                    style={{ color: isActive ? "rgb(59,130,246)" : "var(--text-primary)" }}
                  >
                    <span className="text-lg leading-none">{flag}</span>
                    <span className="font-medium">{label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition text-sm border border-rose-200 dark:border-rose-500/30 flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
