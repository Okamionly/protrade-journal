"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "@/i18n/context";
import {
  Crown,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  Code,
  FileText,
  TrendingUp,
  BarChart3,
  Activity,
  Loader2,
  ImageIcon,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  Table,
  Minus,
  Link2,
  Quote,
  Type,
  Palette,
  Maximize2,
  Minimize2,
  Upload,
} from "lucide-react";

/* ──────────────── Types ──────────────── */

interface VipPost {
  id: string;
  title: string;
  type: string;
  content: string;
  scriptCode: string | null;
  imageUrl: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  author?: { name: string | null; email: string };
}

const TYPE_OPTIONS = [
  { value: "indicator", labelKey: "vipTypeIndicator" },
  { value: "macro", labelKey: "vipTypeMacro" },
  { value: "options", labelKey: "vipTypeOptions" },
  { value: "futures", labelKey: "vipTypeFutures" },
];

const typeLabelKey = (type: string) =>
  TYPE_OPTIONS.find((opt) => opt.value === type)?.labelKey || type;

const typeIcon = (type: string) => {
  switch (type) {
    case "indicator":
      return <TrendingUp className="w-4 h-4" style={{ color: "rgb(168,85,247)" }} />;
    case "macro":
      return <BarChart3 className="w-4 h-4" style={{ color: "rgb(59,130,246)" }} />;
    case "options":
    case "futures":
      return <Activity className="w-4 h-4" style={{ color: "rgb(234,88,12)" }} />;
    default:
      return <FileText className="w-4 h-4" style={{ color: "var(--text-muted)" }} />;
  }
};

const typeColor = (type: string) => {
  switch (type) {
    case "indicator":
      return { bg: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.3)", text: "rgb(168,85,247)" };
    case "macro":
      return { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.3)", text: "rgb(59,130,246)" };
    case "options":
    case "futures":
      return { bg: "rgba(234,88,12,0.15)", border: "rgba(234,88,12,0.3)", text: "rgb(234,88,12)" };
    default:
      return { bg: "rgba(156,163,175,0.15)", border: "rgba(156,163,175,0.3)", text: "rgb(156,163,175)" };
  }
};

/* ─── Color Picker Dropdown ─── */
const TEXT_COLORS = [
  { label: "Rouge", value: "red", css: "#ef4444" },
  { label: "Orange", value: "orange", css: "#f97316" },
  { label: "Jaune", value: "yellow", css: "#eab308" },
  { label: "Vert", value: "green", css: "#22c55e" },
  { label: "Bleu", value: "blue", css: "#3b82f6" },
  { label: "Violet", value: "purple", css: "#a855f7" },
  { label: "Rose", value: "pink", css: "#ec4899" },
  { label: "Cyan", value: "cyan", css: "#06b6d4" },
];

const EMOJI_ICONS = [
  "📊", "📋", "📌", "📚", "📐", "📅",
  "🟢", "🔴", "🟡", "⚪", "🔵", "🟩",
  "🧱", "🧲", "🎯", "🪤", "⚡", "🔻",
  "✅", "❌", "⚠️", "🔥", "💡", "🛡️",
  "🔎", "🧠", "📝", "💰", "📈", "📉",
  "⭐", "🅰️", "🅱️", "🔑", "🌍", "₿",
];

