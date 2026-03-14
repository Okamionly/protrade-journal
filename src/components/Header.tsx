"use client";

import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Sun, Moon, Download, LogOut, Bell } from "lucide-react";

export function Header() {
  const { theme, setTheme } = useTheme();

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
    <header className="fixed top-0 right-0 left-0 z-40 h-14 border-b border-gray-800 bg-gray-900/80 backdrop-blur-xl">
      <div className="h-full flex items-center justify-end gap-3 px-4 sm:px-6">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-white/5 transition text-gray-400 hover:text-white"
          title="Changer de thème"
        >
          {theme === "dark" ? (
            <Sun className="w-[18px] h-[18px] text-yellow-400" />
          ) : (
            <Moon className="w-[18px] h-[18px] text-blue-400" />
          )}
        </button>
        <button
          className="p-2 rounded-lg hover:bg-white/5 transition text-gray-400 hover:text-white relative"
          title="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition text-sm flex items-center gap-2 text-gray-300"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition text-sm border border-rose-500/30 flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
