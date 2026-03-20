"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  CalendarDays,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Gauge,
  Trophy,
  Grid3x3,
  Upload,
  Crosshair,
  Clock,
  BookMarked,
  Activity,
  Calculator,
  Brain,
  Play,
  GitCompare,
  Layers,
  Eye,
  CheckSquare,
  Swords,
  FlaskConical,
  Monitor,
  Medal,
  FileText,
  Crown,
  Shield,
  AlertOctagon,
  Award,
  Target,
  TrendingUp,
  Globe,
  Zap,
  FileBarChart,
  Camera,
  User,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Locale } from "@/i18n/types";

const LOCALE_FLAGS: Record<Locale, { flag: string; short: string }> = {
  fr: { flag: "🇫🇷", short: "FR" },
  en: { flag: "🇬🇧", short: "EN" },
  ar: { flag: "🇸🇦", short: "AR" },
  es: { flag: "🇪🇸", short: "ES" },
  de: { flag: "🇩🇪", short: "DE" },
};
const LOCALE_STORAGE_KEY = "lbma-locale";

// Admin nav item (shown only for ADMIN users)
const adminItem = {
  href: "/admin",
  labelKey: "adminPanel" as const,
  icon: Shield,
  isAdmin: true,
};

// ─── Sidebar translations ───
type SidebarKey =
  | "adminPanel" | "secTrading" | "dashboard" | "journal" | "analytics" | "distribution"
  | "riskManager" | "errors" | "strategies" | "playbook" | "checklist" | "importCsv"
  | "secPerformance" | "score" | "grading" | "plCalendar" | "heatmap" | "dailyBias"
  | "challenges" | "leaderboard"
  | "secMarket" | "cotReport" | "macro" | "ecoCalendar" | "sentiment" | "currencyStrength"
  | "news" | "marketData" | "lbmaMetals" | "scanner" | "watchlist" | "sectorHeatmap"
  | "volatility" | "earnings" | "optionsFlow"
  | "secAdvanced" | "aiCoach" | "warRoom" | "backtesting" | "calculator" | "replay"
  | "correlation" | "comparison"
  | "secTools" | "myDashboard" | "pdfReports" | "recaps" | "screenshots" | "chat"
  | "secMySpace" | "profile"
  | "secPremium" | "vip" | "indicators" | "macroAnalyses"
  | "collapse";