/* ─── Markdown Editor with Toolbar ─── */
function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit");
  const [expanded, setExpanded] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setShowColors(false);
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojis(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const insertAtCursor = useCallback(
    (before: string, after: string = "", placeholder: string = "") => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);
      const text = selected || placeholder;
      const newValue = value.slice(0, start) + before + text + after + value.slice(end);
      onChange(newValue);
      setTimeout(() => {
        ta.focus();
        const cursorPos = start + before.length + text.length + after.length;
        ta.setSelectionRange(
          selected ? cursorPos : start + before.length,
          selected ? cursorPos : start + before.length + text.length
        );
      }, 0);
    },
    [value, onChange]
  );

  const insertAtLineStart = useCallback(
    (prefix: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
      onChange(newValue);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    },
    [value, onChange]
  );

  const insertTable = useCallback(() => {
    const table = "\n| Colonne 1 | Colonne 2 | Colonne 3 |\n|-----------|-----------|----------|\n| Valeur | Valeur | Valeur |\n| Valeur | Valeur | Valeur |\n";
    insertAtCursor(table);
  }, [insertAtCursor]);

  const wrapWithColor = useCallback(
    (color: string) => {
      insertAtCursor(`<span style="color:${color}">`, "</span>", "texte");
      setShowColors(false);
    },
    [insertAtCursor]
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
      insertAtCursor(emoji);
      setShowEmojis(false);
    },
    [insertAtCursor]
  );

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/vip/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        insertAtCursor(`\n![${file.name}](${data.url})\n`);
      } else {
        const err = await res.json().catch(() => ({ error: "Erreur upload" }));
        alert(err.error || "Erreur lors de l'upload");
      }
    } catch {
      alert("Erreur réseau lors de l'upload");
    }
    setUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, [insertAtCursor]);

  // Robust markdown preview
  const renderPreview = (md: string) => {
    const codeBlocks: string[] = [];
    let html = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
      const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      codeBlocks.push(
        `<pre style="background:var(--bg-hover);border:1px solid var(--border);border-radius:8px;padding:12px;margin:8px 0;overflow-x:auto;font-size:12px;line-height:1.5"><code${lang ? ` data-lang="${lang}"` : ""}>${escaped}</code></pre>`
      );
      return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
    });

    const inlineCodes: string[] = [];
    html = html.replace(/`([^`]+)`/g, (_m, code: string) => {
      const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      inlineCodes.push(`<code style="background:var(--bg-hover);padding:1px 5px;border-radius:4px;font-size:12px">${escaped}</code>`);
      return `%%INLINECODE_${inlineCodes.length - 1}%%`;
    });

    const htmlTags: string[] = [];
    html = html.replace(/<(\/?)(?:span|center|img|br|div|a|b|i|u|s|strong|em|mark|sub|sup)(\s[^>]*)?\/?>/gi, (tag) => {
      htmlTags.push(tag);
      return `%%HTMLTAG_${htmlTags.length - 1}%%`;
    });

    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/%%HTMLTAG_(\d+)%%/g, (_m, i) => htmlTags[parseInt(i)]);

    html = html.replace(/((?:^|\n)\|.+\|(?:\n\|.+\|)+)/g, (_m, tb: string) => {
      const lines = tb.trim().split("\n");
      let t = '<table style="width:100%;border-collapse:collapse;font-size:13px;margin:8px 0">';
      let isH = true;
      for (const line of lines) {
        if (/^\|[\s\-:|]+\|$/.test(line.trim())) { isH = false; continue; }
        const cells = line.split("|").filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim());
        if (isH) {
          t += "<thead><tr>" + cells.map(c => `<th style="background:var(--bg-hover);padding:6px 8px;border:1px solid var(--border);font-weight:600;text-align:left">${c}</th>`).join("") + "</tr></thead><tbody>";
          isH = false;
        } else {
          t += "<tr>" + cells.map(c => `<td style="padding:5px 8px;border:1px solid var(--border)">${c}</td>`).join("") + "</tr>";
        }
      }
      return t + "</tbody></table>";
    });

    html = html.replace(/((?:^|\n)&gt; .+(?:\n&gt; .+)*)/g, (_m, bq: string) => {
      const content = bq.trim().split("\n").map(l => l.replace(/^&gt; /, "").trim()).join("<br/>");
      return `<blockquote style="border-left:3px solid rgb(245,158,11);padding:8px 12px;margin:8px 0;color:var(--text-secondary);background:var(--bg-hover);border-radius:0 8px 8px 0;font-style:italic">${content}</blockquote>`;
    });

    html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0"/>');
    html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:1rem;font-weight:600;color:rgb(168,85,247);margin:12px 0 4px">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.2rem;font-weight:700;margin:16px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--border)">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:1.4rem;font-weight:800;margin:20px 0 8px">$1</h1>');

    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/__(.+?)__/g, "<u>$1</u>");
    html = html.replace(/~~(.+?)~~/g, "<s>$1</s>");

    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0"/>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:rgb(59,130,246);text-decoration:underline">$1</a>');

    html = html.replace(/((?:^|\n)- .+(?:\n- .+)*)/g, (_m, lb: string) => {
      const items = lb.trim().split("\n").map(l => l.replace(/^- /, "").trim()).filter(Boolean);
      return '<ul style="margin:6px 0;padding-left:20px;list-style:disc">' + items.map(i => `<li style="margin:2px 0;font-size:14px">${i}</li>`).join("") + "</ul>";
    });
    html = html.replace(/((?:^|\n)\d+\. .+(?:\n\d+\. .+)*)/g, (_m, lb: string) => {
      const items = lb.trim().split("\n").map(l => l.replace(/^\d+\. /, "").trim()).filter(Boolean);
      return '<ol style="margin:6px 0;padding-left:20px;list-style:decimal">' + items.map(i => `<li style="margin:2px 0;font-size:14px">${i}</li>`).join("") + "</ol>";
    });

    html = html.split("\n").map(l => {
      const t = l.trim();
      if (!t) return "<br/>";
      if (t.startsWith("<") || t.startsWith("%%")) return t;
      return `<p style="margin:3px 0;font-size:14px;line-height:1.6">${t}</p>`;
    }).join("\n");

    html = html.replace(/%%CODEBLOCK_(\d+)%%/g, (_m, i) => codeBlocks[parseInt(i)]);
    html = html.replace(/%%INLINECODE_(\d+)%%/g, (_m, i) => inlineCodes[parseInt(i)]);

    return html;
  };

  const ToolBtn = ({ icon: Icon, title, onClick, active }: { icon: React.ComponentType<{className?: string; style?: React.CSSProperties}>; title: string; onClick: () => void; active?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-[var(--bg-hover)]"
      style={{
        color: active ? "rgb(245,158,11)" : "var(--text-muted)",
        background: active ? "rgba(245,158,11,0.1)" : undefined,
      }}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  const Separator = () => (
    <div className="w-px h-6 mx-0.5" style={{ background: "var(--border)" }} />
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {t("vipContentMarkdown")}
        </label>
        <div className="flex items-center gap-1">
          {(["edit", "split", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition"
              style={{
                background: viewMode === mode ? "rgba(59,130,246,0.15)" : "var(--bg-hover)",
                color: viewMode === mode ? "rgb(59,130,246)" : "var(--text-muted)",
                border: viewMode === mode ? "1px solid rgba(59,130,246,0.3)" : "1px solid var(--border)",
              }}
            >
              {mode === "edit" ? "Éditeur" : mode === "split" ? "Split" : "Aperçu"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-muted)" }}
            title={expanded ? t("vipCollapse") : t("vipExpand")}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {viewMode !== "preview" && (
        <div
          className="flex items-center gap-0.5 px-2 py-1.5 rounded-t-xl flex-wrap"
          style={{
            background: "var(--bg-hover)",
            border: "1px solid var(--border)",
            borderBottom: "none",
          }}
        >
          <ToolBtn icon={Bold} title="Gras (**texte**)" onClick={() => insertAtCursor("**", "**", "texte")} />
          <ToolBtn icon={Italic} title="Italique (*texte*)" onClick={() => insertAtCursor("*", "*", "texte")} />
          <ToolBtn icon={Underline} title="Souligné (__texte__)" onClick={() => insertAtCursor("__", "__", "texte")} />
          <ToolBtn icon={Strikethrough} title="Barré (~~texte~~)" onClick={() => insertAtCursor("~~", "~~", "texte")} />

          <Separator />

          <ToolBtn icon={Heading1} title="Titre H1" onClick={() => insertAtLineStart("# ")} />
          <ToolBtn icon={Heading2} title="Titre H2" onClick={() => insertAtLineStart("## ")} />
          <ToolBtn icon={Heading3} title="Titre H3" onClick={() => insertAtLineStart("### ")} />

          <Separator />

          <ToolBtn icon={List} title="Liste à puces" onClick={() => insertAtLineStart("- ")} />
          <ToolBtn icon={ListOrdered} title="Liste numérotée" onClick={() => insertAtLineStart("1. ")} />
          <ToolBtn icon={Quote} title="Citation" onClick={() => insertAtLineStart("> ")} />

          <Separator />

          <ToolBtn icon={Table} title="Insérer tableau" onClick={insertTable} />
          <ToolBtn icon={Minus} title="Séparateur ---" onClick={() => insertAtCursor("\n---\n")} />
          <ToolBtn icon={Code} title="Bloc de code" onClick={() => insertAtCursor("\n```\n", "\n```\n", "code ici")} />
          <ToolBtn icon={Link2} title="Lien" onClick={() => insertAtCursor("[", "](url)", "texte du lien")} />

          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageUpload} />
          <ToolBtn
            icon={uploading ? Loader2 : ImageIcon}
            title="Insérer une image"
            onClick={() => !uploading && imageInputRef.current?.click()}
          />

          <Separator />

          <ToolBtn icon={AlignLeft} title="Aligner à gauche" onClick={() => insertAtCursor("")} />
          <ToolBtn icon={AlignCenter} title="Centrer" onClick={() => insertAtCursor("<center>", "</center>", "texte centré")} />

          <Separator />

          <div className="relative" ref={colorRef}>
            <ToolBtn icon={Palette} title="Couleur du texte" onClick={() => { setShowColors(!showColors); setShowEmojis(false); }} active={showColors} />
            {showColors && (
              <div
                className="absolute top-full left-0 mt-1 p-2 rounded-xl shadow-xl z-50 grid grid-cols-4 gap-1"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", minWidth: 160 }}
              >
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => wrapWithColor(c.css)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition hover:bg-[var(--bg-hover)]"
                    title={c.label}
                  >
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.css }} />
                    <span style={{ color: "var(--text-primary)" }}>{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={emojiRef}>
            <ToolBtn icon={Type} title="Emojis / Icônes" onClick={() => { setShowEmojis(!showEmojis); setShowColors(false); }} active={showEmojis} />
            {showEmojis && (
              <div
                className="absolute top-full left-0 mt-1 p-2 rounded-xl shadow-xl z-50 grid grid-cols-6 gap-1"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", minWidth: 220 }}
              >
                {EMOJI_ICONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => insertEmoji(e)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition hover:bg-[var(--bg-hover)]"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor / Preview / Split */}
      {viewMode === "preview" ? (
        <div
          className="rounded-xl p-5 overflow-y-auto"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            minHeight: expanded ? 600 : 400,
            maxHeight: expanded ? "80vh" : 500,
          }}
          dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
        />
      ) : viewMode === "split" ? (
        <div className="flex gap-0" style={{ minHeight: expanded ? 600 : 400, maxHeight: expanded ? "80vh" : 500 }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Contenu markdown..."
            className="w-1/2 px-4 py-3 rounded-bl-xl text-sm focus:outline-none resize-none font-mono"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderTop: "none",
              borderRight: "none",
              color: "var(--text-primary)",
              lineHeight: 1.6,
            }}
          />
          <div
            className="w-1/2 p-4 overflow-y-auto rounded-br-xl"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderTop: "none",
              color: "var(--text-primary)",
            }}
            dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
          />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Contenu markdown...\n\n# Titre\n## Sous-titre\n**Gras** *Italique*\n- Liste\n| Col1 | Col2 |\n|------|------|\n| val  | val  |"
          className="w-full px-4 py-3 rounded-b-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y font-mono"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderTop: "none",
            color: "var(--text-primary)",
            minHeight: expanded ? 600 : 400,
            maxHeight: expanded ? "80vh" : undefined,
            lineHeight: 1.6,
          }}
        />
      )}

      {/* Char count */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          Markdown : **gras** | *italique* | __souligné__ | # H1 | ## H2 | ### H3 | - liste | | tableau |
        </span>
        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
          {value.length.toLocaleString()} caractères
        </span>
      </div>
    </div>
  );
}

/* ──────────────── VIP Content Manager ──────────────── */

export function VipContentManager() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<VipPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<VipPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState("indicator");
  const [content, setContent] = useState("");
  const [scriptCode, setScriptCode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(false);
  const mdFileInputRef = useRef<HTMLInputElement>(null);

  const handleMdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;

      const titleMatch = text.match(/^#\s+(.+)$/m);
      if (titleMatch && !title.trim()) {
        setTitle(titleMatch[1].trim());
      }

      if (!editingPost) {
        const lower = text.toLowerCase();
        if (lower.includes("pine script") || lower.includes("indicator")) setType("indicator");
        else if (lower.includes("macro") || lower.includes("fomc") || lower.includes("fed")) setType("macro");
        else if (lower.includes("options") || lower.includes("call") || lower.includes("put")) setType("options");
        else if (lower.includes("futures") || lower.includes("contrat")) setType("futures");
      }

      const codeMatch = text.match(/```(?:pine|pinescript)?\n([\s\S]*?)```/);
      if (codeMatch && !scriptCode.trim()) {
        setScriptCode(codeMatch[1].trim());
      }

      setContent(text);
    };
    reader.readAsText(file);
    if (mdFileInputRef.current) mdFileInputRef.current.value = "";
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch("/api/vip/posts/admin");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  function resetForm() {
    setTitle("");
    setType("indicator");
    setContent("");
    setScriptCode("");
    setImageUrl("");
    setPublished(false);
    setEditingPost(null);
    setShowForm(false);
  }

  function openEditForm(post: VipPost) {
    setTitle(post.title);
    setType(post.type);
    setContent(post.content);
    setScriptCode(post.scriptCode || "");
    setImageUrl(post.imageUrl || "");
    setPublished(post.published);
    setEditingPost(post);
    setShowForm(true);
  }

  function openNewForm() {
    resetForm();
    setShowForm(true);
  }

  async function handleSave() {
    if (!title.trim() || !type || !content.trim()) return;
    setSaving(true);

    try {
      const body = {
        title: title.trim(),
        type,
        content: content.trim(),
        scriptCode: scriptCode.trim() || null,
        imageUrl: imageUrl.trim() || null,
        published,
      };

      let res: Response;
      if (editingPost) {
        res = await fetch(`/api/vip/posts/${editingPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/vip/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        resetForm();
        fetchPosts();
      }
    } catch {
      // silently fail
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("vipConfirmDelete"))) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/vip/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      // silently fail
    }
    setDeleting(null);
  }

  async function handleTogglePublished(post: VipPost) {
    try {
      const res = await fetch(`/api/vip/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !post.published }),
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, published: !p.published } : p
          )
        );
      }
    } catch {
      // silently fail
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
            }}
          >
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {t("adminVipContent")}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {t("adminVipContentDesc")}
            </p>
          </div>
        </div>

        <button
          onClick={openNewForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
          }}
        >
          <Plus className="w-4 h-4" />
          {t("vipNewPublication")}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div
          className="glass rounded-2xl p-6"
          style={{ border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {editingPost ? t("vipEditPublication") : t("vipNewPublicationForm")}
            </h2>
            <button
              onClick={resetForm}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-80"
              style={{ background: "var(--bg-secondary)" }}
            >
              <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                {t("vipFormTitle")}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("vipTitlePlaceholder")}
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                {t("type")}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload .md file */}
            <div>
              <input
                ref={mdFileInputRef}
                type="file"
                accept=".md,.markdown,.txt"
                className="hidden"
                onChange={handleMdUpload}
              />
              <button
                type="button"
                onClick={() => mdFileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-sm font-medium transition hover:opacity-80"
                style={{
                  border: "2px dashed var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                }}
              >
                <Upload className="w-5 h-5" />
                <span>Importer un fichier .md</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>(remplit le titre, type, contenu et code automatiquement)</span>
              </button>
            </div>

            {/* Content — Rich Markdown Editor */}
            <MarkdownEditor value={content} onChange={setContent} />

            {/* Script Code */}
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <Code className="w-3.5 h-3.5" />
                {t("vipScriptCode")}
              </label>
              <textarea
                value={scriptCode}
                onChange={(e) => setScriptCode(e.target.value)}
                placeholder="// Pine Script ou code indicateur..."
                rows={12}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <ImageIcon className="w-3.5 h-3.5" />
                {t("vipImageUrl")}
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Published toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPublished(!published)}
                className="relative w-12 h-6 rounded-full transition-colors"
                style={{
                  background: published ? "rgb(34,197,94)" : "var(--bg-secondary)",
                  border: `1px solid ${published ? "rgb(34,197,94)" : "var(--border)"}`,
                }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                  style={{
                    transform: published ? "translateX(24px)" : "translateX(2px)",
                  }}
                />
              </button>
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                {published ? t("vipPublished") : t("vipDraft")}
              </span>
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim() || !content.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
                }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingPost ? t("vipUpdate") : t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Crown className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(245,158,11,0.3)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("vipNoPublication")}
          </p>
          <button
            onClick={openNewForm}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
            }}
          >
            {t("vipCreateFirst")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const tc = typeColor(post.type);
            return (
              <div
                key={post.id}
                className="glass rounded-2xl p-5 transition hover:border-amber-500/20"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: tc.bg }}
                    >
                      {typeIcon(post.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {post.title}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: tc.bg,
                            color: tc.text,
                            border: `1px solid ${tc.border}`,
                          }}
                        >
                          {t(typeLabelKey(post.type))}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            post.published
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                          }`}
                        >
                          {post.published ? t("vipPublished") : t("vipDraft")}
                        </span>
                      </div>
                      <p
                        className="text-xs mt-1 line-clamp-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {post.content.slice(0, 150)}
                        {post.content.length > 150 ? "..." : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                          {formatDate(post.createdAt)}
                        </span>
                        {post.scriptCode && (
                          <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgb(168,85,247)" }}>
                            <Code className="w-3 h-3" />
                            {t("vipCodeIncluded")}
                          </span>
                        )}
                        {post.imageUrl && (
                          <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgb(59,130,246)" }}>
                            <ImageIcon className="w-3 h-3" />
                            Image
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePublished(post)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-80"
                      style={{ background: "var(--bg-hover)" }}
                      title={post.published ? t("vipUnpublish") : t("vipPublish")}
                    >
                      {post.published ? (
                        <EyeOff className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      ) : (
                        <Eye className="w-4 h-4" style={{ color: "rgb(34,197,94)" }} />
                      )}
                    </button>
                    <button
                      onClick={() => openEditForm(post)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-80"
                      style={{ background: "var(--bg-hover)" }}
                      title={t("edit")}
                    >
                      <Edit3 className="w-4 h-4" style={{ color: "rgb(59,130,246)" }} />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deleting === post.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-80 disabled:opacity-50"
                      style={{ background: "var(--bg-hover)" }}
                      title={t("delete")}
                    >
                      {deleting === post.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
                      ) : (
                        <Trash2 className="w-4 h-4" style={{ color: "rgb(239,68,68)" }} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
