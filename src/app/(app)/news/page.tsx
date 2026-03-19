"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, ExternalLink, Clock, AlertTriangle, X, Search, Newspaper } from "lucide-react";

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

function formatLastUpdated(date: Date | null): string {
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  return `il y a ${Math.floor(diffMin / 60)}h`;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setNews(data.slice(0, 50));
          setLastUpdated(new Date());
        } else if (Array.isArray(data) && data.length === 0) {
          setError("Aucune actualité disponible. L'API n'a retourné aucun résultat.");
        } else {
          setError("Format de réponse inattendu de l'API.");
        }
      } else {
        setError("Impossible de charger les actualités. Réessayez.");
      }
    } catch {
      setError("Impossible de charger les actualités. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 5 minutes
  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  // Update the "last updated" text every 30 seconds
  useEffect(() => {
    const tick = () => setLastUpdatedText(formatLastUpdated(lastUpdated));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const categories = [...new Set(news.map((n) => n.category))].filter(Boolean).sort();

  const filtered = news.filter((item) => {
    const matchesFilter = filter === "all" || item.category === filter;
    const matchesSearch =
      !searchQuery ||
      item.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
          <p className="text-sm text-[--text-secondary] dark:text-[--text-secondary] mt-1">
            Actualités financières en temps réel
            {lastUpdatedText && (
              <span className="ml-2 text-[--text-muted]">
                — Dernière mise à jour: {lastUpdatedText}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[--text-muted] hidden sm:inline">Auto-refresh 5min</span>
          <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition" title="Rafraichir">
            <RefreshCw className={`w-5 h-5 text-[--text-secondary] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par mot-clé (titre, résumé, source)..."
          className="input-field pl-10 w-full"
        />
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
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse">
              <div className="h-40 bg-[--bg-secondary]/30 rounded-xl mb-3" />
              <div className="h-4 bg-[--bg-secondary]/30 rounded w-3/4 mb-2" />
              <div className="h-3 bg-[--bg-secondary]/30 rounded w-full mb-1" />
              <div className="h-3 bg-[--bg-secondary]/30 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-[--text-muted]">
          <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune actualité trouvée</p>
          {searchQuery && (
            <p className="text-sm mt-1">Essayez un autre mot-clé ou supprimez le filtre de recherche.</p>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-[--text-muted]">{filtered.length} article{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}</p>
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
        </>
      )}
    </div>
  );
}
