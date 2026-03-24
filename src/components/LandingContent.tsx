"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  BookOpen,
  Brain,
  Shield,
  Activity,
  Check,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Zap,
  Trophy,
  Target,
  Flame,
  Monitor,
  Layers,
  LineChart,
  Swords,
  CalendarDays,
  X,
  Award,
  Sparkles,
  LayoutDashboard,
  Crosshair,
  Globe,
  ChevronDown,
  Crown,
  Star,
  Play,
} from "lucide-react";
import type { Locale } from "@/i18n/types";

// ─── Locale flags for the language selector ───
const LOCALE_FLAGS: Record<Locale, { flag: string; label: string }> = {
  fr: { flag: "\u{1F1EB}\u{1F1F7}", label: "Francais" },
  en: { flag: "\u{1F1EC}\u{1F1E7}", label: "English" },
  ar: { flag: "\u{1F1F8}\u{1F1E6}", label: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
  es: { flag: "\u{1F1EA}\u{1F1F8}", label: "Espanol" },
  de: { flag: "\u{1F1E9}\u{1F1EA}", label: "Deutsch" },
};

const STORAGE_KEY = "lbma-locale";
const SUPPORTED: Locale[] = ["fr", "en", "ar", "es", "de"];

// ─── Inline translations loader ───
import fr from "@/i18n/locales/fr.json";
import en from "@/i18n/locales/en.json";
import ar from "@/i18n/locales/ar.json";
import es from "@/i18n/locales/es.json";
import de from "@/i18n/locales/de.json";

const dicts: Record<Locale, Record<string, string>> = { fr, en, ar, es, de };

function detectBrowserLocale(): Locale {
  try {
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const lang of languages) {
      const primary = lang.split("-")[0].toLowerCase() as Locale;
      if (SUPPORTED.includes(primary)) return primary;
    }
  } catch { /* SSR */ }
  return "fr";
}

// ─── Counter animation card (dark themed) ───
function CounterCard({ stat, visible }: { stat: { num: number; prefix: string; suffix: string; decimals: number; label: string }; visible: boolean }) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!visible || hasAnimated.current) return;
    hasAnimated.current = true;
    const duration = 1800;
    const steps = 40;
    const increment = stat.num / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, stat.num);
      setCount(current);
      if (step >= steps) {
        setCount(stat.num);
        clearInterval(timer);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [visible, stat.num]);

  const display = stat.prefix + (stat.decimals > 0 ? count.toFixed(stat.decimals) : Math.round(count).toLocaleString("fr-FR")) + stat.suffix;

  return (
    <div className="p-4 sm:p-6 rounded-2xl border border-[#1e293b] bg-[#111827]">
      <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent mb-1">{display}</div>
      <p className="text-xs sm:text-sm text-slate-400">{stat.label}</p>
    </div>
  );
}

// ─── Section wrapper for entrance animations ───
function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"} ${className}`}
    >
      {children}
    </div>
  );
}

