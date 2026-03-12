"use client";

import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Sun, Moon, Download, LogOut, BarChart3, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Tableau de Bord" },
  { href: "/journal", label: "Journal" },
  { href: "/analytics", label: "Analytiques" },
  { href: "/screenshots", label: "Screenshots" },
  { href: "/calendar", label: "Calendrier" },
  { href: "/chat", label: "Communauté", icon: "chat" },
];

export function Header() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

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
    <>
      <nav className="glass fixed w-full z-50 top-0 border-b border-gray-800 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                MarketPhase
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="theme-toggle text-xl"
                title="Changer de thème"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-400" />
                )}
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-800 hover:bg-gray-700 transition text-sm flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-3 py-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition text-sm border border-rose-500/30 flex items-center"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="fixed top-16 w-full z-40 bg-gray-900/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-800 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-2">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  pathname === tab.href
                    ? "tab-active"
                    : "text-gray-400 hover:text-current"
                }`}
              >
                {"icon" in tab && tab.icon === "chat" && (
                  <MessageCircle className="w-4 h-4" />
                )}
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
