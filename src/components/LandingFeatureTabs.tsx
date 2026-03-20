"use client";

import { useState } from "react";
import Image from "next/image";
import {
  BarChart3,
  BookOpen,
  Brain,
  Monitor,
  LineChart,
  Play,
  Swords,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import type { Locale } from "@/i18n/types";

import fr from "@/i18n/locales/fr.json";
import en from "@/i18n/locales/en.json";
import ar from "@/i18n/locales/ar.json";
import es from "@/i18n/locales/es.json";
import de from "@/i18n/locales/de.json";

const dicts: Record<Locale, Record<string, string>> = { fr, en, ar, es, de };

const tabDefs = [
  { icon: BarChart3, labelKey: "landing_tabAnalytics", img: "analytics" },
  { icon: BookOpen, labelKey: "landing_tabJournal", img: "dashboard" },
  { icon: Brain, labelKey: "landing_tabAiCoach", img: "ai-coach" },
  { icon: Monitor, labelKey: "landing_tabWarRoom", img: "war-room" },
  { icon: LineChart, labelKey: "landing_tabBacktest", img: "backtest" },
  { icon: Play, labelKey: "landing_tabReplay", img: "challenges" },
  { icon: CalendarDays, labelKey: "landing_tabCalendar", img: "calendar" },
  { icon: MessageSquare, labelKey: "landing_tabChat", img: "chat" },
  { icon: Swords, labelKey: "landing_tabChallenges", img: "challenges" },
];

interface Props {
  locale?: Locale;
}

export default function LandingFeatureTabs({ locale = "fr" }: Props) {
  const [active, setActive] = useState(0);
  const t = (key: string): string => dicts[locale]?.[key] || dicts.fr[key] || key;

  return (
    <div>
      {/* Tab icons */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-6 overflow-x-auto pb-4 scrollbar-hide">
        {tabDefs.map((tab, i) => (
          <button
            key={tab.labelKey}
            onClick={() => setActive(i)}
            className={`flex flex-col items-center gap-2 px-3 sm:px-4 py-3 rounded-xl cursor-pointer transition-all min-w-[65px] sm:min-w-[75px] ${
              i === active
                ? "bg-blue-50 border border-blue-200 shadow-sm"
                : "hover:bg-gray-50 border border-transparent"
            }`}
          >
            <tab.icon
              className={`w-5 h-5 sm:w-6 sm:h-6 ${
                i === active ? "text-blue-600" : "text-gray-400"
              }`}
            />
            <span
              className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                i === active ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {t(tab.labelKey)}
            </span>
          </button>
        ))}
      </div>

      {/* Screenshot showcase */}
      <div className="mt-6 sm:mt-8 relative max-w-6xl mx-auto">
        <div className="absolute -inset-2 bg-gradient-to-r from-blue-100/50 via-cyan-100/50 to-emerald-100/50 rounded-3xl blur-xl" />
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-gray-300/50">
          <Image
            src={`/screenshots/${tabDefs[active].img}.png`}
            alt={t(tabDefs[active].labelKey)}
            width={1920}
            height={1080}
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}
