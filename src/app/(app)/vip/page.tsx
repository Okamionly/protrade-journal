"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Crown,
  Lock,
  Zap,
  TrendingUp,
  BarChart3,
  Activity,
  Shield,
  Star,
  Check,
  CheckCircle,
  FileText,
  Calendar,
  ChevronRight,
  Loader2,
  X,
  Code,
  ArrowLeft,
} from "lucide-react";

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

const features = [
  "1 a 2 indicateurs exclusifs par mois (RSI avance, Volume Profile, Order Flow...)",
  "Analyses Macro completes (economie, taux, inflation)",
  "Analyses Options & Futures detaillees",
  "Signaux de trading bases sur l'analyse institutionnelle",
  "Acces au groupe VIP prive",
  "Support prioritaire & Q&A en direct",
];

const testimonials = [
  {
    name: "Thomas L.",
    role: "Day Trader Forex",
    text: "Depuis que j'utilise les indicateurs VIP, mon winrate est pass\u00e9 de 52% \u00e0 67%. Le Volume Profile est un game changer.",
    rating: 5,
  },
  {
    name: "Sophie M.",
    role: "Swing Trader Actions",
    text: "Les analyses macro m'ont permis de mieux comprendre les mouvements de march\u00e9. Le Smart Money Detector est incroyable.",
    rating: 5,
  },
  {
    name: "Karim B.",
    role: "Scalper Indices",
    text: "L'Order Flow m'a donn\u00e9 un avantage que je n'avais jamais eu. L'investissement est rentabilis\u00e9 en quelques jours.",
    rating: 5,
  },
];

const typeLabel = (type: string) => {
  switch (type) {
    case "indicator": return "Indicateur";
    case "macro": return "Analyse Macro";
    case "options": return "Analyse Options";
    case "futures": return "Analyse Futures";
    default: return type;
  }
};

function LockedOverlay() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10"
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
      <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
        S&apos;abonner pour acc&eacute;der
      </span>
    </div>
  );
}

