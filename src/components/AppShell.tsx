"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { LiveTicker } from "./LiveTicker";
import { LocaleProvider } from "@/i18n/context";
import { Menu, X } from "lucide-react";

const SidebarContext = createContext({ collapsed: false, mobileOpen: false, setMobileOpen: (_v: boolean) => {} });

export function useIsSidebarCollapsed() {
  return useContext(SidebarContext).collapsed;
}

export function useMobileSidebar() {
  const ctx = useContext(SidebarContext);
  return { mobileOpen: ctx.mobileOpen, setMobileOpen: ctx.setMobileOpen };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);

    const handler = () => {
      const val = localStorage.getItem("sidebar-collapsed");
      setCollapsed(val === "true");
    };
    window.addEventListener("storage", handler);
    window.addEventListener("sidebar-toggle", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("sidebar-toggle", handler);
    };
  }, []);

  return (
    <LocaleProvider>
      <SidebarContext.Provider value={{ collapsed, mobileOpen, setMobileOpen }}>
        <div className="fixed top-0 left-0 right-0 z-[60]">
          <LiveTicker />
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-[55] md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar: hidden on mobile unless mobileOpen */}
        <div className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 z-[56]`}>
          <Sidebar />
        </div>

        <Header />

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="fixed top-10 left-3 z-[57] md:hidden w-10 h-10 rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-lg"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <main
          className={`pt-24 pb-10 px-4 md:pr-6 transition-all duration-300 min-h-screen ${
            collapsed ? "md:pl-20" : "md:pl-60"
          }`}
        >
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </SidebarContext.Provider>
    </LocaleProvider>
  );
}
