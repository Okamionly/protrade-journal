"use client";

import { useState, useEffect } from "react";
import { RefreshCw, ExternalLink, Clock, AlertTriangle, X } from "lucide-react";

interface NewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "à l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  return `il y a ${Math.floor(seconds / 86400)}j`;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news");
      if (res.ok) {
        const data = await res.json();
        setNews(Array.isArray(data) ? data.slice(0, 50) : []);
      } else {
        setError("Impossible de charger les actualités. Réessayez.");
      }
    } catch {
      setError("Impossible de charger les actualités. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const categories = [...new Set(news.map((n) => n.category))].filter(Boolean).sort();
  const filtered = filter === "all" ? news : news.filter((n) => n.category === filter);

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-medium transition">Réessayer</button>
            <button onClick={() => setError(null)} className="p-1 rounded-lg hover:bg-rose-500/20 transition"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">News Feed</h1>
          <p className="text-sm text-[--text-secondary] dark:text-[--text-secondary] mt-1">Actualités financières en temps réel</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition" title="Rafraichir">
          <RefreshCw className={`w-5 h-5 text-[--text-secondary] ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
            filter === "all"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
              : "text-[--text-secondary] hover:text-[--text-primary] border border-[--border] hover:border-[--text-muted]"
          }`}
        >
          Tous ({news.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
              filter === cat
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                : "text-[--text-secondary] hover:text-[--text-primary] border border-[--border] hover:border-[--text-muted]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse">
              <div className="h-40 bg-[--bg-secondary]/30 rounded-xl mb-3" />
              <div className="h-4 bg-[--bg-secondary]/30 rounded w-3/4 mb-2" />
              <div className="h-3 bg-[--bg-secondary]/30 rounded w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-8 text-center text-rose-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Erreur de chargement des actualités</p>
          <p className="text-sm text-[--text-muted] mt-1">Vérifiez votre connexion et réessayez.</p>
          <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-sm font-medium transition">Réessayer</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-[--text-muted]">Aucune actualité disponible</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all group"
            >
              {item.image && (
                <div className="h-40 overflow-hidden">
                  <img
                    src={item.image}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {item.source}
                  </span>
                  {item.category && (
                    <span className="text-[10px] text-[--text-muted] uppercase">{item.category}</span>
                  )}
                  <span className="text-[10px] text-[--text-muted] ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(item.datetime)}
                  </span>
                </div>
                <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-cyan-400 transition">
                  {item.headline}
                </h3>
                <p className="text-xs text-[--text-secondary] line-clamp-2">{item.summary}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition">
                  <ExternalLink className="w-3 h-3" />
                  Lire l&apos;article
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