function PostDetail({
  post,
  onClose,
}: {
  post: VipPost;
  onClose: () => void;
}) {
  return (
    <div
      className="glass rounded-2xl overflow-hidden"
      style={{
        border: "1px solid var(--border, rgba(255,255,255,0.08))",
        background: "var(--bg-secondary, rgba(255,255,255,0.03))",
      }}
    >
      <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-80"
              style={{ background: "var(--bg-hover, rgba(255,255,255,0.05))" }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: "var(--text-muted, #9ca3af)" }} />
            </button>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                {post.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  {new Date(post.createdAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  &mdash; {typeLabel(post.type)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Content as paragraphs */}
        <div className="space-y-3">
          {post.content?.split("\n").filter(Boolean).map((para, i) => (
            <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-primary, #e5e7eb)" }}>
              {para}
            </p>
          ))}
        </div>

        {/* Image */}
        {post.imageUrl && (
          <div className="rounded-xl overflow-hidden">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full object-cover rounded-xl"
              style={{ maxHeight: 400 }}
            />
          </div>
        )}

        {/* Script Code */}
        {post.scriptCode && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-4 h-4" style={{ color: "rgb(168,85,247)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                Code / Pine Script
              </span>
            </div>
            <pre
              className="rounded-xl p-4 text-xs font-mono overflow-x-auto"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                color: "rgb(168,85,247)",
              }}
            >
              {post.scriptCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VipPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" style={{color: "var(--text-muted)"}} /></div>}>
      <VipPage />
    </Suspense>
  );
}

function VipPage() {
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [posts, setPosts] = useState<VipPost[]>([]);
  const [detailPost, setDetailPost] = useState<VipPost | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
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

  async function handleViewPost(post: VipPost) {
    if (!isVip) return;
    if (post.content) {
      setDetailPost(post);
      return;
    }
    try {
      const res = await fetch(`/api/vip/posts/${post.id}`);
      if (res.ok) {
        const fullPost = await res.json();
        setDetailPost(fullPost);
      }
    } catch {
      // silently fail
    }
  }

  async function handleSubscribe() {
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
  }

  // Organize posts by type
  const indicatorPosts = posts.filter((p) => p.type === "indicator");
  const macroPosts = posts.filter((p) => p.type === "macro");
  const optionsFuturesPosts = posts.filter(
    (p) => p.type === "options" || p.type === "futures"
  );

  // Featured indicator = most recent indicator post
  const featuredIndicator = indicatorPosts[0] || null;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  // If viewing a detail post
  if (detailPost) {
    return (
      <div className="min-h-screen pb-20 mx-4 mt-4 sm:mx-6 sm:mt-6">
        <PostDetail post={detailPost} onClose={() => setDetailPost(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Success Banner after Stripe payment */}
      {showSuccess && (
        <div
          className="mx-4 mt-4 sm:mx-6 p-4 rounded-xl flex items-center justify-between gap-3"
          style={{
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "rgb(34,197,94)" }} />
            <span className="text-sm font-medium" style={{ color: "rgb(34,197,94)" }}>
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

      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-2xl mx-4 mt-4 sm:mx-6 sm:mt-6 p-8 sm:p-12"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(168,85,247,0.15), rgba(59,130,246,0.1))",
          border: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)",
            transform: "translate(-20%, 40%)",
          }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
              boxShadow: "0 8px 32px rgba(245,158,11,0.3)",
            }}
          >
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text-primary, #e5e7eb)" }}>
              MarketPhase VIP &mdash; Analyses Premium
            </h1>
            <p className="text-sm sm:text-base" style={{ color: "var(--text-secondary, #9ca3af)" }}>
              Recevez chaque mois des indicateurs exclusifs et des analyses macro compl&egrave;tes
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
              <Crown className="w-5 h-5" style={{ color: "rgb(245,158,11)" }} />
              <div>
                <div className="text-sm font-bold" style={{ color: "rgb(245,158,11)" }}>
                  Membre VIP
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
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
                background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
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

      {/* Pricing Card (shown when not subscribed) */}
      {!isVip && (
        <div className="mx-4 mt-6 sm:mx-6 sm:mt-8 flex justify-center">
          <div
            className="glass max-w-lg w-full rounded-2xl overflow-hidden"
            style={{
              border: "1px solid rgba(245,158,11,0.2)",
              background: "var(--bg-secondary, rgba(255,255,255,0.03))",
            }}
          >
            <div
              className="p-6 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(168,85,247,0.05))",
                borderBottom: "1px solid rgba(245,158,11,0.1)",
              }}
            >
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-4xl font-bold mono" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                  9.99&euro;
                </span>
                <span className="text-sm" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  /mois
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                Sans engagement &mdash; Annulez &agrave; tout moment
              </p>
            </div>
            <div className="p-6 space-y-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(34,197,94,0.15)" }}
                  >
                    <Check className="w-3 h-3" style={{ color: "rgb(34,197,94)" }} />
                  </div>
                  <span className="text-sm" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                    {f}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, rgb(245,158,11), rgb(234,88,12))",
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
            </div>
          </div>
        </div>
      )}

      {/* Loading state for posts */}
      {postsLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-muted, #9ca3af)" }} />
        </div>
      )}

      {/* Featured Indicator of the Month */}
      {!postsLoading && featuredIndicator && (
        <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
              Indicateur du Mois
            </h2>
          </div>

          <div
            className="glass relative rounded-2xl overflow-hidden cursor-pointer transition hover:border-purple-500/30"
            style={{
              border: "1px solid var(--border, rgba(255,255,255,0.08))",
              background: "var(--bg-secondary, rgba(255,255,255,0.03))",
            }}
            onClick={() => handleViewPost(featuredIndicator)}
          >
            <div className="p-5 pb-3">
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(168,85,247,0.15)" }}
                >
                  <Shield className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                    {featuredIndicator.title}
                  </h3>
                  {isVip && featuredIndicator.content && (
                    <p className="text-[11px] line-clamp-2" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                      {featuredIndicator.content.slice(0, 200)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Script code preview for VIP */}
            {isVip && featuredIndicator.scriptCode && (
              <div className="px-5 pb-2">
                <pre
                  className="rounded-lg p-3 text-[10px] font-mono overflow-hidden max-h-32"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(168,85,247,0.15)",
                    color: "rgb(168,85,247)",
                  }}
                >
                  {featuredIndicator.scriptCode.slice(0, 300)}
                  {(featuredIndicator.scriptCode?.length || 0) > 300 ? "\n..." : ""}
                </pre>
              </div>
            )}
            <div className="px-5 pb-4 flex items-center justify-between">
              <span className="text-[10px] mono" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                Publi&eacute; le {formatDate(featuredIndicator.createdAt)}
              </span>
              {isVip && (
                <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary, #9ca3af)" }} />
              )}
            </div>
            {!isVip && <LockedOverlay />}
          </div>
        </div>
      )}

      {/* Indicateurs Section */}
      {!postsLoading && (
        <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5" style={{ color: "rgb(168,85,247)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
              Indicateurs
            </h2>
          </div>

          {indicatorPosts.length === 0 ? (
            <div
              className="glass rounded-2xl p-8 text-center"
              style={{
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
              }}
            >
              <TrendingUp className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(168,85,247,0.3)" }} />
              <p className="text-sm" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                Aucune publication
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {indicatorPosts.map((post) => (
                <div
                  key={post.id}
                  className="glass relative rounded-2xl overflow-hidden transition hover:border-purple-500/20"
                  style={{
                    border: "1px solid var(--border, rgba(255,255,255,0.08))",
                    background: "var(--bg-secondary, rgba(255,255,255,0.03))",
                    cursor: isVip ? "pointer" : "default",
                  }}
                  onClick={() => handleViewPost(post)}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(168,85,247,0.15)" }}
                      >
                        <TrendingUp className="w-4 h-4" style={{ color: "rgb(168,85,247)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold truncate" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                          {post.title}
                        </h3>
                        <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                          {formatDate(post.createdAt)}
                        </span>
                      </div>
                    </div>
                    {/* Script preview for VIP */}
                    {isVip && post.scriptCode && (
                      <pre
                        className="rounded-lg p-2 text-[9px] font-mono overflow-hidden max-h-20 mt-2"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid rgba(168,85,247,0.1)",
                          color: "rgba(168,85,247,0.8)",
                        }}
                      >
                        {post.scriptCode.slice(0, 150)}...
                      </pre>
                    )}
                  </div>
                  {!isVip && <LockedOverlay />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analyses Macro Section */}
      {!postsLoading && (
        <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-5 h-5" style={{ color: "rgb(59,130,246)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
              Analyses Macro
            </h2>
          </div>

          {macroPosts.length === 0 ? (
            <div
              className="glass rounded-2xl p-8 text-center"
              style={{
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
              }}
            >
              <BarChart3 className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(59,130,246,0.3)" }} />
              <p className="text-sm" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                Aucune publication
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {macroPosts.map((post) => (
                <div
                  key={post.id}
                  className="glass relative rounded-2xl overflow-hidden transition hover:border-blue-500/20"
                  style={{
                    border: "1px solid var(--border, rgba(255,255,255,0.08))",
                    background: "var(--bg-secondary, rgba(255,255,255,0.03))",
                    cursor: isVip ? "pointer" : "default",
                  }}
                  onClick={() => handleViewPost(post)}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(59,130,246,0.15)" }}
                      >
                        <BarChart3 className="w-5 h-5" style={{ color: "rgb(59,130,246)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                            {formatDate(post.createdAt)}
                          </span>
                          {isVip && post.content && (
                            <span className="text-[11px] truncate" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                              &mdash; {post.content.slice(0, 80)}...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isVip && (
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-secondary, #9ca3af)" }} />
                    )}
                  </div>
                  {!isVip && <LockedOverlay />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analyses Options & Futures Section */}
      {!postsLoading && (
        <div className="mx-4 mt-8 sm:mx-6 sm:mt-10">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5" style={{ color: "rgb(234,88,12)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
              Analyses Options &amp; Futures
            </h2>
          </div>

          {optionsFuturesPosts.length === 0 ? (
            <div
              className="glass rounded-2xl p-8 text-center"
              style={{
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
              }}
            >
              <Activity className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(234,88,12,0.3)" }} />
              <p className="text-sm" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                Aucune publication
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {optionsFuturesPosts.map((post) => (
                <div
                  key={post.id}
                  className="glass relative rounded-2xl overflow-hidden transition hover:border-orange-500/20"
                  style={{
                    border: "1px solid var(--border, rgba(255,255,255,0.08))",
                    background: "var(--bg-secondary, rgba(255,255,255,0.03))",
                    cursor: isVip ? "pointer" : "default",
                  }}
                  onClick={() => handleViewPost(post)}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(234,88,12,0.15)" }}
                      >
                        <Activity className="w-5 h-5" style={{ color: "rgb(234,88,12)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                            {formatDate(post.createdAt)}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{
                              background: "rgba(234,88,12,0.15)",
                              color: "rgb(234,88,12)",
                            }}
                          >
                            {typeLabel(post.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isVip && (
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-secondary, #9ca3af)" }} />
                    )}
                  </div>
                  {!isVip && <LockedOverlay />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Testimonials */}
      <div className="mx-4 mt-10 sm:mx-6 sm:mt-12">
        <div className="flex items-center gap-3 mb-6">
          <Star className="w-5 h-5" style={{ color: "rgb(245,158,11)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
            Ce que disent nos membres VIP
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-5"
              style={{
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "var(--bg-secondary, rgba(255,255,255,0.03))",
              }}
            >
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-current" style={{ color: "rgb(245,158,11)" }} />
                ))}
              </div>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary, #e5e7eb)" }}>
                  {t.name}
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-secondary, #9ca3af)" }}>
                  {t.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stripe payment note */}
      <div className="mx-4 mt-10 sm:mx-6 text-center">
        <p className="text-xs" style={{ color: "var(--text-secondary, #9ca3af)" }}>
          Paiement s&eacute;curis&eacute; par Stripe. Annulation possible &agrave; tout moment.
        </p>
      </div>
    </div>
  );
}
