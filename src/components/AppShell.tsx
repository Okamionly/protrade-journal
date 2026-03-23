"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { LiveTicker } from "./LiveTicker";
import { QuickTradeButton } from "./QuickTradeButton";
import { OnboardingWizard } from "./OnboardingWizard";
import { LocaleProvider } from "@/i18n/context";
import { ErrorBoundary } from "./ErrorBoundary";
import { ShortcutsHelpModal } from "./ShortcutsHelpModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Menu, X } from "lucide-react";

const SidebarContext = createContext({ collapsed: false });

export function useIsSidebarCollapsed() {
  return useContext(SidebarContext).collapsed;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { showShortcutsHelp, setShowShortcutsHelp } = useKeyboardShortcuts();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Listen for sidebar-closed events
  useEffect(() => {
    const handler = () => setMobileOpen(false);
    window.addEventListener("mobile-sidebar-closed", handler);
    return () => window.removeEventListener("mobile-sidebar-closed", handler);
  }, []);

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
      <SidebarContext.Provider value={{ collapsed }}>
        <div className="fixed top-0 left-0 right-0 z-[60]">
          <LiveTicker />
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-[45] md:hidden"
            onClick={() => {
              setMobileOpen(false);
              window.dispatchEvent(new CustomEvent("mobile-sidebar", { detail: false }));
            }}
          />
        )}

        <Sidebar />

        <Header />

        {/* Mobile hamburger button */}
        <button
          onClick={() => {
            const next = !mobileOpen;
            setMobileOpen(next);
            window.dispatchEvent(new CustomEvent("mobile-sidebar", { detail: next }));
          }}
          id="mobile-hamburger"
          className="fixed top-10 left-3 z-[70] md:hidden w-10 h-10 rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-lg"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <main
          className={`pt-24 pb-10 px-4 md:pr-6 transition-all duration-300 min-h-screen bg-[var(--bg-secondary)] ${
            collapsed ? "md:pl-20" : "md:pl-60"
          }`}
        >
          <div className="max-w-[1400px] mx-auto">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>

        <QuickTradeButton />
        <OnboardingWizard />
        <ShortcutsHelpModal open={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />
      </SidebarContext.Provider>
    </LocaleProvider>
  );
}
