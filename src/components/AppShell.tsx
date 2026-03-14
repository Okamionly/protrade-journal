"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const SidebarContext = createContext({ collapsed: false });

export function useIsSidebarCollapsed() {
  return useContext(SidebarContext).collapsed;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);

    // Listen for storage changes from the Sidebar component
    const handler = () => {
      const val = localStorage.getItem("sidebar-collapsed");
      setCollapsed(val === "true");
    };
    window.addEventListener("storage", handler);
    // Also use a custom event for same-tab updates
    window.addEventListener("sidebar-toggle", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("sidebar-toggle", handler);
    };
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <Sidebar />
      <Header />
      <main
        className={`pt-16 pb-10 pr-6 transition-all duration-300 min-h-screen ${
          collapsed ? "pl-20" : "pl-60"
        }`}
      >
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </SidebarContext.Provider>
  );
}
