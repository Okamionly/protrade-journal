"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import {
  Crown,
  Lock,
  Globe,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
  TrendingUp,
  Clock,
  Eye,
  Bookmark,
  Star,
} from "lucide-react";

/* ─── Types ─── */
interface VipPost {
  id: string;
  title: string;
  type: string;
  content?: string;
  scriptCode?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  author?: { name: string | null; email: string };
}

/* ─── Helpers ─── */
const typeLabel = (type: string) => {
  switch (type) {
    case "macro": return "Macro";
    case "options": return "Options";
    case "futures": return "Futures";
    default: return type;
  }
};

const typeBadgeColor = (type: string) => {
  switch (type) {
    case "macro": return { bg: "rgba(59,130,246,0.15)", color: "rgb(59,130,246)" };
    case "options": return { bg: "rgba(234,88,12,0.15)", color: "rgb(234,88,12)" };
    case "futures": return { bg: "rgba(168,85,247,0.15)", color: "rgb(168,85,247)" };
    default: return { bg: "rgba(156,163,175,0.15)", color: "rgb(156,163,175)" };
  }
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

const formatShortDate = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const getRelativeDate = (date: string): string => {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return "Il y a moins d'1h";
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return "Hier";
  if (diffD < 7) return `Il y a ${diffD} jours`;
  return formatDate(date);
};

/* ─── Simple markdown-to-HTML renderer ─── */
function renderMarkdown(md: string): string {
  let html = md;
  html = html.replace(/^#+\s*CAPTURE\s*\d+[^\n]*\n?/gim, "");
  html = html.replace(/^>\s*📝\s*Rapport généré automatiquement[^\n]*$/gm, "");
  html = html.replace(/^>\s*Données\s*:.*$/gm, "");
  html = html.replace(/^>\s*Prochain rapport\s*:.*$/gm, "");
  html = html.replace(/📝\s*Rapport généré automatiquement[^\n]*/g, "");
  html = html.replace(/Données\s*:\s*QuantData[^\n]*/g, "");
  html = html.replace(/Prochain rapport\s*:[^\n]*/g, "");

  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(
    /```[\w]*\n([\s\S]*?)```/g,
    '<pre class="vip-code-block"><code>$1</code></pre>'
  );

  html = html.replace(
    /((?:^|\n)\|.+\|(?:\n\|.+\|)+)/g,
    (_match, tableBlock: string) => {
      const lines = tableBlock.trim().split("\n");
      if (lines.length < 2) return tableBlock;
      let tableHtml = '<div class="vip-table-wrapper"><table class="vip-table">';
      let isHeader = true;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (/^\|[\s\-:|]+\|$/.test(line)) { isHeader = false; continue; }
        const cells = line.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map((c) => c.trim());
        if (isHeader) {
          tableHtml += "<thead><tr>";
          cells.forEach((cell) => { tableHtml += `<th>${cell}</th>`; });
          tableHtml += "</tr></thead><tbody>";
          isHeader = false;
        } else {
          tableHtml += "<tr>";
          cells.forEach((cell) => { tableHtml += `<td>${cell}</td>`; });
          tableHtml += "</tr>";
        }
      }
      tableHtml += "</tbody></table></div>";
      return tableHtml;
    }
  );

  html = html.replace(/^---+$/gm, '<hr class="vip-hr" />');
  html = html.replace(/^### (.+)$/gm, '<h3 class="vip-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="vip-h2">$1</h2>');
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  html = html.replace(
    /((?:^|\n)- .+(?:\n- .+)*)/g,
    (_match, listBlock: string) => {
      const items = listBlock.trim().split("\n").map((l) => l.replace(/^- /, "").trim()).filter(Boolean);
      return '<ul class="vip-ul">' + items.map((item) => `<li>${item}</li>`).join("") + "</ul>";
    }
  );

  html = html.replace(
    /((?:^|\n)\d+\. .+(?:\n\d+\. .+)*)/g,
    (_match, listBlock: string) => {
      const items = listBlock.trim().split("\n").map((l) => l.replace(/^\d+\. /, "").trim()).filter(Boolean);
      return '<ol class="vip-ol">' + items.map((item) => `<li>${item}</li>`).join("") + "</ol>";
    }
  );

  html = html.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (
      trimmed.startsWith("<h") || trimmed.startsWith("<ul") || trimmed.startsWith("<ol") ||
      trimmed.startsWith("<li") || trimmed.startsWith("<pre") || trimmed.startsWith("<div") ||
      trimmed.startsWith("<table") || trimmed.startsWith("<thead") || trimmed.startsWith("<tbody") ||
      trimmed.startsWith("<tr") || trimmed.startsWith("<th") || trimmed.startsWith("<td") ||
      trimmed.startsWith("</") || trimmed.startsWith("<hr")
    ) return trimmed;
    return `<p class="vip-p">${trimmed}</p>`;
  }).join("\n");

  return html;
}

