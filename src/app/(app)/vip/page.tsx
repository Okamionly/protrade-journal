"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Crown,
  Lock,
  Zap,
  TrendingUp,
  BarChart3,
  Check,
  CheckCircle,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Code,
  Copy,
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
    case "indicator":
      return "Indicateur";
    case "macro":
      return "Analyse Macro";
    case "options":
      return "Analyse Options";
    case "futures":
      return "Analyse Futures";
    default:
      return type;
  }
};

const typeBadgeColor = (type: string) => {
  switch (type) {
    case "indicator":
      return { bg: "rgba(168,85,247,0.15)", color: "rgb(168,85,247)" };
    case "macro":
      return { bg: "rgba(59,130,246,0.15)", color: "rgb(59,130,246)" };
    case "options":
      return { bg: "rgba(234,88,12,0.15)", color: "rgb(234,88,12)" };
    case "futures":
      return { bg: "rgba(234,88,12,0.15)", color: "rgb(234,88,12)" };
    default:
      return { bg: "rgba(156,163,175,0.15)", color: "rgb(156,163,175)" };
  }
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const formatDateShort = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/* ─── Simple markdown-to-HTML renderer ─── */
function renderMarkdown(md: string): string {
  let html = md;

  // Escape HTML entities first (except for our own tags we'll add)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (``` ... ```)
  html = html.replace(
    /```[\w]*\n([\s\S]*?)```/g,
    '<pre class="vip-code-block"><code>$1</code></pre>'
  );

  // Tables: detect lines starting with |
  html = html.replace(
    /((?:^|\n)\|.+\|(?:\n\|.+\|)+)/g,
    (_match, tableBlock: string) => {
      const lines = tableBlock.trim().split("\n");
      if (lines.length < 2) return tableBlock;

      let tableHtml = '<div class="vip-table-wrapper"><table class="vip-table">';
      let isHeader = true;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip separator lines (|---|---|)
        if (/^\|[\s\-:|]+\|$/.test(line)) {
          isHeader = false;
          continue;
        }

        const cells = line
          .split("|")
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          .map((c) => c.trim());

        if (isHeader) {
          tableHtml += "<thead><tr>";
          cells.forEach((cell) => {
            tableHtml += `<th>${cell}</th>`;
          });
          tableHtml += "</tr></thead><tbody>";
          isHeader = false;
        } else {
          tableHtml += "<tr>";
          cells.forEach((cell) => {
            tableHtml += `<td>${cell}</td>`;
          });
          tableHtml += "</tr>";
        }
      }

      tableHtml += "</tbody></table></div>";
      return tableHtml;
    }
  );

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr class="vip-hr" />');

  // Headers
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="vip-h3">$1</h3>'
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="vip-h2">$1</h2>'
  );

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Unordered lists
  html = html.replace(
    /((?:^|\n)- .+(?:\n- .+)*)/g,
    (_match, listBlock: string) => {
      const items = listBlock
        .trim()
        .split("\n")
        .map((l) => l.replace(/^- /, "").trim())
        .filter(Boolean);
      return (
        '<ul class="vip-ul">' +
        items.map((item) => `<li>${item}</li>`).join("") +
        "</ul>"
      );
    }
  );

  // Numbered lists
  html = html.replace(
    /((?:^|\n)\d+\. .+(?:\n\d+\. .+)*)/g,
    (_match, listBlock: string) => {
      const items = listBlock
        .trim()
        .split("\n")
        .map((l) => l.replace(/^\d+\. /, "").trim())
        .filter(Boolean);
      return (
        '<ol class="vip-ol">' +
        items.map((item) => `<li>${item}</li>`).join("") +
        "</ol>"
      );
    }
  );

  // Paragraphs: wrap remaining non-empty lines that aren't already tags
  html = html
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<div") ||
        trimmed.startsWith("<table") ||
        trimmed.startsWith("<thead") ||
        trimmed.startsWith("<tbody") ||
        trimmed.startsWith("<tr") ||
        trimmed.startsWith("<th") ||
        trimmed.startsWith("<td") ||
        trimmed.startsWith("</") ||
        trimmed.startsWith("<hr")
      ) {
        return trimmed;
      }
      return `<p class="vip-p">${trimmed}</p>`;
    })
    .join("\n");

  return html;
}