const SIDEBAR_I18N: Record<Locale, Record<SidebarKey, string>> = {
  fr: {
    adminPanel: "Admin Panel", secTrading: "TRADING", dashboard: "Dashboard", journal: "Journal", analytics: "Analytics",
    distribution: "Distribution", riskManager: "Risk Manager", errors: "Erreurs", strategies: "Stratégies",
    playbook: "Playbook", checklist: "Checklist", importCsv: "Import CSV",
    secPerformance: "PERFORMANCE", score: "Score", grading: "Notation", plCalendar: "P&L Calendrier",
    heatmap: "Heatmap", dailyBias: "Daily Bias", challenges: "Challenges", leaderboard: "Leaderboard",
    secMarket: "MARCHÉ", cotReport: "Rapport COT", macro: "Macro", ecoCalendar: "Calendrier Éco",
    sentiment: "Sentiment", currencyStrength: "Force Devises", news: "News", marketData: "Market Data",
    lbmaMetals: "LBMA Métaux", scanner: "Scanner", watchlist: "Watchlist", sectorHeatmap: "Heatmap Secteurs",
    volatility: "Volatilité", earnings: "Earnings", optionsFlow: "Options Flow",
    secAdvanced: "AVANCÉ", aiCoach: "AI Coach", warRoom: "War Room", backtesting: "Backtesting",
    calculator: "Calculateur", replay: "Replay", correlation: "Corrélation", comparison: "Comparaison",
    secTools: "OUTILS", myDashboard: "Mon Dashboard", pdfReports: "Rapports PDF", recaps: "Recaps",
    screenshots: "Screenshots", chat: "Chat",
    secMySpace: "MON ESPACE", profile: "Profil",
    secPremium: "PREMIUM", vip: "VIP", indicators: "Indicateurs", macroAnalyses: "Analyses Macro",
    collapse: "Réduire",
  },
  en: {
    adminPanel: "Admin Panel", secTrading: "TRADING", dashboard: "Dashboard", journal: "Journal", analytics: "Analytics",
    distribution: "Distribution", riskManager: "Risk Manager", errors: "Mistakes", strategies: "Strategies",
    playbook: "Playbook", checklist: "Checklist", importCsv: "Import CSV",
    secPerformance: "PERFORMANCE", score: "Score", grading: "Grading", plCalendar: "P&L Calendar",
    heatmap: "Heatmap", dailyBias: "Daily Bias", challenges: "Challenges", leaderboard: "Leaderboard",
    secMarket: "MARKET", cotReport: "COT Report", macro: "Macro", ecoCalendar: "Eco Calendar",
    sentiment: "Sentiment", currencyStrength: "Currency Strength", news: "News", marketData: "Market Data",
    lbmaMetals: "LBMA Metals", scanner: "Scanner", watchlist: "Watchlist", sectorHeatmap: "Sector Heatmap",
    volatility: "Volatility", earnings: "Earnings", optionsFlow: "Options Flow",
    secAdvanced: "ADVANCED", aiCoach: "AI Coach", warRoom: "War Room", backtesting: "Backtesting",
    calculator: "Calculator", replay: "Replay", correlation: "Correlation", comparison: "Comparison",
    secTools: "TOOLS", myDashboard: "My Dashboard", pdfReports: "PDF Reports", recaps: "Recaps",
    screenshots: "Screenshots", chat: "Chat",
    secMySpace: "MY SPACE", profile: "Profile",
    secPremium: "PREMIUM", vip: "VIP", indicators: "Indicators", macroAnalyses: "Macro Analyses",
    collapse: "Collapse",
  },
  ar: {
    adminPanel: "لوحة الإدارة", secTrading: "التداول", dashboard: "لوحة القيادة", journal: "اليومية", analytics: "التحليلات",
    distribution: "التوزيع", riskManager: "إدارة المخاطر", errors: "الأخطاء", strategies: "الاستراتيجيات",
    playbook: "دليل التداول", checklist: "قائمة المراجعة", importCsv: "استيراد CSV",
    secPerformance: "الأداء", score: "النتيجة", grading: "التقييم", plCalendar: "تقويم الأرباح",
    heatmap: "خريطة حرارية", dailyBias: "الانحياز اليومي", challenges: "التحديات", leaderboard: "المتصدرين",
    secMarket: "السوق", cotReport: "تقرير COT", macro: "ماكرو", ecoCalendar: "التقويم الاقتصادي",
    sentiment: "المعنويات", currencyStrength: "قوة العملات", news: "الأخبار", marketData: "بيانات السوق",
    lbmaMetals: "معادن LBMA", scanner: "الماسح", watchlist: "قائمة المراقبة", sectorHeatmap: "خريطة القطاعات",
    volatility: "التقلبات", earnings: "الأرباح", optionsFlow: "تدفق الخيارات",
    secAdvanced: "متقدم", aiCoach: "مدرب AI", warRoom: "غرفة العمليات", backtesting: "الاختبار الخلفي",
    calculator: "الآلة الحاسبة", replay: "إعادة", correlation: "الارتباط", comparison: "المقارنة",
    secTools: "أدوات", myDashboard: "لوحتي", pdfReports: "تقارير PDF", recaps: "ملخصات",
    screenshots: "لقطات الشاشة", chat: "الدردشة",
    secMySpace: "مساحتي", profile: "الملف الشخصي",
    secPremium: "بريميوم", vip: "VIP", indicators: "المؤشرات", macroAnalyses: "تحليلات ماكرو",
    collapse: "طي",
  },
  es: {
    adminPanel: "Panel Admin", secTrading: "TRADING", dashboard: "Dashboard", journal: "Diario", analytics: "Análisis",
    distribution: "Distribución", riskManager: "Gestión de Riesgo", errors: "Errores", strategies: "Estrategias",
    playbook: "Playbook", checklist: "Checklist", importCsv: "Importar CSV",
    secPerformance: "RENDIMIENTO", score: "Puntuación", grading: "Calificación", plCalendar: "Calendario P&L",
    heatmap: "Mapa de Calor", dailyBias: "Sesgo Diario", challenges: "Desafíos", leaderboard: "Clasificación",
    secMarket: "MERCADO", cotReport: "Informe COT", macro: "Macro", ecoCalendar: "Calendario Eco",
    sentiment: "Sentimiento", currencyStrength: "Fuerza Divisas", news: "Noticias", marketData: "Datos de Mercado",
    lbmaMetals: "Metales LBMA", scanner: "Escáner", watchlist: "Watchlist", sectorHeatmap: "Mapa Sectores",
    volatility: "Volatilidad", earnings: "Resultados", optionsFlow: "Flujo Opciones",
    secAdvanced: "AVANZADO", aiCoach: "Coach IA", warRoom: "Sala de Guerra", backtesting: "Backtesting",
    calculator: "Calculadora", replay: "Replay", correlation: "Correlación", comparison: "Comparación",
    secTools: "HERRAMIENTAS", myDashboard: "Mi Dashboard", pdfReports: "Informes PDF", recaps: "Resúmenes",
    screenshots: "Capturas", chat: "Chat",
    secMySpace: "MI ESPACIO", profile: "Perfil",
    secPremium: "PREMIUM", vip: "VIP", indicators: "Indicadores", macroAnalyses: "Análisis Macro",
    collapse: "Reducir",
  },
  de: {
    adminPanel: "Admin-Panel", secTrading: "HANDEL", dashboard: "Dashboard", journal: "Journal", analytics: "Analyse",
    distribution: "Verteilung", riskManager: "Risikomanager", errors: "Fehler", strategies: "Strategien",
    playbook: "Playbook", checklist: "Checkliste", importCsv: "CSV Import",
    secPerformance: "LEISTUNG", score: "Punktzahl", grading: "Bewertung", plCalendar: "P&L Kalender",
    heatmap: "Heatmap", dailyBias: "Tagesbias", challenges: "Challenges", leaderboard: "Rangliste",
    secMarket: "MARKT", cotReport: "COT-Bericht", macro: "Makro", ecoCalendar: "Wirtschaftskalender",
    sentiment: "Stimmung", currencyStrength: "Währungsstärke", news: "Nachrichten", marketData: "Marktdaten",
    lbmaMetals: "LBMA Metalle", scanner: "Scanner", watchlist: "Watchlist", sectorHeatmap: "Sektor-Heatmap",
    volatility: "Volatilität", earnings: "Earnings", optionsFlow: "Optionsfluss",
    secAdvanced: "ERWEITERT", aiCoach: "KI-Coach", warRoom: "War Room", backtesting: "Backtesting",
    calculator: "Rechner", replay: "Replay", correlation: "Korrelation", comparison: "Vergleich",
    secTools: "WERKZEUGE", myDashboard: "Mein Dashboard", pdfReports: "PDF-Berichte", recaps: "Zusammenfassungen",
    screenshots: "Screenshots", chat: "Chat",
    secMySpace: "MEIN BEREICH", profile: "Profil",
    secPremium: "PREMIUM", vip: "VIP", indicators: "Indikatoren", macroAnalyses: "Makroanalysen",
    collapse: "Einklappen",
  },
};