/* ─── Markdown content styles ─── */
const markdownStyles = `
.vip-md .vip-h2 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 1.5rem 0 0.75rem; }
.vip-md .vip-h3 { font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin: 1.25rem 0 0.5rem; }
.vip-md .vip-p { font-size: 0.875rem; line-height: 1.7; color: var(--text-primary); margin: 0.35rem 0; }
.vip-md strong { color: var(--text-primary); font-weight: 600; }
.vip-md em { color: var(--text-secondary); }
.vip-md .vip-ul, .vip-md .vip-ol { margin: 0.75rem 0; padding-left: 1.5rem; }
.vip-md .vip-ul li, .vip-md .vip-ol li { font-size: 0.875rem; line-height: 1.7; color: var(--text-primary); margin: 0.25rem 0; }
.vip-md .vip-ul { list-style: disc; }
.vip-md .vip-ol { list-style: decimal; }
.vip-md .vip-hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
.vip-md .vip-code-block { background: #1e1e2e; border: 1px solid var(--border); border-radius: 0.75rem; padding: 1rem; overflow-x: auto; max-height: 400px; margin: 0.75rem 0; }
.vip-md .vip-code-block code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.75rem; color: #a6e3a1; white-space: pre; }
.vip-md .vip-table-wrapper { overflow-x: auto; margin: 1rem 0; border-radius: 0.75rem; border: 1px solid var(--border); }
.vip-md .vip-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
.vip-md .vip-table thead { position: sticky; top: 0; z-index: 2; }
.vip-md .vip-table th { background: var(--bg-hover); color: var(--text-primary); font-weight: 600; text-align: left; padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
.vip-md .vip-table td { padding: 0.5rem 0.75rem; color: var(--text-primary); border-bottom: 1px solid var(--border); }
.vip-md .vip-table tbody tr:nth-child(even) { background: var(--bg-hover); }
.vip-md .vip-table tbody tr:hover { background: var(--bg-hover); }
`;

/* ─── Featured Analysis (Hero) ─── */
function FeaturedAnalysis({ post, isVip }: { post: VipPost; isVip: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const [fullContent, setFullContent] = useState<string | null>(post.content || null);
  const [contentLoading, setContentLoading] = useState(false);
  const badge = typeBadgeColor(post.type);

  const handleExpand = useCallback(async () => {
    if (!isVip) return;
    if (expanded) { setExpanded(false); return; }
    if (!fullContent) {
      setContentLoading(true);
      try {
        const res = await fetch(`/api/vip/posts/${post.id}`);
        if (res.ok) { const data: VipPost = await res.json(); setFullContent(data.content || null); }
      } catch { /* silently fail */ } finally { setContentLoading(false); }
    }
    setExpanded(true);
  }, [isVip, expanded, fullContent, post.id]);

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(59,130,246,0.3)", background: "var(--bg-card)" }}>
      {/* "AFFICHER MAINTENANT" ribbon */}
      <div className="flex items-center justify-between px-6 py-3" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.08) 100%)", borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </span>
          <span className="text-xs font-bold tracking-wider uppercase text-blue-400">Analyse en cours</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{getRelativeDate(post.createdAt)}</span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase" style={{ background: badge.bg, color: badge.color }}>
                {typeLabel(post.type)}
              </span>
              <span className="text-xs mono" style={{ color: "var(--text-muted)" }}>{formatDate(post.createdAt)} à {formatTime(post.createdAt)}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{post.title}</h2>
            {post.author?.name && (
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Par {post.author.name}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, rgb(59,130,246), rgb(37,99,235))", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}>
            <Star className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Content */}
        {isVip ? (
          <>
            {fullContent && (
              <div className="vip-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(expanded ? fullContent : fullContent.split("\n").slice(0, 15).join("\n")) }} />
            )}
            {fullContent && fullContent.split("\n").length > 15 && (
              <button
                onClick={handleExpand}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
                style={{ background: "rgba(59,130,246,0.1)", color: "rgb(59,130,246)", border: "1px solid rgba(59,130,246,0.2)" }}
              >
                {contentLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Chargement...</>
                ) : expanded ? (
                  <><ChevronUp className="w-4 h-4" /> Réduire</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Lire l&apos;analyse complète</>
                )}
              </button>
            )}
            {post.imageUrl && (
              <div className="rounded-xl overflow-hidden mt-4">
                <img src={post.imageUrl} alt={post.title} className="w-full object-cover rounded-xl" style={{ maxHeight: 400 }} />
              </div>
            )}
          </>
        ) : (
          <NonVipOverlay content={post.content} />
        )}
      </div>
    </div>
  );
}