export default function LandingContent() {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [langOpen, setLangOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Initialize locale
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && SUPPORTED.includes(stored)) {
      setLocaleState(stored);
    } else {
      const detected = detectBrowserLocale();
      setLocaleState(detected);
      localStorage.setItem(STORAGE_KEY, detected);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: l }));
    setLangOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    if (langOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [langOpen]);

  // Stats intersection observer
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const t = (key: string): string => dicts[locale]?.[key] || dicts.fr[key] || key;

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-[#0a0f1a] text-slate-100 overflow-y-auto">
      <h1 className="sr-only">Journal de Trading Gratuit — MarketPhase</h1>

      {/* ==================== NAVBAR ==================== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5" onClick={() => scrollToSection("hero")}>
              <Image src="/logo-icon.png" alt="MarketPhase journal de trading gratuit" width={40} height={40} sizes="40px" className="w-10 h-10 rounded-xl" />
              <span className="text-lg font-bold text-white hidden sm:inline">MarketPhase</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {[
                { label: "Features", id: "features" },
                { label: "Journal", id: "journal" },
                { label: "Analytics", id: "analytics" },
                { label: "AI Coach", id: "ai-coach" },
                { label: "Compare", id: "compare" },
                { label: "Pricing", id: "pricing" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Language selector */}
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition"
                  aria-label="Select language"
                >
                  <span className="text-base leading-none">{LOCALE_FLAGS[locale].flag}</span>
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-xl overflow-hidden shadow-xl z-50 bg-[#111827] border border-[#1e293b]">
                    {(Object.keys(LOCALE_FLAGS) as Locale[]).map((l) => {
                      const isActive = locale === l;
                      return (
                        <button
                          key={l}
                          onClick={() => setLocale(l)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs transition hover:bg-white/5 ${isActive ? "bg-emerald-500/10" : ""}`}
                        >
                          <span className="text-base leading-none">{LOCALE_FLAGS[l].flag}</span>
                          <span className={`font-medium ${isActive ? "text-emerald-400" : "text-slate-300"}`}>{LOCALE_FLAGS[l].label}</span>
                          {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <Link href="/login" className="hidden sm:inline-flex text-sm text-slate-400 hover:text-white px-3 py-2 transition">{t("landing_login")}</Link>
              <Link href="/register" title="Ouvrir un journal de trading gratuit" className="text-xs sm:text-sm font-semibold text-white px-4 sm:px-5 py-2 rounded-full border border-emerald-500/50 hover:bg-emerald-500 hover:border-emerald-500 transition-all whitespace-nowrap">
                {t("landing_cta")}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* ==================== SECTION 1: HERO ==================== */}
        <section id="hero" className="pt-32 pb-24 sm:pt-40 sm:pb-32 px-4">
          <AnimatedSection className="max-w-5xl mx-auto text-center relative">
            {/* Radial glow background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-emerald-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-6">
                {t("landing_badge")}
              </p>

              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white mb-6">
                {t("landing_heroTitle1")}{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                  {t("landing_heroTitle2")}
                </span>{" "}
                {t("landing_heroTitle3")}
              </h2>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
                {t("landing_heroSub")}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <Link href="/register" title="Creer mon journal de trading gratuit" className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-bold text-white px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                  {t("landing_ctaPrimary")}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition border border-[#1e293b] rounded-full px-6 py-3.5 hover:border-slate-600">
                  {t("landing_ctaDemo")}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5 mb-6">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                Pas de carte bancaire requise
              </p>

              {/* Trust bar */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300 mb-16">
                <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-400" /> Utilis&eacute; dans <strong className="text-slate-200">15+ pays</strong></span>
                <span className="hidden sm:inline text-slate-500">&bull;</span>
                <span>&#11088; 4.9/5 satisfaction</span>
                <span className="hidden sm:inline text-slate-500">&bull;</span>
                <span>35+ outils gratuits</span>
              </div>

              {/* Dashboard screenshot */}
              <div className="max-w-4xl mx-auto">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400/30 via-purple-500/25 to-teal-400/30 rounded-2xl blur-sm" />
                  <div className="relative rounded-2xl overflow-hidden border border-[#1e293b] bg-[#111827]" style={{ boxShadow: '0 0 80px rgba(16,185,129,0.15), 0 0 160px rgba(16,185,129,0.05)' }}>
                    <img src="/screenshots/hero-demo.gif" alt="Tableau de bord du journal de trading gratuit MarketPhase" className="w-full h-auto" loading="eager" fetchPriority="high" />
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </section>


        {/* ==================== SECTION 2: FEATURES OVERVIEW (3x3 grid) ==================== */}
        <section id="features" className="py-24 sm:py-32 px-4" style={{ borderTop: '1px solid rgba(16,185,129,0.1)', boxShadow: '0 -1px 20px rgba(16,185,129,0.05)' }}>
          <AnimatedSection className="max-w-5xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <div className="w-10 h-0.5 bg-gradient-to-r from-emerald-500/80 to-emerald-500/0 mx-auto mb-4" />
              <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4">{t("landing_featuresTag")}</p>
              <h2 className="text-3xl sm:text-5xl font-black text-white">
                {t("landing_featuresTitle")}
              </h2>
            </div>
            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Faint radial glow behind features grid */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-radial from-emerald-500/8 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
              {[
                { icon: BookOpen, title: t("landing_feat1"), desc: t("landing_feat1Desc") },
                { icon: BarChart3, title: t("landing_feat2"), desc: t("landing_feat2Desc") },
                { icon: Brain, title: t("landing_feat3"), desc: t("landing_feat3Desc") },
                { icon: Monitor, title: t("landing_feat4"), desc: t("landing_feat4Desc") },
                { icon: Play, title: t("landing_feat5"), desc: t("landing_feat5Desc") },
                { icon: LineChart, title: t("landing_feat6"), desc: t("landing_feat6Desc") },
                { icon: Swords, title: t("landing_feat7"), desc: t("landing_feat7Desc") },
                { icon: Layers, title: t("landing_feat8"), desc: t("landing_feat8Desc") },
                { icon: CalendarDays, title: t("landing_feat9"), desc: t("landing_feat9Desc") },
              ].map((f) => (
                <div key={f.title} className="relative group p-5 sm:p-6 rounded-2xl bg-[#111827] hover:border-emerald-500/30 transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]" style={{ border: '1px solid rgba(16,185,129,0.15)', borderRadius: '1rem' }}>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition">
                    <f.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h4 className="font-bold text-white text-base mb-1.5">{f.title}</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </section>


        {/* ==================== SECTION 3: JOURNAL (text left, screenshot right) ==================== */}
        <section id="journal" className="py-24 sm:py-32 px-4" style={{ borderTop: '1px solid rgba(16,185,129,0.1)', boxShadow: '0 -1px 20px rgba(16,185,129,0.05)' }}>
          <AnimatedSection className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <div className="flex-1 text-center lg:text-left">
                <div className="w-10 h-0.5 bg-gradient-to-r from-emerald-500/80 to-emerald-500/0 mx-auto lg:mx-0 mb-3" />
                <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">{t("landing_sec1Tag")}</p>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-4 text-white">
                  {t("landing_sec1Title1")}<br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{t("landing_sec1Title2")}</span>
                </h2>
                <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">{t("landing_sec1Desc")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: BookOpen, title: t("landing_sec1Card1Title"), desc: t("landing_sec1Card1Desc") },
                    { icon: BarChart3, title: t("landing_sec1Card2Title"), desc: t("landing_sec1Card2Desc") },
                    { icon: CalendarDays, title: t("landing_sec1Card3Title"), desc: t("landing_sec1Card3Desc") },
                  ].map(c => (
                    <div key={c.title} className="p-4 rounded-xl bg-[#111827] border border-[#1e293b] hover:border-emerald-500/30 transition-all">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                        <c.icon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">{c.title}</h4>
                      <p className="text-xs text-slate-300">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="rounded-xl overflow-hidden border border-[#1e293b] bg-[#111827] shadow-2xl shadow-black/50">
                  <img src="/screenshots/dashboard.png" alt="Journal de trading saisie et suivi des trades" className="w-full h-auto" loading="lazy" />
                </div>
              </div>
            </div>
          </AnimatedSection>
        </section>


        {/* ==================== SECTION 4: ANALYTICS (screenshot left, text right) ==================== */}
        <section id="analytics" className="py-24 sm:py-32 px-4" style={{ borderTop: '1px solid rgba(16,185,129,0.1)', boxShadow: '0 -1px 20px rgba(16,185,129,0.05)' }}>
          <AnimatedSection className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-16">
              <div className="flex-1 text-center lg:text-left">
                <div className="w-10 h-0.5 bg-gradient-to-r from-purple-500/80 to-purple-500/0 mx-auto lg:mx-0 mb-3" />
                <p className="text-purple-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">{t("landing_sec2Tag")}</p>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-4 text-white">
                  {t("landing_sec2Title1")}<br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">{t("landing_sec2Title2")}</span>
                </h2>
                <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">{t("landing_sec2Desc")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Activity, title: t("landing_sec2Card1Title"), desc: t("landing_sec2Card1Desc") },
                    { icon: Layers, title: t("landing_sec2Card2Title"), desc: t("landing_sec2Card2Desc") },
                    { icon: Target, title: t("landing_sec2Card3Title"), desc: t("landing_sec2Card3Desc") },
                  ].map(c => (
                    <div key={c.title} className="p-4 rounded-xl bg-[#111827] border border-[#1e293b] hover:border-purple-500/30 transition-all">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                        <c.icon className="w-4 h-4 text-purple-400" />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">{c.title}</h4>
                      <p className="text-xs text-slate-300">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="rounded-xl overflow-hidden border border-[#1e293b] bg-[#111827] shadow-2xl shadow-black/50">
                  <img src="/screenshots/analytics.png" alt="Analyse trading et statistiques avancees MarketPhase" className="w-full h-auto" loading="lazy" />
                </div>
              </div>
            </div>
          </AnimatedSection>
        </section>


        {/* ==================== SECTION 5: AI COACH (text left, screenshot right) ==================== */}
        <section id="ai-coach" className="py-24 sm:py-32 px-4" style={{ borderTop: '1px solid rgba(16,185,129,0.1)', boxShadow: '0 -1px 20px rgba(16,185,129,0.05)' }}>
          <AnimatedSection className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <div className="flex-1 text-center lg:text-left">
                <div className="w-10 h-0.5 bg-gradient-to-r from-emerald-500/80 to-emerald-500/0 mx-auto lg:mx-0 mb-3" />
                <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">{t("landing_sec3Tag")}</p>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-4 text-white">
                  {t("landing_sec3Title1")}<br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{t("landing_sec3Title2")}</span>
                </h2>
                <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">{t("landing_sec3Desc")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Brain, title: t("landing_sec3Card1Title"), desc: t("landing_sec3Card1Desc") },
                    { icon: Crosshair, title: t("landing_sec3Card2Title"), desc: t("landing_sec3Card2Desc") },
                    { icon: Sparkles, title: t("landing_sec3Card3Title"), desc: t("landing_sec3Card3Desc") },
                  ].map(c => (
                    <div key={c.title} className="p-4 rounded-xl bg-[#111827] border border-[#1e293b] hover:border-emerald-500/30 transition-all">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                        <c.icon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">{c.title}</h4>
                      <p className="text-xs text-slate-300">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="rounded-xl overflow-hidden border border-[#1e293b] bg-[#111827] shadow-2xl shadow-black/50">
                  <img src="/screenshots/ai-coach.png" alt="Coach IA pour ameliorer votre trading" className="w-full h-auto" loading="lazy" />
                </div>
              </div>
            </div>
          </AnimatedSection>
        </section>


        {/* ==================== SECTION 6: STATS/NUMBERS ==================== */}
        <section id="stats" className="py-24 sm:py-32 px-4" style={{ borderTop: '1px solid rgba(16,185,129,0.1)', boxShadow: '0 -1px 20px rgba(16,185,129,0.05)' }}>
          <AnimatedSection className="max-w-5xl mx-auto text-center">
            <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {[
                { num: 35, prefix: "", suffix: "+", decimals: 0, label: t("landing_statTools") },
                { num: 15, prefix: "", suffix: "+", decimals: 0, label: "Pays" },
                { num: 100, prefix: "", suffix: "%", decimals: 0, label: t("landing_statFree") },
                { num: 4.9, prefix: "", suffix: "/5", decimals: 1, label: "Satisfaction" },
              ].map((stat) => (
                <CounterCard key={stat.label} stat={stat} visible={statsVisible} />
              ))}
            </div>
          </AnimatedSection>
        </section>


        {/* ==================== SECTION 7: COMPARISON TABLE ==================== */}
        <section id="compare" className="py-24 sm:py-32 px-4" style={{ borderTop: '1px solid rgba(16,185,129,0.1)', boxShadow: '0 -1px 20px rgba(16,185,129,0.05)' }}>
          <AnimatedSection className="max-w-5xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <div className="w-10 h-0.5 bg-gradient-to-r from-emerald-500/80 to-emerald-500/0 mx-auto mb-4" />
              <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4">{t("landing_compareTag")}</p>
              <h2 className="text-3xl sm:text-5xl font-black text-white">
                {t("landing_compareTitle1")}<br /><span className="text-slate-500">{t("landing_compareTitle2")}</span>
              </h2>
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#1e293b] bg-[#0d1117] shadow-lg overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#1e293b] bg-[#111827]">
                    <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-slate-400 font-medium w-1/4"></th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-center w-1/4">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2">
                        <Image src="/logo-icon.png" alt="MarketPhase journal de trading" width={24} height={24} sizes="24px" className="w-5 h-5 sm:w-6 sm:h-6 rounded-md" />
                        <span className="font-bold text-white text-xs sm:text-sm">MarketPhase</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-slate-400 font-medium w-1/4">TradeZella</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-slate-400 font-medium w-1/4">Tradervue</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { f: t("landing_comparePrice"), mp: t("landing_compareFree"), tz: "49$/mo", tv: "49$/mo" },
                    { f: t("landing_compareTools"), mp: "35+", tz: "~15", tv: "~10" },
                    { f: "Coach IA", mp: true, tz: false, tv: false },
                    { f: "War Room (cockpit)", mp: true, tz: false, tv: false },
                    { f: "Backtesting \u00AB Et si \u00BB", mp: true, tz: false, tv: false },
                    { f: "Gamification / XP", mp: true, tz: false, tv: false },
                    { f: "Matrice de corr\u00E9lation", mp: true, tz: false, tv: false },
                    { f: "Donn\u00E9es de march\u00E9 live", mp: true, tz: false, tv: false },
                    { f: "Replay de trades", mp: true, tz: true, tv: false },
                    { f: t("landing_compareThemes"), mp: true, tz: false, tv: false },
                  ].map((r, idx) => (
                    <tr key={r.f} className={`border-b border-[#1e293b] last:border-0 ${idx % 2 === 0 ? "bg-[#0d1117]" : "bg-[#111827]/50"}`}>
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-slate-300 font-medium text-xs sm:text-sm">{r.f}</td>
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-center">
                        {typeof r.mp === "string" ? <span className="font-bold text-emerald-400 text-xs sm:text-sm">{r.mp}</span> : r.mp ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-400/50 mx-auto" />}
                      </td>
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-center">
                        {typeof r.tz === "string" ? <span className="text-slate-400 font-medium text-xs sm:text-sm">{r.tz}</span> : r.tz ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 mx-auto" /> : <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-400/50 mx-auto" />}
                      </td>
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-center">
                        {typeof r.tv === "string" ? <span className="text-slate-400 font-medium text-xs sm:text-sm">{r.tv}</span> : r.tv ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 mx-auto" /> : <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-400/50 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedSection>
        </section>


        {/* ==================== SECTION 8: TESTIMONIALS ==================== */}
        <section id="testimonials" className="py-24 sm:py-32 px-4" style={{ borderTop: '1px solid rgba(16,185,129,0.1)', boxShadow: '0 -1px 20px rgba(16,185,129,0.05)' }}>
          <AnimatedSection className="max-w-5xl mx-auto text-center">
            <div className="w-10 h-0.5 bg-gradient-to-r from-emerald-500/80 to-emerald-500/0 mx-auto mb-4" />
            <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4">{t("landing_testimonialTag")}</p>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
              {t("landing_testimonialTitle1")}{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">{t("landing_testimonialTitle2")}</span>
            </h2>
            <p className="text-slate-300 text-sm sm:text-lg max-w-2xl mx-auto mb-12">{t("landing_testimonialSub")}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {[
                { name: t("landing_testimonial1Name"), role: t("landing_testimonial1Role"), style: t("landing_testimonial1Style"), text: t("landing_testimonial1Text"), grad: "from-emerald-500 to-teal-400" },
                { name: t("landing_testimonial2Name"), role: t("landing_testimonial2Role"), style: t("landing_testimonial2Style"), text: t("landing_testimonial2Text"), grad: "from-purple-500 to-violet-400" },
                { name: t("landing_testimonial3Name"), role: t("landing_testimonial3Role"), style: t("landing_testimonial3Style"), text: t("landing_testimonial3Text"), grad: "from-emerald-400 to-cyan-400" },
              ].map((tm) => (
                <div key={tm.name} className="relative p-5 sm:p-6 rounded-2xl bg-[#111827] border border-[#1e293b] text-left hover:border-emerald-500/30 hover:-translate-y-1 transition-all duration-300">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-xs sm:text-sm italic leading-relaxed mb-4">&ldquo;{tm.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${tm.grad} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xs font-bold">{tm.name.split(" ").map((n: string) => n[0]).join("")}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{tm.name}</p>
                      <p className="text-xs text-slate-400">{tm.role} &middot; {tm.style}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </section>


        {/* ==================== SECTION 9: PRICING ==================== */}
        <section id="pricing" className="py-24 sm:py-32 px-4" style={{ borderTop: '1px solid rgba(16,185,129,0.1)', boxShadow: '0 -1px 20px rgba(16,185,129,0.05)' }}>
          <AnimatedSection className="max-w-5xl mx-auto text-center">
            <div className="w-10 h-0.5 bg-gradient-to-r from-emerald-500/80 to-emerald-500/0 mx-auto mb-4" />
            <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4">{t("landing_pricingTag")}</p>
            <h2 className="text-3xl sm:text-5xl font-black mb-4 text-white">{t("landing_pricingTitle")}</h2>
            <p className="text-slate-300 text-sm sm:text-lg mb-12 sm:mb-16">{t("landing_pricingSub")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-20">
              {/* Free card */}
              <div className="relative rounded-3xl p-6 sm:p-8 bg-[#111827] border border-[#1e293b] shadow-lg">
                <div className="text-4xl sm:text-5xl font-black text-white mb-1">0&#8364;</div>
                <p className="text-slate-400 mb-1 text-sm sm:text-base font-semibold">Free</p>
                <p className="text-slate-400 mb-6 text-xs">{t("landing_pricingPerMonth")}</p>
                <div className="w-full h-px bg-[#1e293b] mb-5" />
                <p className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t("landing_pricingFreeLabel")}</p>
                <ul className="space-y-2 text-left mb-8">
                  {[
                    t("landing_pricingItem1"), t("landing_pricingItem2"), t("landing_pricingItem3"),
                    t("landing_pricingItem4"), t("landing_pricingItem5"),
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-300 text-xs sm:text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="group w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-white px-6 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all">
                  {t("landing_pricingCta")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="mt-3 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  Pas de carte bancaire requise
                </p>
              </div>

              {/* VIP card */}
              <div className="relative rounded-3xl p-6 sm:p-8 bg-[#111827] border-2 border-amber-500/30 shadow-xl shadow-amber-500/5">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-lg">
                  <Star className="w-3 h-3 fill-white" />
                  {t("landing_pricingVipBadge")}
                </div>
                <div className="flex items-baseline gap-1 justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-white">9.99&#8364;</span>
                </div>
                <p className="text-amber-400 mb-1 text-sm sm:text-base font-semibold flex items-center justify-center gap-1.5">
                  <Crown className="w-4 h-4" /> VIP
                </p>
                <p className="text-slate-400 mb-6 text-xs">{t("landing_pricingVipPer")}</p>
                <div className="w-full h-px bg-amber-500/20 mb-5" />
                <p className="text-left text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">{t("landing_pricingVipLabel")}</p>
                <ul className="space-y-2 text-left mb-8">
                  {[
                    t("landing_pricingVip1"), t("landing_pricingVip2"), t("landing_pricingVip3"),
                    t("landing_pricingVip4"), t("landing_pricingVip5"),
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="text-slate-300 text-xs sm:text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="group w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-white px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:shadow-xl hover:shadow-amber-500/25 transition-all">
                  {t("landing_pricingVipCta")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* FAQ */}
            <div className="max-w-2xl mx-auto text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-white text-center mb-6">{t("landing_faqTitle")}</h3>
              {([
                { q: t("landing_faqQ1"), a: t("landing_faqA1") },
                { q: t("landing_faqQ2"), a: t("landing_faqA2") },
                { q: t("landing_faqQ3"), a: t("landing_faqA3") },
              ] as { q: string; a: string }[]).map((faq, idx) => (
                <details key={idx} className="group border-b border-[#1e293b] last:border-0">
                  <summary className="flex items-center justify-between cursor-pointer py-4 text-sm sm:text-base font-medium text-slate-200 hover:text-white transition-colors [&::-webkit-details-marker]:hidden list-none">
                    {faq.q}
                    <ChevronDown className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                  </summary>
                  <p className="pb-4 text-xs sm:text-sm text-slate-300 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </AnimatedSection>
        </section>


        {/* ==================== SECTION 10: FINAL CTA ==================== */}
        <section id="final-cta" className="py-24 sm:py-32 px-4" style={{ borderTop: '1px solid rgba(16,185,129,0.1)', boxShadow: '0 -1px 20px rgba(16,185,129,0.05)' }}>
          <AnimatedSection className="max-w-4xl mx-auto text-center relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-radial from-emerald-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            <h2 className="relative text-2xl sm:text-4xl lg:text-5xl font-black mb-4 sm:mb-6 text-white">
              {t("landing_finalTitle1")}
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                {t("landing_finalTitle2")}
              </span>
            </h2>
            <p className="relative text-sm sm:text-lg text-slate-300 mb-8 max-w-xl mx-auto">
              {t("landing_finalSub")}
            </p>
            <Link href="/register" title="Demarrer le journal de trading gratuit" className="relative group w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base sm:text-lg font-bold text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-1">
              {t("landing_finalCta")}
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="relative mt-4 text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              Pas de carte bancaire requise
            </p>
          </AnimatedSection>
        </section>

        {/* ==================== SECTION 11: FOOTER ==================== */}
        <footer className="border-t border-[#1e293b] py-12 bg-[#0a0f1a]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 sm:gap-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Image src="/logo-icon.png" alt="MarketPhase journal de trading" width={28} height={28} sizes="28px" className="w-7 h-7 rounded-lg" />
                  <span className="font-bold text-white">MarketPhase</span>
                </div>
                <p className="text-xs text-slate-400 max-w-xs">{t("landing_footerDesc")}</p>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t("landing_footerProduct")}</h5>
                <ul className="space-y-2">
                  {[
                    { l: t("landing_navFeatures"), id: "features" },
                    { l: t("landing_navPreview"), id: "journal" },
                    { l: t("landing_navPricing"), id: "pricing" },
                    { l: t("landing_navCompare"), id: "compare" },
                  ].map((i) => (
                    <li key={i.id}><button onClick={() => scrollToSection(i.id)} className="text-xs text-slate-400 hover:text-white transition">{i.l}</button></li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t("landing_footerAccount")}</h5>
                <ul className="space-y-2">
                  {[
                    { l: t("landing_login"), h: "/login" },
                    { l: t("landing_footerSignup"), h: "/register" },
                    { l: t("landing_footerDemo"), h: "/login" },
                  ].map(i => (
                    <li key={i.l}><Link href={i.h} className="text-xs text-slate-400 hover:text-white transition">{i.l}</Link></li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-4">
                <div className="flex items-center gap-3">
                  <a href="https://twitter.com/marketphase" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-[#111827] border border-[#1e293b] flex items-center justify-center hover:bg-[#1e293b] transition">
                    <Globe className="w-4 h-4 text-slate-400" />
                  </a>
                </div>
                <p className="text-xs text-slate-500">{t("landing_footerCopyright")}</p>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
