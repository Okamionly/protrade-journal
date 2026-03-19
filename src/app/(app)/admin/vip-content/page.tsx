"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  ArrowLeft,
  Loader2,
  ImageIcon,
} from "lucide-react";

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
  { value: "indicator", label: "Indicateur" },
  { value: "macro", label: "Analyse Macro" },
  { value: "options", label: "Analyse Options" },
  { value: "futures", label: "Analyse Futures" },
];

const typeLabel = (type: string) =>
  TYPE_OPTIONS.find((t) => t.value === type)?.label || type;

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

export default function VipContentPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<VipPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
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

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role) {
          setUserRole(data.role);
          if (data.role !== "ADMIN") {
            router.push("/dashboard");
          }
        }
      })
      .catch(() => router.push("/dashboard"));
  }, [router]);

  useEffect(() => {
    if (userRole === "ADMIN") {
      fetchPosts();
    }
  }, [userRole]);

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
    if (!confirm("Supprimer cette publication ?")) return;
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

  if (userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin")}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition hover:opacity-80"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          </button>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
            }}
          >
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Contenu VIP
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              G&eacute;rer les publications VIP
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
          Nouvelle Publication
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
              {editingPost ? "Modifier la publication" : "Nouvelle publication"}
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
                Titre
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la publication..."
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
                Type
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
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                Contenu
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Contenu de la publication (supporte le markdown basique)..."
                rows={8}
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Script Code */}
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <Code className="w-3.5 h-3.5" />
                Script / Code Pine Script (optionnel)
              </label>
              <textarea
                value={scriptCode}
                onChange={(e) => setScriptCode(e.target.value)}
                placeholder="// Pine Script ou code indicateur..."
                rows={6}
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
                URL Image (optionnel)
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
                {published ? "Publié" : "Brouillon"}
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
                Annuler
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
                {editingPost ? "Mettre à jour" : "Enregistrer"}
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
            Aucune publication VIP pour le moment.
          </p>
          <button
            onClick={openNewForm}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
            }}
          >
            Cr&eacute;er la premi&egrave;re publication
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
                          {typeLabel(post.type)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            post.published
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                          }`}
                        >
                          {post.published ? "Publié" : "Brouillon"}
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
                            Code inclus
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
                      title={post.published ? "Dépublier" : "Publier"}
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
                      title="Modifier"
                    >
                      <Edit3 className="w-4 h-4" style={{ color: "rgb(59,130,246)" }} />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deleting === post.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-80 disabled:opacity-50"
                      style={{ background: "var(--bg-hover)" }}
                      title="Supprimer"
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
