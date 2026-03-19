"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import {
  Crown,
  Lock,
  Globe,
  BarChart3,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
  TrendingUp,
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
    case "macro":
      return "Macro";
    case "options":
      return "Options";
    case "futures":
      return "Futures";
    default:
      return type;
  }
};

const typeBadgeColor = (type: string) => {
  switch (type) {
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

/* ─── Simple markdown-to-HTML renderer ─── */
function renderMarkdown(md: string): string {
  let html = md;

  // Remove "CAPTURE X" headers — replace with just section title if on next line
  html = html.replace(/^#+\s*CAPTURE\s*\d+[^\n]*\n?/gim, "");

  // Remove footer "Rapport généré automatiquement..." block
  html = html.replace(/^>\s*📝\s*Rapport généré automatiquement[^\n]*$/gm, "");
  html = html.replace(/^>\s*Données\s*:.*$/gm, "");
  html = html.replace(/^>\s*Prochain rapport\s*:.*$/gm, "");
  // Also catch any variant
  html = html.replace(/📝\s*Rapport généré automatiquement[^\n]*/g, "");
  html = html.replace(/Données\s*:\s*QuantData[^\n]*/g, "");
  html = html.replace(/Prochain rapport\s*:[^\n]*/g, "");

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

  html = html.replace(/^---+$/gm, '<hr class="vip-hr" />');

  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="vip-h3">$1</h3>'
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="vip-h2">$1</h2>'
  );

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

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

/* ─── Markdown content styles ─── */
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

/* ─── Analysis Card ─── */
function AnalysisCard({
  post,
  isVip,
}: {
  post: VipPost;
  isVip: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fullContent, setFullContent] = useState<string | null>(
    post.content || null
  );
  const [contentLoading, setContentLoading] = useState(false);
  const badge = typeBadgeColor(post.type);

  const handleExpand = useCallback(async () => {
    if (!isVip) return;

    if (expanded) {
      setExpanded(false);
      return;
    }

    // If no full content loaded yet, fetch it
    if (!fullContent) {
      setContentLoading(true);
      try {
        const res = await fetch(`/api/vip/posts/${post.id}`);
        if (res.ok) {
          const data: VipPost = await res.json();
          setFullContent(data.content || null);
        }
      } catch {
        // silently fail
      } finally {
        setContentLoading(false);
      }
    }

    setExpanded(true);
  }, [isVip, expanded, fullContent, post.id]);

  // For preview: get first section of content (up to first ---  or ## after the first one)
  const getPreviewContent = (content: string) => {
    const lines = content.split("\n");
    const previewLines: string[] = [];
    let foundFirstHeader = false;
    for (const line of lines) {
      if (line.startsWith("## ") && foundFirstHeader) break;
      if (line.startsWith("## ")) foundFirstHeader = true;
      if (line.trim() === "---" && previewLines.length > 10) break;
      previewLines.push(line);
      if (previewLines.length > 30) break;
    }
    return previewLines.join("\n");
  };

  return (
    <div
      className="glass relative rounded-2xl overflow-hidden transition-all"
      style={{
        border: expanded
          ? "1px solid rgba(59,130,246,0.3)"
          : "1px solid var(--border, rgba(255,255,255,0.08))",
        background: "var(--bg-secondary, rgba(255,255,255,0.03))",
      }}
    >
      {/* Header */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h3
              className="text-base sm:text-lg font-bold"
              style={{ color: "var(--text-primary, #e5e7eb)" }}
            >
              {post.title}
            </h3>
            <div className="flex items-center gap-3 mt-1.5">
              <span
                className="text-xs font-mono"
                style={{ color: "var(--text-secondary, #9ca3af)" }}
              >
                {formatDate(post.createdAt)}
              </span>
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold"
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

        {/* Content */}
        {isVip ? (
          <>
            {fullContent && (
              <div
                className="vip-md"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(
                    expanded
                      ? fullContent
                      : getPreviewContent(fullContent)
                  ),
                }}
              />
            )}

            {/* Lire la suite / Réduire button */}
            {fullContent && fullContent.split("\n").length > 30 && (
              <button
                onClick={handleExpand}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
                style={{
                  background: "rgba(59,130,246,0.1)",
                  color: "rgb(59,130,246)",
                  border: "1px solid rgba(59,130,246,0.2)",
                }}
              >
                {contentLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement...
                  </>
                ) : expanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    R&eacute;duire
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Lire la suite
                  </>
                )}
              </button>
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
          </>
        ) : (
          <>
            {/* Non-VIP: title visible, content blurred */}
            {post.content && (
              <div className="relative">
                <div
                  className="vip-md"
                  style={{
                    maxHeight: 120,
                    overflow: "hidden",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(
                      post.content.split("\n").slice(0, 5).join("\n")
                    ),
                  }}
                />
                {/* Blur overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0"
                  style={{
                    height: 80,
                    background:
                      "linear-gradient(to top, var(--bg-secondary, rgba(15,15,20,1)) 0%, transparent 100%)",
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Non-VIP lock */}
      {!isVip && (
        <div
          className="flex flex-col items-center justify-center gap-2 py-6"
          style={{
            borderTop: "1px solid var(--border, rgba(255,255,255,0.08))",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <Lock
              className="w-5 h-5"
              style={{ color: "rgba(255,255,255,0.5)" }}
            />
          </div>
          <span
            className="text-xs font-medium"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Contenu r&eacute;serv&eacute; aux membres VIP
          </span>
          <Link
            href="/vip"
            className="mt-1 px-4 py-2 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
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
      )}
    </div>
  );
}

/* ─── Suspense wrapper ─── */
export default function AnalysesPageWrapper() {
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
      <AnalysesPage />
    </Suspense>
  );
}

/* ─── Main page ─── */
function AnalysesPage() {
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
        const analyses = (data as VipPost[]).filter(
          (p) => p.type !== "indicator"
        );
        setPosts(analyses);
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-20">
      {/* Inject markdown styles */}
      <style dangerouslySetInnerHTML={{ __html: markdownStyles }} />

      {/* ═══ Hero Banner ═══ */}
      <div
        className="relative overflow-hidden rounded-2xl mx-4 mt-4 sm:mx-6 sm:mt-6 p-8 sm:p-12"
        style={{
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,58,138,0.3) 40%, rgba(15,23,42,0.95) 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)",
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
                  "linear-gradient(135deg, rgb(59,130,246), rgb(37,99,235))",
                boxShadow: "0 8px 32px rgba(59,130,246,0.3)",
              }}
            >
              <Globe className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: "var(--text-primary, #e5e7eb)" }}
              >
                Analyses Macro &amp; Futures
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-secondary, #9ca3af)" }}
              >
                FOMC, DXY, Dark Pool, Greeks, Options Flow
              </p>
            </div>
          </div>

          {/* Type filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span
              className="px-3 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5"
              style={{
                background: "rgba(59,130,246,0.1)",
                color: "rgb(59,130,246)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <Globe className="w-3 h-3" />
              {posts.length} analyse{posts.length > 1 ? "s" : ""}
            </span>
            <span
              className="px-3 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5"
              style={{
                background: "rgba(34,197,94,0.1)",
                color: "rgb(34,197,94)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <TrendingUp className="w-3 h-3" />
              Post-Cl&ocirc;ture
            </span>
            <span
              className="px-3 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5"
              style={{
                background: "rgba(245,158,11,0.1)",
                color: "rgb(245,158,11)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <Calendar className="w-3 h-3" />
              Hebdomadaire
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

      {/* ═══ Analysis Cards ═══ */}
      {!postsLoading && (
        <div className="mx-4 mt-8 sm:mx-6 sm:mt-10 space-y-6">
          {posts.length === 0 ? (
            <div
              className="glass rounded-2xl p-12 text-center"
              style={{
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
              }}
            >
              <Globe
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "rgba(59,130,246,0.3)" }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary, #9ca3af)" }}
              >
                Aucune analyse pour le moment. Revenez bient&ocirc;t !
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <AnalysisCard key={post.id} post={post} isVip={isVip} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
