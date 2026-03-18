"use client";

import { useState, useEffect } from "react";

interface NewsItem {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
}

const SOURCE_COLORS: Record<string, string> = {
  Reuters: "#ff8000",
  Bloomberg: "#7b1af7",
  CNBC: "#005594",
  "Yahoo Finance": "#6001d2",
  MarketWatch: "#0a7d00",
  "Investing.com": "#fc4c02",
  "Financial Times": "#fff1e5",
  default: "#6b7280",
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] || SOURCE_COLORS.default;
}

export function NewsTicker() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch("/api/news");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setNews(data.slice(0, 10));
          }
        }
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center overflow-hidden mx-4">
        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
          Chargement des actualités...
        </span>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center overflow-hidden mx-4">
        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
          Aucune actualité disponible
        </span>
      </div>
    );
  }

  const doubled = [...news, ...news];
  const duration = news.length * 6;

  return (
    <div
      className="flex-1 overflow-hidden mx-4 relative"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)",
      }}
    >
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="flex items-center h-full whitespace-nowrap"
        style={{
          animation: `marquee ${duration}s linear infinite`,
          willChange: "transform",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.animationPlayState = "paused";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.animationPlayState = "running";
        }}
      >
        {doubled.map((item, i) => (
          <a
            key={`${item.id}-${i}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer group shrink-0"
            title={`${item.source} — ${item.headline}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: getSourceColor(item.source) }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors max-w-[280px] truncate">
              {item.headline}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
              {timeAgo(item.datetime)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