/* ─── Archive Card (compact) ─── */
function ArchiveCard({ post, isVip, isFirst }: { post: VipPost; isVip: boolean; isFirst?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [fullContent, setFullContent] = useState<string | null>(post.content || null);
  const [contentLoading, setContentLoading] = useState(false);
  const badge = typeBadgeColor(post.type);

  const handleExpand = useCallback(async () => {
    if (!isVip) return;
    if (expanded) { setExpanded(false); return; }
    if (!fullContent) {
      setContentLoading(true);
      try {
        const res = await fetch(`/api/vip/posts/${post.id}`);
        if (res.ok) { const data: VipPost = await res.json(); setFullContent(data.content || null); }
      } catch { /* silently fail */ } finally { setContentLoading(false); }
    }
    setExpanded(true);
  }, [isVip, expanded, fullContent, post.id]);

  return (
    <div className="flex gap-4">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: isFirst ? "rgb(59,130,246)" : "var(--text-muted)", boxShadow: isFirst ? "0 0 8px rgba(59,130,246,0.4)" : "none" }} />
        <div className="w-0.5 flex-1 min-h-[20px]" style={{ background: "var(--border)" }} />
      </div>

      {/* Card */}
      <div
        className="flex-1 rounded-2xl overflow-hidden transition-all mb-4 hover:border-blue-500/30"
        style={{ border: expanded ? "1px solid rgba(59,130,246,0.3)" : "1px solid var(--border)", background: "var(--bg-card)" }}
      >
        {/* Header — clickable */}
        <button
          onClick={handleExpand}
          className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-[var(--bg-hover)] transition"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: badge.bg, color: badge.color }}>
                {typeLabel(post.type)}
              </span>
              <span className="text-xs mono" style={{ color: "var(--text-muted)" }}>{formatDate(post.createdAt)}</span>
            </div>
            <h3 className="text-sm sm:text-base font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {post.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isVip && <Lock className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
            {expanded ? (
              <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            )}
          </div>
        </button>

        {/* Expandable content */}
        {expanded && (
          <div className="px-5 pb-5" style={{ borderTop: "1px solid var(--border)" }}>
            {contentLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            )}
            {isVip && fullContent && !contentLoading && (
              <div className="vip-md mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(fullContent) }} />
            )}
            {isVip && post.imageUrl && (
              <div className="rounded-xl overflow-hidden mt-4">
                <img src={post.imageUrl} alt={post.title} className="w-full object-cover rounded-xl" style={{ maxHeight: 400 }} />
              </div>
            )}
            {!isVip && <NonVipOverlay content={post.content} />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Non-VIP overlay ─── */
function NonVipOverlay({ content }: { content?: string }) {
  return (
    <div className="relative">
      {content && (
        <div className="vip-md" style={{ maxHeight: 100, overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(content.split("\n").slice(0, 5).join("\n")) }} />
      )}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 80, background: "linear-gradient(to top, var(--bg-card) 0%, transparent 100%)" }} />
      <div className="flex flex-col items-center justify-center gap-2 py-6 mt-2" style={{ borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.1)" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--bg-hover)" }}>
          <Lock className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Contenu réservé aux membres VIP</span>
        <Link
          href="/vip"
          className="mt-1 px-4 py-2 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))", boxShadow: "0 4px 16px rgba(245,158,11,0.3)" }}
        >
          <Crown className="w-3.5 h-3.5 inline mr-1.5" />
          Devenir VIP
        </Link>
      </div>
    </div>
  );
}

/* ─── Group posts by month/year ─── */
function groupByMonth(posts: VipPost[]): { label: string; posts: VipPost[] }[] {
  const map = new Map<string, VipPost[]>();
  for (const p of posts) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, posts]) => ({
      label: new Date(posts[0].createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      posts,
    }));
}

/* ─── Suspense wrapper ─── */
export default function AnalysesPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-muted)" }} /></div>}>
      <AnalysesPage />
    </Suspense>
  );
}

