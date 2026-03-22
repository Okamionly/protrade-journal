"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de l'inscription");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (result?.error) {
        setError("Compte créé mais erreur de connexion. Essayez de vous connecter.");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Erreur de connexion");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-[120px]"
          style={{ background: "linear-gradient(135deg, #0ea5e9, #3b82f6)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-[100px]"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #0ea5e9)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-40"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #3b82f6)" }} />
            <Image
              src="/logo-icon.png"
              alt="MarketPhase"
              width={80}
              height={80}
              className="relative w-20 h-20 rounded-2xl drop-shadow-2xl"
            />
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-blue-500 bg-clip-text text-transparent">
            MarketPhase
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted, #9ca3af)" }}>
            Créez votre compte trader
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8" style={{ border: "1px solid var(--border, rgba(255,255,255,0.1))" }}>
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2 animate-shake">
              <div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted, #9ca3af)" }}>
                Nom
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted, #6b7280)" }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field w-full"
                  style={{ paddingLeft: "2.75rem" }}
                  placeholder="Votre nom"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted, #9ca3af)" }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted, #6b7280)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field w-full"
                  style={{ paddingLeft: "2.75rem" }}
                  placeholder="email@exemple.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted, #9ca3af)" }}>
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted, #6b7280)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field w-full"
                  style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
                  placeholder="Min. 6 caractères"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:opacity-70 transition"
                  style={{ color: "var(--text-muted, #6b7280)" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                boxShadow: "0 4px 20px rgba(14, 165, 233, 0.3)",
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  Créer mon compte
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted, #9ca3af)" }}>
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-cyan-400 hover:text-cyan-300 transition">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
