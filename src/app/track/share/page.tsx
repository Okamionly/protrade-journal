"use client";

import { useState, Suspense } from "react";
import {
  BarChart3,
  Share2,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

/* ─── Share Content (needs Suspense boundary for useSearchParams) ─── */
function ShareContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get("u");

  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!username) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white mb-1">Profil introuvable</h1>
          <p className="text-sm text-gray-500">Aucun utilisateur spécifié.</p>
        </div>
      </div>
    );
  }

  const initials = username
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 -z-10" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-[120px] -z-10" />

      <div className="max-w-2xl mx-auto px-4 pt-10 pb-16">
        {/* Share Card */}
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-gray-800/60 shadow-2xl">
          {/* Header gradient bar */}
          <div className="h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />

          <div className="p-8 text-center">
            {/* Branding */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                MarketPhase
              </h1>
              <p className="text-xs text-gray-500 mt-1">Track Record Public</p>
            </div>

            {/* Avatar + Name */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/20 mb-3">
                {initials}
              </div>
              <h2 className="text-xl font-bold text-white">{username}</h2>
            </div>

            {/* CTA: View full profile */}
            <a
              href={`/track/${encodeURIComponent(username)}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 shadow-lg shadow-cyan-500/20 mb-8"
              style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
            >
              <BarChart3 className="w-4 h-4" />
              Voir le track record complet
            </a>

            {/* Share section */}
            <div className="pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs text-gray-500 mb-3">Partager ce profil</p>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: copied ? "#10b981" : "#9ca3af",
                }}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Lien copié !
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Copier le lien
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-3 text-center" style={{ background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <p className="text-[10px] text-gray-600">
              MarketPhase — Journal de trading professionnel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page Export ────────────────────────────────────── */
export default function ShareProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      }
    >
      <ShareContent />
    </Suspense>
  );
}
