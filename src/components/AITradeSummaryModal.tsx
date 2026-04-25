"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X, Brain, Sparkles, AlertTriangle, CheckCircle2, AlertCircle, ImageIcon,
  Globe, ListChecks, Flag, Loader2, RefreshCw,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────── */
/*  Types (mirror /api/ai/trade-summary response)                          */
/* ─────────────────────────────────────────────────────────────────────── */

interface Observation {
  type: "positive" | "warning" | "negative";
  text: string;
  evidence?: string;
}

interface AISummary {
  executive_summary: string;
  score: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  observations: Observation[];
  chart_analysis: string | null;
  macro_context: string;
  suggestions: string[];
  risk_flags: string[];
  meta: {
    model: string;
    screenshotsAnalyzed: number;
    macroPointsUsed: number;
    cached: boolean;
    tokensUsed: { input: number; output: number; cache_read?: number; cache_creation?: number };
  };
}

interface ApiError {
  error: string;
  code?: string;
  detail?: string;
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Modal                                                                  */
/* ─────────────────────────────────────────────────────────────────────── */

export function AITradeSummaryModal({
  tradeId,
  tradeAsset,
  onClose,
}: {
  tradeId: string;
  tradeAsset: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [includeScreenshots, setIncludeScreenshots] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/ai/trade-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId, includeScreenshots }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json as ApiError);
      } else {
        setData(json as AISummary);
      }
    } catch (e) {
      setError({ error: e instanceof Error ? e.message : "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  }, [tradeId, includeScreenshots]);

  // ESC closes
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Run once on open
  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl w-full max-w-3xl my-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                Analyse IA
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium border border-purple-500/30 uppercase tracking-wider">
                  Claude Sonnet
                </span>
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {tradeAsset} · {data?.meta.screenshotsAnalyzed ?? 0} screenshot(s) analysé(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void run()}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-[--bg-hover] transition disabled:opacity-50"
              title="Régénérer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[--bg-hover] transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {loading && <LoadingState />}

          {error && (
            <ErrorState error={error} onRetry={() => void run()} />
          )}

          {data && !loading && (
            <>
              {/* Score + Grade + Exec summary */}
              <ScoreCard score={data.score} grade={data.grade} />

              <Section icon={<Sparkles className="w-4 h-4" />} title="Résumé">
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {data.executive_summary}
                </p>
              </Section>

              {data.chart_analysis && (
                <Section icon={<ImageIcon className="w-4 h-4" />} title="Analyse des charts">
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {data.chart_analysis}
                  </p>
                </Section>
              )}

              <Section icon={<Globe className="w-4 h-4" />} title="Contexte macro">
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {data.macro_context}
                </p>
              </Section>

              {data.observations.length > 0 && (
                <Section icon={<ListChecks className="w-4 h-4" />} title={`Observations (${data.observations.length})`}>
                  <ul className="space-y-2">
                    {data.observations.map((o, i) => (
                      <ObservationRow key={i} obs={o} />
                    ))}
                  </ul>
                </Section>
              )}

              {data.risk_flags.length > 0 && (
                <Section icon={<Flag className="w-4 h-4 text-rose-400" />} title="Drapeaux risque">
                  <ul className="space-y-1.5">
                    {data.risk_flags.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg bg-rose-500/8 border border-rose-500/20 text-rose-300"
                      >
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {data.suggestions.length > 0 && (
                <Section icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} title="Actions suggérées">
                  <ul className="space-y-1.5">
                    {data.suggestions.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <MetaFooter meta={data.meta} />
            </>
          )}

          {/* Re-run options */}
          {!loading && data && (
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <input
                  type="checkbox"
                  checked={includeScreenshots}
                  onChange={(e) => setIncludeScreenshots(e.target.checked)}
                  className="accent-purple-500"
                />
                Inclure les screenshots (vision)
              </label>
              <button
                onClick={() => void run()}
                className="px-3 py-1.5 text-xs rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                Régénérer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                         */
/* ─────────────────────────────────────────────────────────────────────── */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: "var(--text-muted)" }}>{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ScoreCard({ score, grade }: { score: number; grade: string }) {
  const color = score >= 80 ? "emerald" : score >= 60 ? "cyan" : score >= 40 ? "amber" : "rose";
  const colorMap: Record<string, { bg: string; border: string; text: string; bar: string }> = {
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", bar: "bg-emerald-500" },
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", bar: "bg-cyan-500" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", bar: "bg-amber-500" },
    rose: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", bar: "bg-rose-500" },
  };
  const c = colorMap[color];

  return (
    <div className={`p-4 rounded-xl border ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Score d&apos;exécution</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold mono ${c.text}`}>{score}</span>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>/100</span>
          </div>
        </div>
        <div className={`text-4xl font-bold mono ${c.text}`}>{grade}</div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
        <div
          className={`h-full ${c.bar} transition-all duration-700`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

function ObservationRow({ obs }: { obs: Observation }) {
  const styles = {
    positive: { bg: "bg-emerald-500/8", border: "border-emerald-500/20", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
    warning: { bg: "bg-amber-500/8", border: "border-amber-500/20", icon: <AlertCircle className="w-4 h-4 text-amber-400" /> },
    negative: { bg: "bg-rose-500/8", border: "border-rose-500/20", icon: <AlertTriangle className="w-4 h-4 text-rose-400" /> },
  };
  const s = styles[obs.type];
  return (
    <li className={`px-3 py-2.5 rounded-lg border ${s.bg} ${s.border}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex-shrink-0">{s.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{obs.text}</p>
          {obs.evidence && (
            <p className="text-[11px] mt-1 mono opacity-60" style={{ color: "var(--text-muted)" }}>
              ↳ {obs.evidence}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function LoadingState() {
  return (
    <div className="py-12 text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-400" />
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        L&apos;IA analyse ton trade…
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        Lecture des screenshots, comparaison historique, contexte macro
      </p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const isMissingKey = error.code === "ANTHROPIC_API_KEY_MISSING";
  return (
    <div className="py-8">
      <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/8">
        <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-rose-300 mb-1">Analyse impossible</p>
          <p style={{ color: "var(--text-secondary)" }}>{error.error}</p>
          {isMissingKey && (
            <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              Configure <code className="mono px-1 rounded bg-[--bg-hover]">ANTHROPIC_API_KEY</code> dans <code className="mono px-1 rounded bg-[--bg-hover]">.env</code> puis relance le serveur.
            </p>
          )}
          {error.detail && (
            <p className="mt-2 text-[11px] mono opacity-60" style={{ color: "var(--text-muted)" }}>
              {error.detail}
            </p>
          )}
          <button
            onClick={onRetry}
            className="mt-3 px-3 py-1.5 text-xs rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaFooter({ meta }: { meta: AISummary["meta"] }) {
  const totalIn = meta.tokensUsed.input + (meta.tokensUsed.cache_read ?? 0) + (meta.tokensUsed.cache_creation ?? 0);
  return (
    <div className="text-[10px] mono opacity-50 pt-2 border-t flex flex-wrap gap-x-4 gap-y-1" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
      <span>{meta.model}</span>
      <span>{meta.screenshotsAnalyzed} screenshots</span>
      <span>{meta.macroPointsUsed} macro pts</span>
      <span>{totalIn} in / {meta.tokensUsed.output} out tok</span>
      {meta.cached && <span className="text-emerald-400">cache hit</span>}
    </div>
  );
}
