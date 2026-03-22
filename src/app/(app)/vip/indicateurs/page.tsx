"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import {
  Crown,
  Lock,
  Code,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Loader2,
  Timer,
  Layers,
  LayoutDashboard,
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
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

/* ─── Markdown-to-HTML renderer ─── */
function renderMarkdown(md: string): string {
  let html = md;

  // Escape HTML
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks
  html = html.replace(
    /```[\w]*\n([\s\S]*?)```/g,
    '<pre class="vip-code-block"><code>$1</code></pre>'
  );

  // Tables
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

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr class="vip-hr" />');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="vip-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="vip-h2">$1</h2>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Unordered lists
  html = html.replace(
    /((?:^|\n)- .+(?:\n- .+)*)/g,
    (_match, listBlock: string) => {
      const items = listBlock.trim().split("\n").map((l) => l.replace(/^- /, "").trim()).filter(Boolean);
      return '<ul class="vip-ul">' + items.map((item) => `<li>${item}</li>`).join("") + "</ul>";
    }
  );

  // Ordered lists
  html = html.replace(
    /((?:^|\n)\d+\. .+(?:\n\d+\. .+)*)/g,
    (_match, listBlock: string) => {
      const items = listBlock.trim().split("\n").map((l) => l.replace(/^\d+\. /, "").trim()).filter(Boolean);
      return '<ol class="vip-ol">' + items.map((item) => `<li>${item}</li>`).join("") + "</ol>";
    }
  );

  // Paragraphs
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
.vip-md .vip-h2 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 1.5rem 0 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
.vip-md .vip-h3 { font-size: 1.05rem; font-weight: 600; color: rgb(168,85,247); margin: 1.25rem 0 0.5rem; }
.vip-md .vip-p { font-size: 0.875rem; line-height: 1.7; color: var(--text-primary); margin: 0.35rem 0; }
.vip-md strong { color: var(--text-primary); font-weight: 700; }
.vip-md em { color: var(--text-secondary); font-style: italic; }
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
.vip-md .vip-table tbody tr:nth-child(even) { background: rgba(255,255,255,0.02); }
.vip-md .vip-table tbody tr:hover { background: var(--bg-hover); }
`;

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
        S'abonner pour accéder
      </span>
    </div>
  );
}

/* ─── Indicator Card ─── */
function IndicatorCard({
  post,
  isVip,
}: {
  post: VipPost;
  isVip: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may fail
    }
  }, []);

  return (
    <div
      className="glass relative rounded-2xl overflow-hidden transition-all"
      style={{
        border: expanded
          ? "1px solid rgba(168,85,247,0.3)"
          : "1px solid var(--border)",
        background: "var(--bg-secondary)",
      }}
    >
      {/* Image header */}
      {post.imageUrl ? (
        <div className="relative w-full" style={{ height: 200 }}>
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)",
            }}
          />
        </div>
      ) : (
        <div
          className="relative w-full flex items-center justify-center"
          style={{
            height: 200,
            background:
              "linear-gradient(135deg, #0f0a1e 0%, #1a0e2e 40%, #0d1117 100%)",
          }}
        >
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10">
            {[...Array(20)].map((_, i) => (
              <line
                key={`h${i}`}
                x1="0"
                y1={`${i * 5}%`}
                x2="100%"
                y2={`${i * 5}%`}
                stroke="#8b5cf6"
                strokeWidth="0.5"
              />
            ))}
            {[...Array(30)].map((_, i) => (
              <line
                key={`v${i}`}
                x1={`${i * 3.3}%`}
                y1="0"
                x2={`${i * 3.3}%`}
                y2="100%"
                stroke="#8b5cf6"
                strokeWidth="0.5"
              />
            ))}
          </svg>
          {/* Oscillator viz */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 800 200"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1="100"
              x2="800"
              y2="100"
              stroke="#4b5563"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {[
              20, 35, 50, 45, 30, 15, -10, -25, -40, -55, -45, -30, -15, 10,
              25, 45, 60, 70, 65, 50, 35, 20, 5, -15, -30, -20, -5, 15, 30, 50,
              65, 55, 40, 25, 10, -5, -20, -35, -50, -40, -25, -10, 10, 25, 40,
              55, 45, 30,
            ].map((v, i) => (
              <rect
                key={i}
                x={i * 17}
                y={v > 0 ? 100 - v * 1.1 : 100}
                width="12"
                height={Math.abs(v) * 1.1}
                rx="2"
                fill={
                  v > 0 ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"
                }
              />
            ))}
            <polyline
              points="10,85 27,70 44,50 61,55 78,70 95,85 112,105 129,120 146,135 163,148 180,140 197,125 214,110 231,95 248,80 265,55 282,42 299,32 316,38 333,52 350,65 367,80 384,90 401,105 418,118 435,115 452,105 469,92 486,78 503,52 520,48 537,58 554,72 571,88 588,100 605,105 622,118 639,132 656,145 673,138 690,125 707,108 724,95 741,80 758,58 775,65 792,75"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
            }}
          />
        </div>
      )}

      {/* Card body */}
      <div className="p-5">
        {/* Title */}
        <h3
          className="text-lg font-bold mb-2"
          style={{ color: "var(--text-primary, #e5e7eb)" }}
        >
          {post.title}
        </h3>

        {/* Date + Badge */}
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-xs font-mono"
            style={{ color: "var(--text-secondary, #9ca3af)" }}
          >
            {formatDate(post.createdAt)}
          </span>
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-bold"
            style={{
              background: "rgba(168,85,247,0.15)",
              color: "rgb(168,85,247)",
              border: "1px solid rgba(168,85,247,0.2)",
            }}
          >
            Pine Script v6
          </span>
        </div>

        {/* Description — rendered as rich markdown */}
        {post.content && (
          <div className="mb-4">
            {isVip ? (
              <div
                className="vip-md"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(
                    contentExpanded
                      ? post.content
                      : post.content.split("\n").slice(0, 20).join("\n")
                  ),
                }}
              />
            ) : (
              <div
                className="vip-md"
                style={{ maxHeight: 80, overflow: "hidden" }}
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(post.content.split("\n").slice(0, 6).join("\n")),
                }}
              />
            )}
            {isVip && post.content.split("\n").length > 20 && (
              <button
                onClick={() => setContentExpanded(!contentExpanded)}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80"
                style={{
                  background: "rgba(168,85,247,0.08)",
                  color: "rgb(168,85,247)",
                  border: "1px solid rgba(168,85,247,0.15)",
                }}
              >
                {contentExpanded ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> Réduire la description</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> Voir la description complète</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Stats row */}
        <div
          className="flex items-center gap-4 mb-4 py-3 px-4 rounded-xl"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <Code
              className="w-3.5 h-3.5"
              style={{ color: "rgb(168,85,247)" }}
            />
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-secondary, #9ca3af)" }}
            >
              version 6
            </span>
          </div>
          <div
            className="w-px h-4"
            style={{ background: "var(--border)" }}
          />
          <div className="flex items-center gap-1.5">
            <Timer
              className="w-3.5 h-3.5"
              style={{ color: "rgb(59,130,246)" }}
            />
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-secondary, #9ca3af)" }}
            >
              Multi-timeframe
            </span>
          </div>
          <div
            className="w-px h-4"
            style={{ background: "var(--border)" }}
          />
          <div className="flex items-center gap-1.5">
            <LayoutDashboard
              className="w-3.5 h-3.5"
              style={{ color: "rgb(34,197,94)" }}
            />
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-secondary, #9ca3af)" }}
            >
              Dashboard intégré
            </span>
          </div>
        </div>

        {/* Action buttons */}
        {isVip && post.scriptCode && (
          <div className="space-y-3">
            {/* Voir le code button */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-90"
              style={{
                background: "rgba(168,85,247,0.1)",
                color: "rgb(168,85,247)",
                border: "1px solid rgba(168,85,247,0.2)",
              }}
            >
              <Code className="w-4 h-4" />
              {expanded ? "Masquer le code" : "Voir le code"}
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Copier le Script */}
            <button
              onClick={() => handleCopy(post.scriptCode!)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition hover:opacity-90"
              style={{
                background: copied
                  ? "rgba(34,197,94,0.15)"
                  : "linear-gradient(135deg, rgb(168,85,247), rgb(139,92,246))",
                color: copied ? "rgb(34,197,94)" : "white",
                border: copied
                  ? "1px solid rgba(34,197,94,0.3)"
                  : "1px solid rgba(168,85,247,0.3)",
                boxShadow: copied
                  ? "none"
                  : "0 4px 16px rgba(168,85,247,0.25)",
              }}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copié dans le presse-papier !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copier le Script
                </>
              )}
            </button>

            {/* Code block */}
            {expanded && (
              <div className="mt-3">
                <pre
                  className="rounded-xl p-4 text-xs overflow-x-auto"
                  style={{
                    background: "#1e1e2e",
                    border: "1px solid rgba(168,85,247,0.15)",
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
          </div>
        )}
      </div>

      {/* Non-VIP lock: image + title visible, code blurred */}
      {!isVip && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10"
          style={{ top: post.imageUrl ? 200 : 200 }}
        >
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{
              backdropFilter: "blur(8px)",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <Lock
                className="w-6 h-6"
                style={{ color: "rgba(255,255,255,0.6)" }}
              />
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Abonnez-vous pour accéder au code
            </span>
            <Link
              href="/vip"
              className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
                boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
              }}
            >
              <Crown className="w-3.5 h-3.5 inline mr-1.5" />
              Devenir VIP
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Suspense wrapper ─── */
export default function IndicateursPageWrapper() {
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
      <IndicateursPage />
    </Suspense>
  );
}

/* ─── Main page ─── */
function IndicateursPage() {
  const [isVip, setIsVip] = useState(false);
  const [posts, setPosts] = useState<VipPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role) {
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
      .then((data) => {
        const indicators = (data as VipPost[]).filter(
          (p) => p.type === "indicator"
        );
        setPosts(indicators);
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-20">
      <style dangerouslySetInnerHTML={{ __html: markdownStyles }} />
      {/* ═══ Hero Banner ═══ */}
      <div
        className="relative overflow-hidden rounded-2xl mx-4 mt-4 sm:mx-6 sm:mt-6 p-8 sm:p-12"
        style={{
          background:
            "linear-gradient(135deg, rgba(15,10,30,0.95) 0%, rgba(26,14,46,0.9) 40%, rgba(13,17,23,0.95) 100%)",
          border: "1px solid rgba(168,85,247,0.2)",
        }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
            transform: "translate(-20%, 40%)",
          }}
        />

        <div className="relative z-10">
          <Link
            href="/vip"
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 transition hover:opacity-80"
            style={{ color: "var(--text-secondary, #9ca3af)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Retour VIP
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, rgb(168,85,247), rgb(139,92,246))",
                boxShadow: "0 8px 32px rgba(168,85,247,0.3)",
              }}
            >
              <Code className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: "var(--text-primary, #e5e7eb)" }}
              >
                Indicateurs Exclusifs MarketPhase
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-secondary, #9ca3af)" }}
              >
                Pine Script v6 — Copier-coller dans TradingView
              </p>
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span
              className="px-3 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5"
              style={{
                background: "rgba(168,85,247,0.1)",
                color: "rgb(168,85,247)",
                border: "1px solid rgba(168,85,247,0.2)",
              }}
            >
              <Code className="w-3 h-3" />
              {posts.length} indicateur{posts.length > 1 ? "s" : ""}
            </span>
            <span
              className="px-3 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5"
              style={{
                background: "rgba(59,130,246,0.1)",
                color: "rgb(59,130,246)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <Layers className="w-3 h-3" />
              Multi-timeframe
            </span>
          </div>
        </div>
      </div>

      {/* Loading */}
      {postsLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "var(--text-muted, #9ca3af)" }}
          />
        </div>
      )}

      {/* ═══ Indicator Cards ═══ */}
      {!postsLoading && (
        <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
          {posts.length === 0 ? (
            <div
              className="glass rounded-2xl p-12 text-center"
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
              }}
            >
              <Code
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "rgba(168,85,247,0.3)" }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary, #9ca3af)" }}
              >
                Aucun indicateur pour le moment. Revenez bientôt !
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {posts.map((post) => (
                <IndicatorCard key={post.id} post={post} isVip={isVip} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