// Nav items use labelKey instead of label
const navItems = [
  // TRADING
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/journal", labelKey: "journal", icon: BookOpen },
  { href: "/analytics", labelKey: "analytics", icon: BarChart3 },
  { href: "/analytics/distribution", labelKey: "distribution", icon: Clock },
  { href: "/risk", labelKey: "riskManager", icon: Shield },
  { href: "/mistakes", labelKey: "errors", icon: AlertOctagon },
  { href: "/strategies", labelKey: "strategies", icon: Crosshair },
  { href: "/playbook", labelKey: "playbook", icon: BookMarked },
  { href: "/checklist", labelKey: "checklist", icon: CheckSquare },
  { href: "/import", labelKey: "importCsv", icon: Upload },
  // PERFORMANCE
  { divider: true, labelKey: "secPerformance" },
  { href: "/performance", labelKey: "score", icon: Trophy },
  { href: "/performance/grading", labelKey: "grading", icon: Award },
  { href: "/calendar", labelKey: "plCalendar", icon: CalendarDays },
  { href: "/heatmap", labelKey: "heatmap", icon: Grid3x3 },
  { href: "/daily-bias", labelKey: "dailyBias", icon: Target },
  { href: "/challenges", labelKey: "challenges", icon: Swords },
  { href: "/leaderboard", labelKey: "leaderboard", icon: Medal },
  // MARCHÉ
  { divider: true, labelKey: "secMarket" },
  { href: "/cot", labelKey: "cotReport", icon: TrendingUp },
  { href: "/macro", labelKey: "macro", icon: Globe },
  { href: "/calendar-eco", labelKey: "ecoCalendar", icon: CalendarDays },
  { href: "/sentiment", labelKey: "sentiment", icon: Gauge },
  { href: "/currency-strength", labelKey: "currencyStrength", icon: Zap },
  { href: "/news", labelKey: "news", icon: Newspaper },
  { href: "/market", labelKey: "marketData", icon: Activity },
  { href: "/lbma", labelKey: "lbmaMetals", icon: Award },
  { href: "/scanner", labelKey: "scanner", icon: Crosshair },
  { href: "/watchlist", labelKey: "watchlist", icon: Eye },
  { href: "/sector-heatmap", labelKey: "sectorHeatmap", icon: Grid3x3 },
  { href: "/volatility", labelKey: "volatility", icon: Gauge },
  { href: "/earnings", labelKey: "earnings", icon: CalendarDays },
  { href: "/flow", labelKey: "optionsFlow", icon: Zap },
  // AVANCÉ
  { divider: true, labelKey: "secAdvanced" },
  { href: "/ai-coach", labelKey: "aiCoach", icon: Brain },
  { href: "/war-room", labelKey: "warRoom", icon: Monitor },
  { href: "/backtest", labelKey: "backtesting", icon: FlaskConical },
  { href: "/calculator", labelKey: "calculator", icon: Calculator },
  { href: "/replay", labelKey: "replay", icon: Play },
  { href: "/correlation", labelKey: "correlation", icon: Layers },
  { href: "/compare", labelKey: "comparison", icon: GitCompare },
  // OUTILS
  { divider: true, labelKey: "secTools" },
  { href: "/custom-dashboard", labelKey: "myDashboard", icon: Layers },
  { href: "/reports", labelKey: "pdfReports", icon: FileText },
  { href: "/recaps", labelKey: "recaps", icon: FileBarChart },
  { href: "/screenshots", labelKey: "screenshots", icon: Camera },
  { href: "/chat", labelKey: "chat", icon: MessageCircle },
  // MON ESPACE
  { divider: true, labelKey: "secMySpace" },
  { href: "/profile", labelKey: "profile", icon: User },
  // PREMIUM
  { divider: true, labelKey: "secPremium" },
  { href: "/vip", labelKey: "vip", icon: Crown, isVip: true },
  { href: "/vip/indicateurs", labelKey: "indicators", icon: Crosshair, isVip: true },
  { href: "/vip/analyses", labelKey: "macroAnalyses", icon: Globe, isVip: true },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (storedLocale && LOCALE_FLAGS[storedLocale]) setLocaleState(storedLocale);
  }, []);

  // Sync locale from Header/LBMA changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCALE_STORAGE_KEY && e.newValue && LOCALE_FLAGS[e.newValue as Locale]) {
        setLocaleState(e.newValue as Locale);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Close lang dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    if (langOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [langOpen]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_STORAGE_KEY, l);
    window.dispatchEvent(new StorageEvent("storage", { key: LOCALE_STORAGE_KEY, newValue: l }));
    setLangOpen(false);
  };

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role) setUserRole(data.role);
      })
      .catch(() => {});
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
    window.dispatchEvent(new Event("sidebar-toggle"));
  };

  const [mobileOpen, setMobileOpen] = useState(false);

  // Listen for mobile toggle events from AppShell
  useEffect(() => {
    const handler = (e: CustomEvent) => setMobileOpen(e.detail);
    window.addEventListener("mobile-sidebar" as string, handler as EventListener);
    return () => window.removeEventListener("mobile-sidebar" as string, handler as EventListener);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
    window.dispatchEvent(new CustomEvent("mobile-sidebar-closed"));
  }, [pathname]);

  return (
    <aside
      className={`fixed left-0 top-8 h-[calc(100%-2rem)] z-50 flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      } bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 ${
        mobileOpen ? "flex" : "hidden md:flex"
      }`}
    >
      {/* Logo area */}
      <div className="flex items-center h-14 px-3 border-b border-gray-200 dark:border-gray-800">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
          <BarChart3 className="text-white w-5 h-5" />
        </div>
        {!collapsed && (
          <span className="ml-2.5 text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent whitespace-nowrap">
            MarketPhase
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {/* Admin link - only visible for ADMIN users */}
        {userRole === "ADMIN" && (() => {
          const isActive = pathname === adminItem.href || pathname?.startsWith(adminItem.href + "/");
          const AdminIcon = adminItem.icon;
          return (
            <>
              <Link
                href={adminItem.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group relative ${
                  isActive
                    ? "bg-rose-500/15 text-rose-400"
                    : "text-rose-500/80 dark:text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10"
                }`}
                title={collapsed ? SIDEBAR_I18N[locale][adminItem.labelKey] : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-rose-400" />
                )}
                <AdminIcon className={`w-[18px] h-[18px] flex-shrink-0 ${
                  isActive ? "text-rose-400" : "text-rose-500/70 dark:text-rose-400/70 group-hover:text-rose-400"
                }`} />
                {!collapsed && <span className="truncate">{SIDEBAR_I18N[locale][adminItem.labelKey]}</span>}
              </Link>
              <div className="pt-1 pb-1">
                {!collapsed && (
                  <span className="px-3 text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-600 uppercase">{SIDEBAR_I18N[locale].secTrading}</span>
                )}
                {collapsed && <div className="border-t border-gray-200 dark:border-gray-800 mx-2" />}
              </div>
            </>
          );
        })()}
        {navItems.map((item, i) => {
          if ("divider" in item && item.divider) {
            return (
              <div key={`div-${i}`} className="pt-3 pb-1">
                {!collapsed && (
                  <span className="px-3 text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-600 uppercase">{SIDEBAR_I18N[locale][item.labelKey]}</span>
                )}
                {collapsed && <div className="border-t border-gray-200 dark:border-gray-800 mx-2" />}
              </div>
            );
          }

          if (!("href" in item)) return null;
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const isVipItem = "isVip" in item && item.isVip;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group relative ${
                isVipItem
                  ? isActive
                    ? "bg-amber-500/15 text-amber-400"
                    : "text-amber-500/80 dark:text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/10"
                  : isActive
                    ? "bg-cyan-500/15 text-cyan-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"
              }`}
              title={collapsed ? SIDEBAR_I18N[locale][item.labelKey] : undefined}
            >
              {isActive && (
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${isVipItem ? "bg-amber-400" : "bg-cyan-400"}`} />
              )}
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${
                isVipItem
                  ? isActive ? "text-amber-400" : "text-amber-500/70 dark:text-amber-400/70 group-hover:text-amber-400"
                  : isActive ? "text-cyan-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
              }`} />
              {!collapsed && <span className="truncate">{SIDEBAR_I18N[locale][item.labelKey]}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Language selector + Collapse button */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
        {/* Language */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition text-xs"
            title="Langue"
          >
            <span className="text-base leading-none">{LOCALE_FLAGS[locale].flag}</span>
            {!collapsed && <span className="flex-1 text-left">{LOCALE_FLAGS[locale].short}</span>}
          </button>
          {langOpen && (
            <div
              className="absolute bottom-full left-0 mb-1 w-40 rounded-xl overflow-hidden shadow-xl z-50"
              style={{ background: "var(--bg-card, #1a1a2e)", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}
            >
              {(Object.keys(LOCALE_FLAGS) as Locale[]).map((l) => {
                const isActive = locale === l;
                const { flag, short } = LOCALE_FLAGS[l];
                return (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
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

        {/* Collapse */}
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition text-xs"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>{SIDEBAR_I18N[locale].collapse}</span></>}
        </button>
      </div>
    </aside>
  );
}
