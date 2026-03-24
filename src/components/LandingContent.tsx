"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  BookOpen,
  Brain,
  Shield,
  Activity,
  Play,
  Check,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
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
  Clock,
  Award,
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  Crosshair,
  Globe,
  ChevronDown,
  Crown,
  Star,
} from "lucide-react";
import LandingFeatureTabs from "@/components/LandingFeatureTabs";
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

const TOTAL_SLIDES = 10;

const SLIDE_LABELS = [
  "Hero",
  "Features",
  "Stats",
  "Journal",
  "Analytics",
  "AI Coach",
  "All Features",
  "Compare",
  "Community",
  "Pricing",
];

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

export default function LandingContent() {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [langOpen, setLangOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleSlides, setVisibleSlides] = useState<Set<number>>(new Set([0]));
  const langRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isScrolling = useRef(false);

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

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const t = (key: string): string => dicts[locale]?.[key] || dicts.fr[key] || key;

  // Navigate to slide
  const goToSlide = useCallback((index: number) => {
    if (index < 0 || index >= TOTAL_SLIDES) return;
    if (isMobile) {
      slideRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      const container = scrollRef.current;
      if (!container) return;
      isScrolling.current = true;
      container.scrollTo({ left: index * window.innerWidth, behavior: "smooth" });
      setTimeout(() => { isScrolling.current = false; }, 800);
    }
    setActiveSlide(index);
  }, [isMobile]);

  // Track active slide via scroll (desktop horizontal)
  useEffect(() => {
    if (isMobile) return;
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (isScrolling.current) return;
      const scrollLeft = container.scrollLeft;
      const slideWidth = window.innerWidth;
      const idx = Math.round(scrollLeft / slideWidth);
      setActiveSlide(Math.max(0, Math.min(idx, TOTAL_SLIDES - 1)));
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  // Track active slide via IntersectionObserver (mobile vertical)
  useEffect(() => {
    if (!isMobile) return;
    const observers: IntersectionObserver[] = [];
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSlide(i); },
        { threshold: 0.5 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [isMobile]);

  // IntersectionObserver for entrance animations
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleSlides(prev => new Set(prev).add(i));
          }
        },
        { threshold: 0.15, root: isMobile ? null : scrollRef.current }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [isMobile]);

  // Keyboard navigation
  useEffect(() => {
    if (isMobile) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goToSlide(Math.min(activeSlide + 1, TOTAL_SLIDES - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goToSlide(Math.max(activeSlide - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeSlide, isMobile, goToSlide]);

  // Wheel handler: convert vertical scroll to horizontal navigation (desktop)
  useEffect(() => {
    if (isMobile) return;
    let wheelTimeout: ReturnType<typeof setTimeout>;
    let accumulated = 0;
    const THRESHOLD = 80;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      accumulated += e.deltaY;
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => { accumulated = 0; }, 200);
      if (Math.abs(accumulated) >= THRESHOLD) {
        if (accumulated > 0) goToSlide(Math.min(activeSlide + 1, TOTAL_SLIDES - 1));
        else goToSlide(Math.max(activeSlide - 1, 0));
        accumulated = 0;
      }
    };
    const container = scrollRef.current;
    if (container) container.addEventListener("wheel", handleWheel, { passive: false });
    return () => { if (container) container.removeEventListener("wheel", handleWheel); };
  }, [activeSlide, isMobile, goToSlide]);

  const setSlideRef = (i: number) => (el: HTMLDivElement | null) => { slideRefs.current[i] = el; };

  const isVisible = (i: number) => visibleSlides.has(i);

  // Shared slide wrapper classes — dark themed
  const slideClass = isMobile
    ? "w-full min-h-screen flex flex-col justify-center px-4 py-24"
    : "min-w-[100vw] w-screen h-screen flex-shrink-0 flex flex-col justify-center overflow-y-auto px-8 lg:px-16";

  const animBase = "transition-all duration-700 ease-out";
  const animIn = "opacity-100 translate-x-0";
  const animOut = "opacity-0 translate-x-16";

  return (
    <div className="bg-[#0a0f1a] text-slate-100">
      <h1 className="sr-only">Journal de Trading Gratuit — MarketPhase</h1>
      {/* ==================== NAVBAR ==================== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[100vw] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5" onClick={() => goToSlide(0)}>
              <Image src="/logo-icon.png" alt="MarketPhase journal de trading gratuit" width={40} height={40} sizes="40px" className="w-10 h-10 rounded-xl" />
              <span className="text-lg font-bold text-white hidden sm:inline">MarketPhase</span>
            </Link>

            {/* Nav pills - desktop only */}
            {!isMobile && (
              <div className="hidden md:flex items-center gap-1">
                {SLIDE_LABELS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => goToSlide(i)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                      activeSlide === i
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

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

      {/* ==================== SIDE NAV DOTS (desktop only) ==================== */}
      {!isMobile && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2">
          {SLIDE_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => goToSlide(i)}
              className="group relative flex items-center"
              aria-label={`Go to ${label}`}
            >
              <span className="absolute right-full mr-3 px-2 py-1 rounded-md bg-[#111827] text-white text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[#1e293b]">
                {label}
              </span>
              <span
                className={`block rounded-full transition-all ${
                  activeSlide === i
                    ? "w-3 h-3 bg-emerald-400 shadow-md shadow-emerald-400/40"
                    : "w-2 h-2 bg-slate-600 hover:bg-slate-400"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* ==================== PREV/NEXT ARROWS (desktop only) ==================== */}
      {!isMobile && (
        <>
          {activeSlide > 0 && (
            <button
              onClick={() => goToSlide(activeSlide - 1)}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-[#111827]/80 backdrop-blur border border-[#1e293b] shadow-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#111827] transition-all"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {activeSlide < TOTAL_SLIDES - 1 && (
            <button
              onClick={() => goToSlide(activeSlide + 1)}
              className="fixed right-20 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-[#111827]/80 backdrop-blur border border-[#1e293b] shadow-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#111827] transition-all"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </>
      )}

      {/* ==================== SLIDE CONTAINER ==================== */}
      <main>
      <div
        ref={scrollRef}
        className={
          isMobile
            ? "w-full"
            : "flex w-screen h-screen overflow-x-hidden overflow-y-hidden scroll-smooth"
        }
        style={isMobile ? {} : { scrollSnapType: "x mandatory" }}
      >
        {/* ==================== SLIDE 1: HERO ==================== */}
        <div
          ref={setSlideRef(0)}
          className={slideClass}
          style={isMobile ? {} : { scrollSnapAlign: "start" }}
        >
          <div className={`${animBase} ${isVisible(0) ? animIn : animOut} max-w-7xl mx-auto w-full relative`}>
            {/* Radial glow background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-emerald-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="hidden sm:block absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-emerald-500/8 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="hidden sm:block absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-purple-500/8 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
              <div className="flex-1 max-w-2xl lg:max-w-none text-center lg:text-left">
                {/* Logo text design */}
                <div className="mb-8 flex justify-center lg:justify-start">
                  <Image src="/logo-icon.png" alt="Logo MarketPhase journal de trading gratuit" width={56} height={56} sizes="56px" className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl drop-shadow-lg" priority />
                  <div>
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"><span className="text-white">Market</span><span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">Phase</span></span>
                    <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-slate-500 font-medium mt-0.5">Time Creates Opportunity</p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs sm:text-sm font-medium mb-6">
                  <Flame className="w-3.5 h-3.5" />
                  {t("landing_badge")}
                </div>

                <h2 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight leading-[1.05] text-white break-words">
                  {t("landing_heroTitle1")}{" "}
                  <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                    {t("landing_heroTitle2")}
                  </span>{" "}
                  {t("landing_heroTitle3")}
                </h2>

                <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  {t("landing_heroSub")}
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start gap-4">
                  <Link href="/register" title="Creer mon journal de trading gratuit" className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-bold text-white px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5">
                    {t("landing_ctaPrimary")}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition py-4">
                    {t("landing_ctaDemo")}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Sub-CTA text */}
                <p className="mt-3 text-xs text-slate-500 flex items-center justify-center lg:justify-start gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-600" />
                  Pas de carte bancaire requise
                </p>

                {/* Urgency / FOMO */}
                <p className="mt-4 text-xs text-slate-500 flex items-center justify-center lg:justify-start gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Utilis&eacute; par des traders dans <strong className="text-slate-300">15+ pays</strong></span>
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start gap-4 sm:gap-6">
                  <span className="text-sm text-slate-400 font-medium">35+ outils gratuits</span>
                  <span className="text-sm text-slate-500">Journal &bull; Analytics &bull; AI Coach &bull; Market Data</span>
                  <div className="flex -space-x-2">
                    {["MP","AI","VIP"].map((a, i) => (
                      <div key={a} className="w-7 h-7 rounded-full border-2 border-[#0a0f1a] flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{background: `hsl(${i*60+160}, 60%, 45%)`, zIndex: 3-i}}>
                        {a}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust bar */}
                <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-500">
                  <span>&#128274; Donn&eacute;es chiffr&eacute;es</span>
                  <span className="hidden sm:inline text-slate-700">&bull;</span>
                  <span>&#11088; 4.9/5 satisfaction</span>
                  <span className="hidden sm:inline text-slate-700">&bull;</span>
                  <span>&#127758; Utilis&eacute; dans 15+ pays</span>
                  <span className="hidden sm:inline text-slate-700">&bull;</span>
                  <span>&#128179; Sans carte bancaire</span>
                </div>
              </div>

              <div className="flex-1 w-full lg:w-auto max-w-2xl">
                <div className="relative animate-hero-float">
                  <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400/20 via-purple-500/20 to-teal-400/20 rounded-2xl blur-sm" />
                  <div className="relative rounded-2xl overflow-hidden border border-[#1e293b] shadow-2xl shadow-black/50 bg-[#111827]">
                    <img src="/screenshots/dashboard.gif" alt="Tableau de bord du journal de trading gratuit MarketPhase" className="w-full h-auto" loading="eager" fetchPriority="high" />
                  </div>
                  <div className="hidden sm:block absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-8 p-3 sm:p-4 rounded-xl bg-[#111827]/95 backdrop-blur-sm border border-[#1e293b] shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Profit Factor</p>
                        <p className="text-lg font-black text-emerald-400">9.53</p>
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:block absolute -top-3 -right-3 sm:-top-5 sm:-right-6 p-3 sm:p-4 rounded-xl bg-[#111827]/95 backdrop-blur-sm border border-[#1e293b] shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">AI Score</p>
                        <p className="text-lg font-black text-purple-400">82/100</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating testimonial */}
                <div className="mt-6 mx-auto max-w-md p-4 rounded-2xl bg-[#111827]/70 backdrop-blur-md border border-[#1e293b] shadow-lg">
                  <div className="flex items-center gap-1 mb-1.5">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                  <p className="text-sm italic text-slate-300 leading-relaxed">&ldquo;MarketPhase a transform&eacute; mon trading. Je vois enfin mes erreurs.&rdquo;</p>
                  <p className="mt-1.5 text-xs font-medium text-slate-500">&mdash; Thomas R., Forex Trader</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SLIDE 2: FEATURE TABS ==================== */}
        <div
          ref={setSlideRef(1)}
          className={slideClass}
          style={isMobile ? {} : { scrollSnapAlign: "start" }}
        >
          <div className={`${animBase} ${isVisible(1) ? animIn : animOut} max-w-7xl mx-auto w-full`}>
            <LandingFeatureTabs locale={locale} />
          </div>
        </div>

        {/* ==================== SLIDE 3: STATS ==================== */}
        <div
          ref={setSlideRef(2)}
          className={slideClass}
          style={isMobile ? {} : { scrollSnapAlign: "start" }}
        >
          <div className={`${animBase} ${isVisible(2) ? animIn : animOut} max-w-5xl mx-auto w-full`}>
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
                {t("landing_heroTitle1")}{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">{t("landing_heroTitle2")}</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-8 text-center">
              {[
                { value: "35+", label: t("landing_statTools"), sub: t("landing_statToolsSub") },
                { value: "0\u20AC", label: t("landing_statFree"), sub: t("landing_statFreeSub") },
                { value: "15+", label: "Pays", sub: "Traders du monde entier" },
                { value: "24/7", label: t("landing_statMarket"), sub: t("landing_statMarketSub") },
              ].map((s) => (
                <div key={s.label} className="p-4 sm:p-8 rounded-2xl bg-[#111827] border border-[#1e293b] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
                  <span className="text-3xl sm:text-5xl lg:text-6xl font-black bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">{s.value}</span>
                  <p className="text-sm sm:text-base font-semibold text-white mt-3">{s.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== SLIDE 4: JOURNAL (Section 1) ==================== */}
        <div
          ref={setSlideRef(3)}
          className={slideClass}
          style={isMobile ? {} : { scrollSnapAlign: "start" }}
        >
          <div className={`${animBase} ${isVisible(3) ? animIn : animOut} max-w-7xl mx-auto w-full`}>
            <div className="relative">
              <span className="absolute -top-4 left-0 text-[120px] sm:text-[160px] font-black text-white/[0.03] leading-none select-none pointer-events-none -z-10">1</span>
              <div className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                <div className="flex-1">
                  <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">{t("landing_sec1Tag")}</p>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-4 text-white">
                    {t("landing_sec1Title1")}<br className="hidden sm:block" />
                    <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{t("landing_sec1Title2")}</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-8 leading-relaxed">{t("landing_sec1Desc")}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: BookOpen, title: t("landing_sec1Card1Title"), desc: t("landing_sec1Card1Desc") },
                      { icon: BarChart3, title: t("landing_sec1Card2Title"), desc: t("landing_sec1Card2Desc") },
                      { icon: CalendarDays, title: t("landing_sec1Card3Title"), desc: t("landing_sec1Card3Desc") },
                    ].map(c => (
                      <div key={c.title} className="p-4 rounded-xl bg-[#111827] border border-[#1e293b]">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                          <c.icon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1">{c.title}</h4>
                        <p className="text-xs text-slate-500">{c.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <div className="relative rounded-xl overflow-hidden border border-[#1e293b] shadow-2xl shadow-black/50 bg-[#111827]">
                    <img src="/screenshots/dashboard.gif" alt="Journal de trading saisie et suivi des trades" className="w-full h-auto" loading="lazy" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SLIDE 5: ANALYTICS (Section 2) ==================== */}
        <div
          ref={setSlideRef(4)}
          className={slideClass}
          style={isMobile ? {} : { scrollSnapAlign: "start" }}
        >
          <div className={`${animBase} ${isVisible(4) ? animIn : animOut} max-w-7xl mx-auto w-full`}>
            <div className="relative">
              <span className="absolute -top-4 right-0 text-[120px] sm:text-[160px] font-black text-white/[0.03] leading-none select-none pointer-events-none -z-10">2</span>
              <div className="relative flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-16">
                <div className="flex-1">
                  <p className="text-purple-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">{t("landing_sec2Tag")}</p>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-4 text-white">
                    {t("landing_sec2Title1")}<br className="hidden sm:block" />
                    <span className="bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">{t("landing_sec2Title2")}</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-8 leading-relaxed">{t("landing_sec2Desc")}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: Activity, title: t("landing_sec2Card1Title"), desc: t("landing_sec2Card1Desc") },
                      { icon: Layers, title: t("landing_sec2Card2Title"), desc: t("landing_sec2Card2Desc") },
                      { icon: Target, title: t("landing_sec2Card3Title"), desc: t("landing_sec2Card3Desc") },
                    ].map(c => (
                      <div key={c.title} className="p-4 rounded-xl bg-[#111827] border border-[#1e293b]">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                          <c.icon className="w-4 h-4 text-purple-400" />
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1">{c.title}</h4>
                        <p className="text-xs text-slate-500">{c.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <div className="relative rounded-xl overflow-hidden border border-[#1e293b] shadow-2xl shadow-black/50 bg-[#111827]">
                    <img src="/screenshots/analytics.gif" alt="Analyse trading et statistiques avancees MarketPhase" className="w-full h-auto" loading="lazy" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SLIDE 6: AI COACH (Section 3) ==================== */}
        <div
          ref={setSlideRef(5)}
          className={slideClass}
          style={isMobile ? {} : { scrollSnapAlign: "start" }}
        >
          <div className={`${animBase} ${isVisible(5) ? animIn : animOut} max-w-7xl mx-auto w-full`}>
            <div className="relative">
              <span className="absolute -top-4 left-0 text-[120px] sm:text-[160px] font-black text-white/[0.03] leading-none select-none pointer-events-none -z-10">3</span>
              <div className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                <div className="flex-1">
                  <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3">{t("landing_sec3Tag")}</p>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-4 text-white">
                    {t("landing_sec3Title1")}<br className="hidden sm:block" />
                    <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{t("landing_sec3Title2")}</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-8 leading-relaxed">{t("landing_sec3Desc")}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: Brain, title: t("landing_sec3Card1Title"), desc: t("landing_sec3Card1Desc") },
                      { icon: Crosshair, title: t("landing_sec3Card2Title"), desc: t("landing_sec3Card2Desc") },
                      { icon: Sparkles, title: t("landing_sec3Card3Title"), desc: t("landing_sec3Card3Desc") },
                    ].map(c => (
                      <div key={c.title} className="p-4 rounded-xl bg-[#111827] border border-[#1e293b]">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                          <c.icon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1">{c.title}</h4>
                        <p className="text-xs text-slate-500">{c.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <div className="relative rounded-xl overflow-hidden border border-[#1e293b] shadow-2xl shadow-black/50 bg-[#111827]">
                    <img src="/screenshots/ai-coach.gif" alt="Coach IA pour ameliorer votre trading" className="w-full h-auto" loading="lazy" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SLIDE 7: ALL FEATURES GRID ==================== */}
        <div
          ref={setSlideRef(6)}
          className={slideClass}
          style={isMobile ? {} : { scrollSnapAlign: "start" }}
        >
          <div className={`${animBase} ${isVisible(6) ? animIn : animOut} max-w-7xl mx-auto w-full`}>
            <div className="text-center mb-8 sm:mb-12">
              <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3">{t("landing_featuresTag")}</p>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white">{t("landing_featuresTitle")}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                { icon: Activity, title: t("landing_feat10"), desc: t("landing_feat10Desc") },
                { icon: Shield, title: t("landing_feat11"), desc: t("landing_feat11Desc") },
                { icon: Trophy, title: t("landing_feat12"), desc: t("landing_feat12Desc") },
                { icon: Target, title: t("landing_feat13"), desc: t("landing_feat13Desc") },
                { icon: Award, title: t("landing_feat14"), desc: t("landing_feat14Desc") },
                { icon: LayoutDashboard, title: t("landing_feat15"), desc: t("landing_feat15Desc") },
              ].map((f) => (
                <div key={f.title} className="group flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-[#111827] border border-[#1e293b] hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5 transition-all">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition">
                    <f.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm mb-0.5">{f.title}</h4>
                    <p className="text-xs text-slate-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== SLIDE 8: COMPARISON TABLE ==================== */}
        <div
          ref={setSlideRef(7)}
          className={slideClass}
          style={isMobile ? {} : { scrollSnapAlign: "start" }}
        >
          <div className={`${animBase} ${isVisible(7) ? animIn : animOut} max-w-5xl mx-auto w-full`}>
            <div className="text-center mb-8 sm:mb-12">
              <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3">{t("landing_compareTag")}</p>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white">
                {t("landing_compareTitle1")}<br /><span className="text-slate-500">{t("landing_compareTitle2")}</span>
              </h2>
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#1e293b] bg-[#111827] shadow-lg overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#1e293b] bg-[#0d1117]">
                    <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-slate-500 font-medium w-1/4"></th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2">
                        <Image src="/logo-icon.png" alt="MarketPhase journal de trading" width={24} height={24} sizes="24px" className="w-5 h-5 sm:w-6 sm:h-6 rounded-md" />
                        <span className="font-bold text-white text-xs sm:text-sm">MarketPhase</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-slate-500 font-medium">TradeZella</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-slate-500 font-medium">Tradervue</th>
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
                  ].map((r) => (
                    <tr key={r.f} className="border-b border-[#1e293b]/50 last:border-0">
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-slate-300 font-medium text-xs sm:text-sm">{r.f}</td>
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-center">
                        {typeof r.mp === "string" ? <span className="font-bold text-emerald-400 text-xs sm:text-sm">{r.mp}</span> : r.mp ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 mx-auto" />}
                      </td>
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-center">
                        {typeof r.tz === "string" ? <span className="text-rose-400 font-medium text-xs sm:text-sm">{r.tz}</span> : r.tz ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 mx-auto" /> : <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 mx-auto" />}
                      </td>
                      <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-center">
                        {typeof r.tv === "string" ? <span className="text-rose-400 font-medium text-xs sm:text-sm">{r.tv}</span> : r.tv ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 mx-auto" /> : <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ==================== SLIDE 9: TESTIMONIALS + SOCIAL PROOF ==================== */}
        <div
          ref={setSlideRef(8)}
          className={isMobile ? "w-full px-4 py-24" : "min-w-[100vw] w-screen h-screen flex-shrink-0 overflow-y-auto"}
          style={isMobile ? {} : { scrollSnapAlign: "start" }}
        >
          <div className={`${animBase} ${isVisible(8) ? animIn : animOut} max-w-5xl mx-auto w-full text-center ${isMobile ? "" : "pt-16 pb-8"}`}>
            <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3">{t("landing_testimonialTag")}</p>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
              {t("landing_testimonialTitle1")}{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">{t("landing_testimonialTitle2")}</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto mb-12">{t("landing_testimonialSub")}</p>

            {/* Testimonial Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto mb-14 px-2">
              {[
                { name: t("landing_testimonial1Name"), role: t("landing_testimonial1Role"), style: t("landing_testimonial1Style"), text: t("landing_testimonial1Text"), grad: "from-emerald-500 to-teal-400" },
                { name: t("landing_testimonial2Name"), role: t("landing_testimonial2Role"), style: t("landing_testimonial2Style"), text: t("landing_testimonial2Text"), grad: "from-purple-500 to-violet-400" },
                { name: t("landing_testimonial3Name"), role: t("landing_testimonial3Role"), style: t("landing_testimonial3Style"), text: t("landing_testimonial3Text"), grad: "from-emerald-400 to-cyan-400" },
              ].map((tm) => (
                <div key={tm.name} className="relative p-5 sm:p-6 rounded-2xl bg-[#111827] border border-[#1e293b] text-left hover:border-emerald-500/20 hover:-translate-y-1 transition-all duration-300">
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
                      <p className="text-xs text-slate-500">{tm.role} &middot; {tm.style}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Counter */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto">
              {[
                { num: 15, prefix: "", suffix: "+", decimals: 0, label: "Pays" },
                { num: 35, prefix: "", suffix: "+", decimals: 0, label: t("landing_socialStat2Label") },
                { num: 2, prefix: "", suffix: "M+", decimals: 0, label: t("landing_socialStat3Label") },
                { num: 4.9, prefix: "", suffix: "/5", decimals: 1, label: t("landing_socialStat4Label") },
              ].map((stat) => (
                <CounterCard key={stat.label} stat={stat} visible={isVisible(8)} />
              ))}
            </div>
          </div>
        </div>

        {/* ==================== SLIDE 10: PRICING + FINAL CTA + FOOTER ==================== */}
        <div
          ref={setSlideRef(9)}
          className={isMobile ? "w-full px-4 py-24" : "min-w-[100vw] w-screen h-screen flex-shrink-0 overflow-y-auto"}
          style={isMobile ? {} : { scrollSnapAlign: "start" }}
        >
          <div className={`${animBase} ${isVisible(9) ? animIn : animOut} ${isMobile ? "" : "pt-20 pb-8"}`}>
            {/* Pricing */}
            <div className="max-w-5xl mx-auto text-center px-4 mb-20">
              <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3">{t("landing_pricingTag")}</p>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-4 text-white">{t("landing_pricingTitle")}</h2>
              <p className="text-slate-400 text-sm sm:text-lg mb-8 sm:mb-12">{t("landing_pricingSub")}</p>

              {/* Two-card comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-20">
                {/* Free card */}
                <div className="relative rounded-3xl p-6 sm:p-8 bg-[#111827] border border-[#1e293b] shadow-lg">
                  <div className="text-4xl sm:text-5xl font-black text-white mb-1">0&#8364;</div>
                  <p className="text-slate-400 mb-1 text-sm sm:text-base font-semibold">Free</p>
                  <p className="text-slate-500 mb-6 text-xs">{t("landing_pricingPerMonth")}</p>
                  <div className="w-full h-px bg-[#1e293b] mb-5" />
                  <p className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t("landing_pricingFreeLabel")}</p>
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
                  <Link href="/register" className="group w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-white px-6 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
                    {t("landing_pricingCta")}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <p className="mt-3 text-xs text-slate-500 flex items-center justify-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-600" />
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
                  <p className="text-slate-500 mb-6 text-xs">{t("landing_pricingVipPer")}</p>
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
                    <p className="pb-4 text-xs sm:text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>

            {/* Final CTA */}
            <div className="max-w-4xl mx-auto px-4 text-center mb-20 relative">
              {/* Glow effect behind CTA */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-radial from-emerald-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
              <h2 className="relative text-2xl sm:text-4xl lg:text-5xl font-black mb-4 sm:mb-6 text-white">
                {t("landing_finalTitle1")}
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                  {t("landing_finalTitle2")}
                </span>
              </h2>
              <p className="relative text-sm sm:text-lg text-slate-400 mb-8 max-w-xl mx-auto">
                {t("landing_finalSub")}
              </p>
              <Link href="/register" title="Demarrer le journal de trading gratuit" className="relative group w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base sm:text-lg font-bold text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full bg-emerald-500 hover:bg-emerald-400 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-1">
                {t("landing_finalCta")}
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="relative mt-4 text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Utilis&eacute; par des traders dans <strong className="text-slate-300">15+ pays</strong></span>
              </p>
              <p className="relative mt-1.5 text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-600" />
                0&euro;/mois &middot; Pas de carte bancaire
              </p>
            </div>

            {/* Footer */}
            <footer className="border-t border-[#1e293b] py-8 bg-[#0a0f1a]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Image src="/logo-icon.png" alt="MarketPhase journal de trading" width={28} height={28} sizes="28px" className="w-7 h-7 rounded-lg" />
                      <span className="font-bold text-white">MarketPhase</span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-xs">{t("landing_footerDesc")}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t("landing_footerProduct")}</h5>
                      <ul className="space-y-2">
                        {[
                          { l: t("landing_navFeatures"), slide: 6 },
                          { l: t("landing_navPreview"), slide: 3 },
                          { l: t("landing_navPricing"), slide: 9 },
                          { l: t("landing_navCompare"), slide: 7 },
                        ].map((i, idx) => (
                          <li key={idx}><button onClick={() => goToSlide(i.slide)} className="text-xs text-slate-500 hover:text-white transition">{i.l}</button></li>
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
                          <li key={i.l}><Link href={i.h} className="text-xs text-slate-500 hover:text-white transition">{i.l}</Link></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-4">
                    <div className="flex items-center gap-3">
                      <a href="https://twitter.com/marketphase" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-[#111827] border border-[#1e293b] flex items-center justify-center hover:bg-[#1e293b] transition">
                        <Globe className="w-4 h-4 text-slate-400" />
                      </a>
                    </div>
                    <p className="text-xs text-slate-600">{t("landing_footerCopyright")}</p>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>

      </main>
      {/* ==================== SLIDE COUNTER (bottom center, desktop) ==================== */}
      {!isMobile && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-[#111827]/80 backdrop-blur border border-[#1e293b] shadow-lg">
          <span className="text-xs font-bold text-emerald-400">{String(activeSlide + 1).padStart(2, "0")}</span>
          <div className="w-20 h-1 rounded-full bg-[#1e293b] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${((activeSlide + 1) / TOTAL_SLIDES) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{String(TOTAL_SLIDES).padStart(2, "0")}</span>
        </div>
      )}
    </div>
  );
}
