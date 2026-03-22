"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Crown,
  Zap,
  TrendingUp,
  BarChart3,
  Check,
  CheckCircle,
  FileText,
  Calendar,
  Loader2,
  X,
  Code,
  Globe,
  ArrowRight,
  Crosshair,
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

/* ─── Features list for pricing ─── */
const features = [
  {
    icon: Code,
    text: "1 à 2 indicateurs exclusifs par mois (Pine Script, copier-coller)",
  },
  {
    icon: BarChart3,
    text: "Analyses macro complètes (FOMC, DXY, US10Y, Géopolitique)",
  },
  {
    icon: TrendingUp,
    text: "Analyses Options & Futures (Dark Pool, GEX, Greeks)",
  },
  {
    icon: Calendar,
    text: "Calendrier économique détaillé avec impact",
  },
  {
    icon: FileText,
    text: "Tableaux de niveaux GPS (supports/résistances)",
  },
  {
    icon: Zap,
    text: "Scénarios de trading avec probabilités",
  },
];

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
  const [posts, setPosts] = useState<VipPost[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          if (data.role === "ADMIN" || data.role === "VIP") {
            setIsVip(true);
          }
        }
      })
      .catch(() => { setError("Impossible de vérifier votre abonnement."); });
  }, []);

  useEffect(() => {
    fetch("/api/vip/posts")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPosts(data))
      .catch(() => { setError("Impossible de charger les contenus VIP."); })
      .finally(() => setPostsLoading(false));
  }, []);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  // Derive data
  const latestIndicator = posts.find((p) => p.type === "indicator") || null;
  const latestAnalysis =
    posts.find(
      (p) =>
        p.type === "macro" || p.type === "futures" || p.type === "options"
    ) || null;
  const indicatorCount = posts.filter((p) => p.type === "indicator").length;
  const analysisCount = posts.filter((p) => p.type !== "indicator").length;

  return (
    <div className="min-h-screen pb-20">
      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-4 sm:mx-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}
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
              Prenez un avantage sur le marché
            </h1>
            <p
              className="text-sm sm:text-base"
              style={{ color: "var(--text-secondary, #9ca3af)" }}
            >
              Indicateurs exclusifs, analyses macro et scénarios de trading — le tout livré chaque semaine pour des décisions plus rentables
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
                  Débloquer l&apos;accès VIP — 9€/mois
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

      {/* ═══ Preview Cards Grid ═══ */}
      {!postsLoading && (
        <div className="mx-4 mt-8 sm:mx-6 sm:mt-10 grid gap-6 md:grid-cols-2">
          {/* ── Indicateurs Card ── */}
          <Link
            href="/vip/indicateurs"
            className="glass relative rounded-2xl overflow-hidden group transition-all hover:scale-[1.01]"
            style={{
              border: "1px solid rgba(168,85,247,0.15)",
              background: "var(--bg-secondary, rgba(255,255,255,0.03))",
            }}
          >
            {/* Card illustration */}
            <div
              className="relative w-full"
              style={{
                height: 180,
                background:
                  "linear-gradient(135deg, #0f0a1e 0%, #1a0e2e 40%, #0d1117 100%)",
              }}
            >
              {latestIndicator?.imageUrl ? (
                <>
                  <img
                    src={latestIndicator.imageUrl}
                    alt={latestIndicator.title}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)",
                    }}
                  />
                </>
              ) : (
                <>
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
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 800 180"
                    preserveAspectRatio="none"
                  >
                    {[
                      20, 35, 50, 45, 30, 15, -10, -25, -40, -55, -45, -30,
                      -15, 10, 25, 45, 60, 70, 65, 50, 35, 20, 5, -15,
                    ].map((v, i) => (
                      <rect
                        key={i}
                        x={i * 34}
                        y={v > 0 ? 90 - v : 90}
                        width="24"
                        height={Math.abs(v)}
                        rx="3"
                        fill={
                          v > 0
                            ? "rgba(34,197,94,0.3)"
                            : "rgba(239,68,68,0.3)"
                        }
                      />
                    ))}
                  </svg>
                  <div
                    className="absolute top-1/3 left-1/3 w-40 h-40 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)",
                    }}
                  />
                </>
              )}

              {/* Overlay badge */}
              <div className="absolute top-4 left-4">
                <span
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase"
                  style={{
                    background: "rgba(168,85,247,0.2)",
                    color: "rgb(168,85,247)",
                    border: "1px solid rgba(168,85,247,0.3)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Pine Script
                </span>
              </div>

              {/* Count badge */}
              <div className="absolute top-4 right-4">
                <span
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    color: "rgba(255,255,255,0.8)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {indicatorCount} indicateur{indicatorCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Card body */}
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(168,85,247,0.15)" }}
                >
                  <Crosshair
                    className="w-5 h-5"
                    style={{ color: "rgb(168,85,247)" }}
                  />
                </div>
                <div>
                  <h2
                    className="text-base font-bold"
                    style={{ color: "var(--text-primary, #e5e7eb)" }}
                  >
                    Indicateurs
                  </h2>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-secondary, #9ca3af)" }}
                  >
                    Indicateurs TradingView exclusifs
                  </p>
                </div>
              </div>

              {latestIndicator && (
                <div
                  className="rounded-xl p-3 mb-3"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border:
                      "1px solid var(--border, rgba(255,255,255,0.06))",
                  }}
                >
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-primary, #e5e7eb)" }}
                  >
                    {latestIndicator.title}
                  </p>
                  <p
                    className="text-[11px] font-mono mt-0.5"
                    style={{ color: "var(--text-secondary, #9ca3af)" }}
                  >
                    {formatDate(latestIndicator.createdAt)}
                  </p>
                </div>
              )}

              <div
                className="flex items-center gap-2 text-xs font-medium transition group-hover:gap-3"
                style={{ color: "rgb(168,85,247)" }}
              >
                Voir tous les indicateurs
                <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* ── Analyses Macro Card ── */}
          <Link
            href="/vip/analyses"
            className="glass relative rounded-2xl overflow-hidden group transition-all hover:scale-[1.01]"
            style={{
              border: "1px solid rgba(59,130,246,0.15)",
              background: "var(--bg-secondary, rgba(255,255,255,0.03))",
            }}
          >
            {/* Card illustration */}
            <div
              className="relative w-full flex items-center justify-center"
              style={{
                height: 180,
                background:
                  "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,58,138,0.3) 40%, rgba(15,23,42,0.95) 100%)",
              }}
            >
              {/* Globe animation background */}
              <svg
                className="absolute inset-0 w-full h-full opacity-10"
                viewBox="0 0 800 180"
              >
                <circle
                  cx="400"
                  cy="90"
                  r="60"
                  stroke="#3b82f6"
                  strokeWidth="0.5"
                  fill="none"
                />
                <circle
                  cx="400"
                  cy="90"
                  r="40"
                  stroke="#3b82f6"
                  strokeWidth="0.5"
                  fill="none"
                />
                <circle
                  cx="400"
                  cy="90"
                  r="80"
                  stroke="#3b82f6"
                  strokeWidth="0.3"
                  fill="none"
                />
                <line
                  x1="320"
                  y1="90"
                  x2="480"
                  y2="90"
                  stroke="#3b82f6"
                  strokeWidth="0.5"
                />
                <line
                  x1="400"
                  y1="10"
                  x2="400"
                  y2="170"
                  stroke="#3b82f6"
                  strokeWidth="0.5"
                />
                <ellipse
                  cx="400"
                  cy="90"
                  rx="60"
                  ry="30"
                  stroke="#3b82f6"
                  strokeWidth="0.3"
                  fill="none"
                />
              </svg>
              <div
                className="absolute top-1/3 right-1/3 w-40 h-40 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
                }}
              />

              {/* Overlay badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase"
                  style={{
                    background: "rgba(59,130,246,0.2)",
                    color: "rgb(59,130,246)",
                    border: "1px solid rgba(59,130,246,0.3)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Macro
                </span>
                <span
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase"
                  style={{
                    background: "rgba(234,88,12,0.2)",
                    color: "rgb(234,88,12)",
                    border: "1px solid rgba(234,88,12,0.3)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Futures
                </span>
              </div>

              <div className="absolute top-4 right-4">
                <span
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    color: "rgba(255,255,255,0.8)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {analysisCount} analyse{analysisCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Card body */}
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(59,130,246,0.15)" }}
                >
                  <Globe
                    className="w-5 h-5"
                    style={{ color: "rgb(59,130,246)" }}
                  />
                </div>
                <div>
                  <h2
                    className="text-base font-bold"
                    style={{ color: "var(--text-primary, #e5e7eb)" }}
                  >
                    Analyses Macro
                  </h2>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-secondary, #9ca3af)" }}
                  >
                    FOMC, Dark Pool, Greeks, Options Flow
                  </p>
                </div>
              </div>

              {latestAnalysis && (
                <div
                  className="rounded-xl p-3 mb-3"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border:
                      "1px solid var(--border, rgba(255,255,255,0.06))",
                  }}
                >
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-primary, #e5e7eb)" }}
                  >
                    {latestAnalysis.title}
                  </p>
                  <p
                    className="text-[11px] font-mono mt-0.5"
                    style={{ color: "var(--text-secondary, #9ca3af)" }}
                  >
                    {formatDate(latestAnalysis.createdAt)}
                  </p>
                </div>
              )}

              <div
                className="flex items-center gap-2 text-xs font-medium transition group-hover:gap-3"
                style={{ color: "rgb(59,130,246)" }}
              >
                Voir toutes les analyses
                <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ═══ Abonnement (non-VIP only) ═══ */}
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
                  9&euro;
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
                    Rejoindre le club VIP maintenant
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
