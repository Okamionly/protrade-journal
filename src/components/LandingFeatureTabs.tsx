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

const tabs = [
  { icon: BarChart3, label: "Analytics", img: "analytics" },
  { icon: BookOpen, label: "Journal", img: "dashboard" },
  { icon: Brain, label: "AI Coach", img: "ai-coach" },
  { icon: Monitor, label: "War Room", img: "war-room" },
  { icon: LineChart, label: "Backtesting", img: "backtest" },
  { icon: Play, label: "Replay", img: "challenges" },
  { icon: CalendarDays, label: "Calendrier", img: "calendar" },
  { icon: MessageSquare, label: "Chat", img: "chat" },
  { icon: Swords, label: "Challenges", img: "challenges" },
];

export default function LandingFeatureTabs() {
  const [active, setActive] = useState(0);

  return (
    <div>
      {/* Tab icons */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-6 overflow-x-auto pb-4 scrollbar-hide">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
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
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Screenshot showcase */}
      <div className="mt-6 sm:mt-8 relative max-w-6xl mx-auto">
        <div className="absolute -inset-2 bg-gradient-to-r from-blue-100/50 via-cyan-100/50 to-emerald-100/50 rounded-3xl blur-xl" />
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-gray-300/50">
          <Image
            src={`/screenshots/${tabs[active].img}.png`}
            alt={tabs[active].label}
            width={1920}
            height={1080}
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}