/* ─── Main page ─── */
function AnalysesPage() {
  const [isVip, setIsVip] = useState(false);
  const [posts, setPosts] = useState<VipPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role && (data.role === "ADMIN" || data.role === "VIP")) setIsVip(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/vip/posts")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const analyses = (data as VipPost[]).filter((p) => p.type !== "indicator");
        // Sort by date descending
        analyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPosts(analyses);
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, []);

  const filteredPosts = typeFilter === "all" ? posts : posts.filter((p) => p.type === typeFilter);
  const latestPost = filteredPosts[0] || null;
  const archivePosts = filteredPosts.slice(1);
  const groupedArchive = groupByMonth(archivePosts);

  // Stats
  const totalAnalyses = posts.length;
  const typeCount = (type: string) => posts.filter((p) => p.type === type).length;

  return (
    <div className="min-h-screen pb-20 max-w-[1200px] mx-auto">
      <style dangerouslySetInnerHTML={{ __html: markdownStyles }} />

      {/* ═══ Header ═══ */}
      <div className="px-4 pt-6 sm:px-6">
        <Link href="/vip" className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 transition hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
          <ChevronLeft className="w-3.5 h-3.5" /> Retour VIP
        </Link>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, rgb(59,130,246), rgb(37,99,235))", boxShadow: "0 8px 32px rgba(59,130,246,0.3)" }}>
              <Globe className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                Analyses Macro
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Agenda des analyses — {totalAnalyses} publication{totalAnalyses > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Stats pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Macro", count: typeCount("macro"), color: "rgb(59,130,246)" },
              { label: "Options", count: typeCount("options"), color: "rgb(234,88,12)" },
              { label: "Futures", count: typeCount("futures"), color: "rgb(168,85,247)" },
            ].filter((s) => s.count > 0).map((s) => (
              <span key={s.label} className="px-3 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5" style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
                {s.count} {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-2 mt-5">
          {[
            { key: "all", label: "Toutes", icon: Eye },
            { key: "macro", label: "Macro", icon: Globe },
            { key: "options", label: "Options", icon: TrendingUp },
            { key: "futures", label: "Futures", icon: Bookmark },
          ].map((tab) => {
            const isActive = typeFilter === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setTypeFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition ${isActive ? "bg-blue-500/15 text-blue-400" : "hover:bg-[var(--bg-hover)]"}`}
                style={!isActive ? { color: "var(--text-secondary)", border: "1px solid var(--border)" } : { border: "1px solid rgba(59,130,246,0.3)" }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {postsLoading && (
        <div className="space-y-6 px-4 sm:px-6 mt-8">
          {/* Skeleton hero */}
          <div className="rounded-2xl p-6 animate-pulse" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
            <div className="h-4 rounded w-32 mb-4" style={{ background: "var(--bg-hover)" }} />
            <div className="h-8 rounded w-3/4 mb-3" style={{ background: "var(--bg-hover)" }} />
            <div className="h-4 rounded w-1/2 mb-6" style={{ background: "var(--bg-hover)" }} />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-3 rounded" style={{ background: "var(--bg-hover)", width: `${90 - i * 10}%` }} />)}
            </div>
          </div>
          {/* Skeleton archive */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
              <div className="h-4 rounded w-48 mb-2" style={{ background: "var(--bg-hover)" }} />
              <div className="h-3 rounded w-32" style={{ background: "var(--bg-hover)" }} />
            </div>
          ))}
        </div>
      )}

      {!postsLoading && (
        <div className="px-4 sm:px-6 mt-8 space-y-8">
          {/* Empty state */}
          {filteredPosts.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
              <Globe className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(59,130,246,0.3)" }} />
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Aucune analyse pour le moment. Revenez bientôt !
              </p>
            </div>
          )}

          {/* ═══ Featured: Latest Analysis ═══ */}
          {latestPost && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Dernière analyse</span>
              </div>
              <FeaturedAnalysis post={latestPost} isVip={isVip} />
            </div>
          )}

          {/* ═══ Archive: Timeline ═══ */}
          {archivePosts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Archives — {archivePosts.length} analyse{archivePosts.length > 1 ? "s" : ""} précédente{archivePosts.length > 1 ? "s" : ""}
                </span>
              </div>

              {groupedArchive.map((group) => (
                <div key={group.label} className="mb-6">
                  {/* Month label */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg" style={{ color: "var(--text-secondary)", background: "var(--bg-hover)" }}>
                      {group.label}
                    </span>
                    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  </div>

                  {/* Timeline posts */}
                  {group.posts.map((post, i) => (
                    <ArchiveCard key={post.id} post={post} isVip={isVip} isFirst={i === 0} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
