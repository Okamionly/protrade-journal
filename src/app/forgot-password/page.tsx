"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Une erreur est survenue");
      }

      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="glass rounded-2xl w-full max-w-md p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-icon.png" alt="MarketPhase" width={80} height={80} className="w-20 h-20 rounded-2xl mb-4" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            MarketPhase
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>R&eacute;initialisation du mot de passe</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mb-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
              Si un compte existe avec cet email, vous recevrez un lien de r&eacute;initialisation.
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mt-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour &agrave; la connexion
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field w-full pl-10 pr-4 py-3"
                    placeholder="email@exemple.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg btn-primary text-white font-medium disabled:opacity-50"
              >
                {loading ? "Envoi en cours..." : "Envoyer le lien de r\u00e9initialisation"}
              </button>
            </form>

            <p className="text-center mt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour &agrave; la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
