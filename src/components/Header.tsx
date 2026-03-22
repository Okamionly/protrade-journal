"use client";

import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Sun, Moon, LogOut, Monitor, Eye, EyeOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { NotificationCenter } from "./NotificationCenter";
import { LoginStreak } from "./LoginStreak";
import { NewsTicker } from "./NewsTicker";
import { useTrades } from "@/hooks/useTrades";
import { useTranslation } from "@/i18n/context";
import type { Locale } from "@/i18n/types";

const LOCALE_FLAGS: Record<Locale, { flag: string; short: string }> = {
  fr: { flag: "🇫🇷", short: "FR" },
  en: { flag: "🇬🇧", short: "EN" },
  ar: { flag: "🇸🇦", short: "AR" },
  es: { flag: "🇪🇸", short: "ES" },
  de: { flag: "🇩🇪", short: "DE" },
};

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { trades } = useTrades();
  const { t, locale, setLocale } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Restore zen mode from localStorage
    const saved = localStorage.getItem("zen-mode");
    if (saved === "true") {
      setZenMode(true);
      document.documentElement.classList.add("zen-mode");
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    if (langOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [langOpen]);

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
          title={mounted ? `${t("theme")}: ${theme === "oled" ? t("themeOled") : theme === "dark" ? t("themeDark") : t("themeLight")}` : t("theme")}
        >
          {mounted && (theme === "dark" ? (
            <Sun className="w-[18px] h-[18px] text-yellow-500" />
          ) : theme === "light" ? (
            <Monitor className="w-[18px] h-[18px] text-purple-500" />
          ) : (
            <Moon className="w-[18px] h-[18px] text-blue-500" />
          ))}
        </button>

        {/* Zen Mode toggle */}
        <button
          onClick={() => {
            const next = !zenMode;
            setZenMode(next);
            localStorage.setItem("zen-mode", String(next));
            if (next) {
              document.documentElement.classList.add("zen-mode");
            } else {
              document.documentElement.classList.remove("zen-mode");
            }
          }}
          className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition ${zenMode ? "text-blue-500" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
          title={zenMode ? t("zenModeOn") : t("zenModeOff")}
        >
          {zenMode ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
        </button>

        {/* Login Streak */}
        <LoginStreak />

        {/* Notifications */}
        <NotificationCenter trades={trades} />

        {/* Language selector */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition text-sm"
            title={t("language")}
          >
            <span className="text-base leading-none">{LOCALE_FLAGS[locale]?.flag ?? "🇫🇷"}</span>
          </button>
          {langOpen && (
            <div
              className="absolute top-full right-0 mt-1 w-40 rounded-xl overflow-hidden shadow-xl z-50"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              {(Object.keys(LOCALE_FLAGS) as Locale[]).map((l) => {
                const isActive = locale === l;
                const { flag, short } = LOCALE_FLAGS[l];
                return (
                  <button
                    key={l}
                    onClick={() => { setLocale(l); setLangOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs transition hover:bg-[var(--bg-hover)] ${isActive ? "bg-blue-500/10" : ""}`}
                    style={{ color: isActive ? "rgb(59,130,246)" : "var(--text-primary, #e5e7eb)" }}
                  >
                    <span className="text-base leading-none">{flag}</span>
                    <span className="font-medium">{short}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
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
          <span className="hidden sm:inline">{t("logout")}</span>
        </button>
      </div>
    </header>
  );
}