/* ─── Locked overlay ─── */
function LockedOverlay() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 rounded-2xl"
      style={{
        backdropFilter: "blur(6px)",
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        <Lock className="w-6 h-6" style={{ color: "rgba(255,255,255,0.6)" }} />
      </div>
      <span
        className="text-xs font-medium"
        style={{ color: "rgba(255,255,255,0.6)" }}
      >
        S&apos;abonner pour acc&eacute;der
      </span>
    </div>
  );
}

/* ─── Features list for pricing ─── */
const features = [
  {
    icon: Code,
    text: "1 \u00e0 2 indicateurs exclusifs par mois (Pine Script, copier-coller)",
  },
  {
    icon: BarChart3,
    text: "Analyses macro compl\u00e8tes (FOMC, DXY, US10Y, G\u00e9opolitique)",
  },
  {
    icon: TrendingUp,
    text: "Analyses Options & Futures (Dark Pool, GEX, Greeks)",
  },
  {
    icon: Calendar,
    text: "Calendrier \u00e9conomique d\u00e9taill\u00e9 avec impact",
  },
  {
    icon: FileText,
    text: "Tableaux de niveaux GPS (supports/r\u00e9sistances)",
  },
  {
    icon: Zap,
    text: "Sc\u00e9narios de trading avec probabilit\u00e9s",
  },
];

/* ─── Markdown content styles (injected once) ─── */
const markdownStyles = `
.vip-md .vip-h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #e5e7eb);
  margin: 1.5rem 0 0.75rem;
}
.vip-md .vip-h3 {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary, #e5e7eb);
  margin: 1.25rem 0 0.5rem;
}
.vip-md .vip-p {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--text-primary, #e5e7eb);
  margin: 0.35rem 0;
}
.vip-md strong {
  color: var(--text-primary, #e5e7eb);
  font-weight: 600;
}
.vip-md em {
  color: var(--text-secondary, #9ca3af);
}
.vip-md .vip-ul,
.vip-md .vip-ol {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}
.vip-md .vip-ul li,
.vip-md .vip-ol li {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--text-primary, #e5e7eb);
  margin: 0.25rem 0;
}
.vip-md .vip-ul {
  list-style: disc;
}
.vip-md .vip-ol {
  list-style: decimal;
}
.vip-md .vip-hr {
  border: none;
  border-top: 1px solid var(--border, rgba(255,255,255,0.08));
  margin: 1.5rem 0;
}
.vip-md .vip-code-block {
  background: #1e1e2e;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.75rem;
  padding: 1rem;
  overflow-x: auto;
  max-height: 400px;
  margin: 0.75rem 0;
}
.vip-md .vip-code-block code {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.75rem;
  color: #a6e3a1;
  white-space: pre;
}
.vip-md .vip-table-wrapper {
  overflow-x: auto;
  margin: 1rem 0;
  border-radius: 0.75rem;
  border: 1px solid rgba(255,255,255,0.08);
}
.vip-md .vip-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}
.vip-md .vip-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}
.vip-md .vip-table th {
  background: rgba(255,255,255,0.06);
  color: var(--text-primary, #e5e7eb);
  font-weight: 600;
  text-align: left;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  white-space: nowrap;
}
.vip-md .vip-table td {
  padding: 0.5rem 0.75rem;
  color: var(--text-primary, #e5e7eb);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.vip-md .vip-table tbody tr:nth-child(even) {
  background: rgba(255,255,255,0.02);
}
.vip-md .vip-table tbody tr:hover {
  background: rgba(255,255,255,0.04);
}
`;

/* ─── Suspense wrapper ─── */
export default function VipPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "var(--text-muted)" }}
          />
        </div>
      }
    >
      <VipPage />
    </Suspense>
  );
}

