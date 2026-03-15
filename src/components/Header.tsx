"use client";

import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Sun, Moon, Download, LogOut, Bell, Monitor } from "lucide-react";
import { useState, useEffect } from "react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleExport = async () => {
    const res = await fetch("/api/trades/export");
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "marketphase-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <header className="fixed top-8 right-0 left-0 z-40 h-14 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
      <div className="h-full flex items-center justify-end gap-2 px-4 sm:px-6">
        {/* Theme toggle: dark → light → oled → dark */}
        <button
          onClick={() => {
            if (theme === "dark") setTheme("light");
            else if (theme === "light") setTheme("oled");
            else setTheme("dark");
          }}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          title={`Thème: ${theme === "oled" ? "OLED" : theme === "dark" ? "Sombre" : "Clair"}`}
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
        <button
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white relative"
          title="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
        </button>

        {/* Export CSV */}
        <button
          onClick={handleExport}
          className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm flex items-center gap-2 text-gray-600 dark:text-gray-300"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>

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