/* ─── Main page ─── */
function VipPage() {
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [posts, setPosts] = useState<VipPost[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [indicatorExpanded, setIndicatorExpanded] = useState(false);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);
  const [archiveLoading, setArchiveLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccess(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role) {
          setUserRole(data.role);
          if (data.role === "ADMIN" || data.role === "VIP") {
            setIsVip(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/vip/posts")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPosts(data))
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, []);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const handleCopyScript = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may fail in some environments
    }
  }, []);

  const handleArchiveToggle = useCallback(
    async (post: VipPost) => {
      if (!isVip) return;

      if (expandedArchive === post.id) {
        setExpandedArchive(null);
        return;
      }

      // If post already has content loaded, just expand
      if (post.content) {
        setExpandedArchive(post.id);
        return;
      }

      // Fetch full post
      setArchiveLoading(post.id);
      try {
        const res = await fetch(`/api/vip/posts/${post.id}`);
        if (res.ok) {
          const fullPost: VipPost = await res.json();
          setPosts((prev) =>
            prev.map((p) => (p.id === post.id ? fullPost : p))
          );
          setExpandedArchive(post.id);
        }
      } catch {
        // silently fail
      } finally {
        setArchiveLoading(null);
      }
    },
    [isVip, expandedArchive]
  );

  // Derive data
  const latestIndicator = posts.find((p) => p.type === "indicator") || null;
  const latestMacro =
    posts.find(
      (p) =>
        p.type === "macro" || p.type === "futures" || p.type === "options"
    ) || null;
  // Archives: all posts except the featured ones
  const archivePosts = posts.filter(
    (p) => p.id !== latestIndicator?.id && p.id !== latestMacro?.id
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Inject markdown styles */}
      <style dangerouslySetInnerHTML={{ __html: markdownStyles }} />

      {/* Success Banner */}
      {showSuccess && (
        <div
          className="mx-4 mt-4 sm:mx-6 p-4 rounded-xl flex items-center justify-between gap-3"
          style={{
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle
              className="w-5 h-5 flex-shrink-0"
              style={{ color: "rgb(34,197,94)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "rgb(34,197,94)" }}
            >
              Paiement r&eacute;ussi ! Bienvenue dans le club VIP
            </span>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="flex-shrink-0 p-1 rounded-lg transition hover:opacity-70"
            style={{ color: "rgb(34,197,94)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══ Hero Banner ═══ */}
      <div
        className="relative overflow-hidden rounded-2xl mx-4 mt-4 sm:mx-6 sm:mt-6 p-8 sm:p-12"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(168,85,247,0.15), rgba(59,130,246,0.1))",
          border: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)",
            transform: "translate(-20%, 40%)",
          }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
              boxShadow: "0 8px 32px rgba(245,158,11,0.3)",
            }}
          >
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1
              className="text-2xl sm:text-3xl font-bold mb-2"
              style={{ color: "var(--text-primary, #e5e7eb)" }}
            >
              MarketPhase VIP &mdash; Analyses Premium
            </h1>
            <p
              className="text-sm sm:text-base"
              style={{ color: "var(--text-secondary, #9ca3af)" }}
            >
              Recevez chaque mois des indicateurs exclusifs et des analyses macro
              compl&egrave;tes
            </p>
          </div>

          {isVip ? (
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-xl"
              style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              <Crown
                className="w-5 h-5"
                style={{ color: "rgb(245,158,11)" }}
              />
              <div>
                <div
                  className="text-sm font-bold"
                  style={{ color: "rgb(245,158,11)" }}
                >
                  Membre VIP
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: "var(--text-secondary, #9ca3af)" }}
                >
                  Acc&egrave;s actif
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 hover:scale-105 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background:
                  "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
                boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirection vers le paiement...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  S&apos;abonner - 9.99&euro;/mois
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {postsLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "var(--text-muted, #9ca3af)" }}
          />
        </div>
      )}

      {/* ═══ Section 1: Indicateur du Mois ═══ */}
      {!postsLoading && (
        <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(168,85,247,0.15)" }}
            >
              <Code className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />
            </div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary, #e5e7eb)" }}
            >
              Indicateur du Mois
            </h2>
          </div>

          {!latestIndicator ? (
            <div
              className="glass rounded-2xl p-8 text-center"
              style={{
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
              }}
            >
              <Code
                className="w-8 h-8 mx-auto mb-3"
                style={{ color: "rgba(168,85,247,0.3)" }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary, #9ca3af)" }}
              >
                Prochain indicateur bient&ocirc;t...
              </p>
            </div>
          ) : (
            <div
              className="glass relative rounded-2xl overflow-hidden"
              style={{
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
              }}
            >
              {isVip ? (
                <div>
                  {/* ── Illustration Card (always visible) ── */}
                  <div
                    className="relative cursor-pointer overflow-hidden"
                    onClick={() => setIndicatorExpanded(!indicatorExpanded)}
                    style={{ minHeight: 220 }}
                  >
                    {/* SVG Illustration Background */}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0f0a1e 0%, #1a0e2e 40%, #0d1117 100%)" }}>
                      {/* Grid lines */}
                      <svg className="absolute inset-0 w-full h-full opacity-10">
                        {[...Array(20)].map((_, i) => <line key={`h${i}`} x1="0" y1={`${i * 5}%`} x2="100%" y2={`${i * 5}%`} stroke="#8b5cf6" strokeWidth="0.5" />)}
                        {[...Array(30)].map((_, i) => <line key={`v${i}`} x1={`${i * 3.3}%`} y1="0" x2={`${i * 3.3}%`} y2="100%" stroke="#8b5cf6" strokeWidth="0.5" />)}
                      </svg>
                      {/* Oscillator visualization */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 220" preserveAspectRatio="none">
                        {/* Zero line */}
                        <line x1="0" y1="110" x2="800" y2="110" stroke="#4b5563" strokeWidth="1" strokeDasharray="4 4" />
                        {/* Histogram bars */}
                        {[20,35,50,45,30,15,-10,-25,-40,-55,-45,-30,-15,10,25,45,60,70,65,50,35,20,5,-15,-30,-20,-5,15,30,50,65,55,40,25,10,-5,-20,-35,-50,-40,-25,-10,10,25,40,55,45,30].map((v, i) => (
                          <rect key={i} x={i * 17} y={v > 0 ? 110 - v * 1.2 : 110} width="12" height={Math.abs(v) * 1.2} rx="2" fill={v > 0 ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"} />
                        ))}
                        {/* Consensus line */}
                        <polyline
                          points="10,95 27,75 44,55 61,60 78,75 95,90 112,115 129,130 146,145 163,160 180,150 197,135 214,120 231,100 248,85 265,60 282,45 299,35 316,40 333,55 350,70 367,85 384,95 401,115 418,130 435,125 452,110 469,95 486,80 503,55 520,50 537,60 554,75 571,90 588,105 605,110 622,125 639,140 656,155 673,145 690,130 707,115 724,100 741,85 758,60 775,70 792,80"
                          fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        />
                        {/* Signal line */}
                        <polyline
                          points="10,100 27,85 44,68 61,65 78,78 95,92 112,110 129,125 146,138 163,150 180,148 197,135 214,122 231,105 248,90 265,68 282,55 299,45 316,48 333,62 350,75 367,88 384,95 401,110 418,125 435,122 452,112 469,98 486,85 503,62 520,55 537,65 554,78 571,92 588,105 605,108 622,120 639,135 656,148 673,142 690,128 707,112 724,98 741,85 758,65 775,72 792,82"
                          fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round"
                        />
                        {/* Buy signals */}
                        <polygon points="231,170 225,182 237,182" fill="#22c55e" />
                        <polygon points="503,170 497,182 509,182" fill="#22c55e" />
                        {/* Gold buy signal */}
                        <polygon points="299,165 291,180 307,180" fill="#f59e0b" stroke="#f59e0b" />
                        <text x="299" y="195" fill="#f59e0b" fontSize="10" textAnchor="middle" fontWeight="bold">&#9733;</text>
                        {/* Sell signals */}
                        <polygon points="163,45 157,33 169,33" fill="#ef4444" />
                        <polygon points="656,42 650,30 662,30" fill="#ef4444" />
                      </svg>
                      {/* Glow effects */}
                      <div className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)" }} />
                      <div className="absolute bottom-1/4 right-1/4 w-36 h-36 rounded-full" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)" }} />
                    </div>

                    {/* Title overlay */}
                    <div className="relative z-10 flex flex-col items-center justify-center h-full py-10 sm:py-14 px-6 text-center">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4" style={{ background: "rgba(168,85,247,0.2)", color: "rgb(168,85,247)", border: "1px solid rgba(168,85,247,0.3)" }}>
                        Indicateur du Mois
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2" style={{ textShadow: "0 2px 20px rgba(139,92,246,0.5)" }}>
                        {latestIndicator.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mb-4">
                        Publi&eacute; le {formatDate(latestIndicator.createdAt)}
                      </p>
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {indicatorExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {indicatorExpanded ? "Masquer" : "Voir le descriptif et le code"}
                      </div>
                    </div>
                  </div>

                  {/* ── Expanded content (description + code) ── */}
                  {indicatorExpanded && (
                    <div className="p-5 sm:p-6" style={{ borderTop: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
                      {/* Description */}
                      {latestIndicator.content && (
                        <div className="mb-5">
                          {latestIndicator.content
                            .split("\n")
                            .filter(Boolean)
                            .map((para, i) => (
                              <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                                {para}
                              </p>
                            ))}
                        </div>
                      )}

                      {/* Pine Script code block */}
                      {latestIndicator.scriptCode && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Code className="w-4 h-4" style={{ color: "rgb(168,85,247)" }} />
                              <span className="text-xs font-medium" style={{ color: "var(--text-primary, #e5e7eb)" }}>Pine Script — Copier et coller dans TradingView</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopyScript(latestIndicator.scriptCode!); }}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition hover:opacity-80"
                              style={{
                                background: copied ? "rgba(34,197,94,0.15)" : "rgba(168,85,247,0.15)",
                                color: copied ? "rgb(34,197,94)" : "rgb(168,85,247)",
                                border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(168,85,247,0.3)"}`,
                              }}
                            >
                              {copied ? (<><Check className="w-3.5 h-3.5" />Copi&eacute; !</>) : (<><Copy className="w-3.5 h-3.5" />Copier le Script</>)}
                            </button>
                          </div>
                          <pre className="rounded-xl p-4 text-xs overflow-x-auto" style={{ background: "#1e1e2e", border: "1px solid rgba(168,85,247,0.15)", maxHeight: 500, fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}>
                            <code style={{ color: "#a6e3a1", whiteSpace: "pre", display: "block" }}>
                              {latestIndicator.scriptCode}
                            </code>
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative" style={{ minHeight: 220 }}>
                  {/* Blurred illustration for non-VIP */}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0f0a1e 0%, #1a0e2e 40%, #0d1117 100%)" }}>
                    <svg className="absolute inset-0 w-full h-full opacity-10">
                      {[...Array(20)].map((_, i) => <line key={`h${i}`} x1="0" y1={`${i * 5}%`} x2="100%" y2={`${i * 5}%`} stroke="#8b5cf6" strokeWidth="0.5" />)}
                    </svg>
                  </div>
                  <div className="relative z-10 flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                    <h3 className="text-xl sm:text-2xl font-black text-white/50 tracking-tight mb-2">
                      {latestIndicator.title}
                    </h3>
                    <span className="text-xs text-gray-500 font-mono">
                      {formatDate(latestIndicator.createdAt)}
                    </span>
                  </div>
                  <LockedOverlay />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Section 2: Derniere Analyse Macro & Futures ═══ */}
      {!postsLoading && (
        <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <BarChart3
                className="w-5 h-5"
                style={{ color: "rgb(59,130,246)" }}
              />
            </div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary, #e5e7eb)" }}
            >
              Derni&egrave;re Analyse Macro &amp; Futures
            </h2>
          </div>

          {!latestMacro ? (
            <div
              className="glass rounded-2xl p-8 text-center"
              style={{
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
              }}
            >
              <BarChart3
                className="w-8 h-8 mx-auto mb-3"
                style={{ color: "rgba(59,130,246,0.3)" }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary, #9ca3af)" }}
              >
                Prochaine analyse bient&ocirc;t...
              </p>
            </div>
          ) : (
            <div
              className="glass relative rounded-2xl overflow-hidden"
              style={{
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
              }}
            >
              {isVip ? (
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3
                        className="text-base font-bold"
                        style={{ color: "var(--text-primary, #e5e7eb)" }}
                      >
                        {latestMacro.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[11px] font-mono"
                          style={{
                            color: "var(--text-secondary, #9ca3af)",
                          }}
                        >
                          {formatDate(latestMacro.createdAt)}
                        </span>
                        <span
                          className="text-[11px]"
                          style={{
                            color: "var(--text-secondary, #9ca3af)",
                          }}
                        >
                          &mdash; {typeLabel(latestMacro.type)}
                        </span>
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex-shrink-0"
                      style={{
                        background: typeBadgeColor(latestMacro.type).bg,
                        color: typeBadgeColor(latestMacro.type).color,
                      }}
                    >
                      {typeLabel(latestMacro.type)}
                    </span>
                  </div>

                  {/* Rendered markdown content */}
                  {latestMacro.content && (
                    <div
                      className="vip-md"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(latestMacro.content),
                      }}
                    />
                  )}

                  {/* Image */}
                  {latestMacro.imageUrl && (
                    <div className="rounded-xl overflow-hidden mt-4">
                      <img
                        src={latestMacro.imageUrl}
                        alt={latestMacro.title}
                        className="w-full object-cover rounded-xl"
                        style={{ maxHeight: 400 }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 sm:p-6 min-h-[200px]">
                  <h3
                    className="text-base font-bold mb-1"
                    style={{ color: "var(--text-primary, #e5e7eb)" }}
                  >
                    {latestMacro.title}
                  </h3>
                  <span
                    className="text-[11px] font-mono block mb-3"
                    style={{ color: "var(--text-secondary, #9ca3af)" }}
                  >
                    {formatDate(latestMacro.createdAt)}
                  </span>
                  {/* Preview: first 3 lines for non-VIP */}
                  {latestMacro.content && (
                    <div className="space-y-1">
                      {latestMacro.content
                        .split("\n")
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((line, i) => (
                          <p
                            key={i}
                            className="text-sm"
                            style={{
                              color: "var(--text-primary, #e5e7eb)",
                            }}
                          >
                            {line}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              )}
              {!isVip && <LockedOverlay />}
            </div>
          )}
        </div>
      )}

      {/* ═══ Section 3: Archives ═══ */}
      {!postsLoading && archivePosts.length > 0 && (
        <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.15)" }}
            >
              <FileText
                className="w-5 h-5"
                style={{ color: "rgb(245,158,11)" }}
              />
            </div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary, #e5e7eb)" }}
            >
              Archives
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(245,158,11,0.15)",
                color: "rgb(245,158,11)",
              }}
            >
              {archivePosts.length}
            </span>
          </div>

          <div className="space-y-3">
            {archivePosts.map((post) => {
              const badge = typeBadgeColor(post.type);
              const isExpanded = expandedArchive === post.id;
              const isLoading = archiveLoading === post.id;

              return (
                <div
                  key={post.id}
                  className="glass relative rounded-2xl overflow-hidden transition"
                  style={{
                    border: `1px solid ${
                      isExpanded
                        ? "rgba(245,158,11,0.2)"
                        : "var(--border, rgba(255,255,255,0.08))"
                    }`,
                    background:
                      "var(--bg-secondary, rgba(255,255,255,0.03))",
                  }}
                >
                  {/* Header row */}
                  <div
                    className="flex items-center justify-between p-4 transition hover:bg-white/[0.02]"
                    style={{
                      cursor: isVip ? "pointer" : "default",
                    }}
                    onClick={() => handleArchiveToggle(post)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-sm font-semibold truncate"
                          style={{
                            color: "var(--text-primary, #e5e7eb)",
                          }}
                        >
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[10px] font-mono"
                            style={{
                              color: "var(--text-secondary, #9ca3af)",
                            }}
                          >
                            {formatDateShort(post.createdAt)}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{
                              background: badge.bg,
                              color: badge.color,
                            }}
                          >
                            {typeLabel(post.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isVip && (
                      <div className="flex-shrink-0 ml-3">
                        {isLoading ? (
                          <Loader2
                            className="w-4 h-4 animate-spin"
                            style={{
                              color: "var(--text-secondary, #9ca3af)",
                            }}
                          />
                        ) : isExpanded ? (
                          <ChevronUp
                            className="w-4 h-4"
                            style={{
                              color: "var(--text-secondary, #9ca3af)",
                            }}
                          />
                        ) : (
                          <ChevronDown
                            className="w-4 h-4"
                            style={{
                              color: "var(--text-secondary, #9ca3af)",
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded content */}
                  {isVip && isExpanded && post.content && (
                    <div
                      className="px-4 pb-4 border-t"
                      style={{
                        borderColor: "var(--border, rgba(255,255,255,0.08))",
                      }}
                    >
                      <div className="pt-4">
                        {post.type === "indicator" ? (
                          <>
                            {/* Description */}
                            <div className="space-y-2 mb-4">
                              {post.content
                                .split("\n")
                                .filter(Boolean)
                                .map((para, i) => (
                                  <p
                                    key={i}
                                    className="text-sm leading-relaxed"
                                    style={{
                                      color:
                                        "var(--text-primary, #e5e7eb)",
                                    }}
                                  >
                                    {para}
                                  </p>
                                ))}
                            </div>
                            {/* Script code */}
                            {post.scriptCode && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Code
                                      className="w-4 h-4"
                                      style={{
                                        color: "rgb(168,85,247)",
                                      }}
                                    />
                                    <span
                                      className="text-xs font-medium"
                                      style={{
                                        color:
                                          "var(--text-primary, #e5e7eb)",
                                      }}
                                    >
                                      Pine Script
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyScript(post.scriptCode!);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80"
                                    style={{
                                      background: copied
                                        ? "rgba(34,197,94,0.15)"
                                        : "rgba(168,85,247,0.15)",
                                      color: copied
                                        ? "rgb(34,197,94)"
                                        : "rgb(168,85,247)",
                                      border: `1px solid ${
                                        copied
                                          ? "rgba(34,197,94,0.3)"
                                          : "rgba(168,85,247,0.3)"
                                      }`,
                                    }}
                                  >
                                    {copied ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        Copi&eacute; !
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        Copier le Script
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre
                                  className="rounded-xl p-4 text-xs overflow-x-auto"
                                  style={{
                                    background: "#1e1e2e",
                                    border:
                                      "1px solid rgba(168,85,247,0.15)",
                                    maxHeight: 500,
                                    fontFamily:
                                      "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                                  }}
                                >
                                  <code
                                    style={{
                                      color: "#a6e3a1",
                                      whiteSpace: "pre",
                                      display: "block",
                                    }}
                                  >
                                    {post.scriptCode}
                                  </code>
                                </pre>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Macro / options / futures: render markdown */
                          <div
                            className="vip-md"
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(post.content),
                            }}
                          />
                        )}

                        {/* Image */}
                        {post.imageUrl && (
                          <div className="rounded-xl overflow-hidden mt-4">
                            <img
                              src={post.imageUrl}
                              alt={post.title}
                              className="w-full object-cover rounded-xl"
                              style={{ maxHeight: 400 }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Non-VIP lock */}
                  {!isVip && <LockedOverlay />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Section 4: Abonnement (non-VIP only) ═══ */}
      {!isVip && !postsLoading && (
        <div className="mx-4 mt-10 sm:mx-6 sm:mt-12 flex justify-center">
          <div
            className="glass max-w-lg w-full rounded-2xl overflow-hidden"
            style={{
              border: "1px solid rgba(245,158,11,0.2)",
              background: "var(--bg-secondary, rgba(255,255,255,0.03))",
            }}
          >
            {/* Pricing header */}
            <div
              className="p-6 text-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(168,85,247,0.05))",
                borderBottom: "1px solid rgba(245,158,11,0.1)",
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <Crown
                  className="w-6 h-6"
                  style={{ color: "rgb(245,158,11)" }}
                />
                <h2
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary, #e5e7eb)" }}
                >
                  Abonnement
                </h2>
              </div>
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span
                  className="text-4xl font-bold"
                  style={{ color: "var(--text-primary, #e5e7eb)" }}
                >
                  9.99&euro;
                </span>
                <span
                  className="text-sm"
                  style={{ color: "var(--text-secondary, #9ca3af)" }}
                >
                  /mois
                </span>
              </div>
              <p
                className="text-xs"
                style={{ color: "var(--text-secondary, #9ca3af)" }}
              >
                Sans engagement &mdash; Annulez &agrave; tout moment
              </p>
            </div>

            {/* Features */}
            <div className="p-6 space-y-3">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(34,197,94,0.15)" }}
                    >
                      <Check
                        className="w-3 h-3"
                        style={{ color: "rgb(34,197,94)" }}
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <Icon
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: "var(--text-secondary, #9ca3af)" }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-primary, #e5e7eb)" }}
                      >
                        {f.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subscribe button */}
            <div className="px-6 pb-6">
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
                  boxShadow: "0 4px 20px rgba(245,158,11,0.2)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirection vers le paiement...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    S&apos;abonner maintenant
                  </>
                )}
              </button>
              <p
                className="text-xs text-center mt-3"
                style={{ color: "var(--text-secondary, #9ca3af)" }}
              >
                Paiement s&eacute;curis&eacute; par Stripe. Annulation possible
                &agrave; tout moment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stripe note (VIP) */}
      {isVip && !postsLoading && (
        <div className="mx-4 mt-10 sm:mx-6 text-center">
          <p
            className="text-xs"
            style={{ color: "var(--text-secondary, #9ca3af)" }}
          >
            Paiement s&eacute;curis&eacute; par Stripe. Annulation possible
            &agrave; tout moment.
          </p>
        </div>
      )}
    </div>
  );
}
