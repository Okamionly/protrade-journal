"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { useStrategies } from "@/hooks/useStrategies";
import { useTranslation } from "@/i18n/context";
import { useRouter } from "next/navigation";

const ASSETS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD",
  "USD/CHF", "AUD/USD", "NZD/USD", "USD/CAD", "EUR/GBP",
  "EUR/JPY", "GBP/JPY",
];

const FALLBACK_STRATEGIES = ["Breakout", "Retracement", "Support/Resistance", "Trend Following", "Scalping"];

export function QuickTradeButton() {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState("LONG");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { strategies } = useStrategies();
  const { t } = useTranslation();
  const router = useRouter();

  const strategyNames = strategies.length > 0
    ? strategies.map((s) => s.name)
    : FALLBACK_STRATEGIES;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Delay to avoid immediate close from the button click
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Listen for open-trade-form custom event (dispatched by Ctrl+N)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-trade-form", handler);
    return () => window.removeEventListener("open-trade-form", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const trade = {
      date: new Date().toISOString(),
      asset: form.get("asset"),
      direction,
      strategy: form.get("strategy"),
      entry: parseFloat(form.get("entry") as string),
      exit: null,
      sl: parseFloat(form.get("sl") as string),
      tp: parseFloat(form.get("tp") as string),
      lots: parseFloat(form.get("lots") as string),
      result: 0,
      commission: 0,
      swap: 0,
      emotion: null,
      setup: null,
      tags: "",
      screenshots: [],
    };

    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trade),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          router.refresh();
        }, 600);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-colors";

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-[70] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          open
            ? "rotate-45 bg-red-500/80 hover:bg-red-500"
            : "bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 hover:scale-110"
        }`}
        style={{
          backdropFilter: "blur(12px)",
          boxShadow: open
            ? "0 8px 32px rgba(239,68,68,0.4)"
            : "0 8px 32px rgba(59,130,246,0.4)",
        }}
        title={t("quickTradeTitle") || "Quick Trade"}
      >
        <Plus className="w-7 h-7 text-white transition-transform duration-300" />
      </button>

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed bottom-24 right-6 z-[70] w-80 transition-all duration-300 origin-bottom-right ${
          open
            ? "scale-100 opacity-100 pointer-events-auto translate-y-0"
            : "scale-75 opacity-0 pointer-events-none translate-y-4"
        }`}
      >
        <div
          className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          style={{
            background: "rgba(15, 15, 30, 0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("quickTradeTitle") || "Trade rapide"}
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {/* Symbol */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                {t("symbol") || "Symbole"}
              </label>
              <select name="asset" required className={inputClass} style={{ color: "var(--text-primary)" }}>
                {ASSETS.map((a) => (
                  <option key={a} value={a} style={{ background: "var(--bg-card-solid)" }}>{a}</option>
                ))}
              </select>
            </div>

            {/* Direction */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                {t("direction") || "Direction"}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("LONG")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    direction === "LONG"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                  style={direction !== "LONG" ? { color: "var(--text-muted)" } : {}}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("SHORT")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    direction === "SHORT"
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                  style={direction !== "SHORT" ? { color: "var(--text-muted)" } : {}}
                >
                  Sell
                </button>
              </div>
            </div>

            {/* Entry / SL / TP row */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                  {t("entry") || "Entree"}
                </label>
                <input
                  name="entry"
                  type="number"
                  step="any"
                  required
                  className={inputClass}
                  style={{ color: "var(--text-primary)" }}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                  SL
                </label>
                <input
                  name="sl"
                  type="number"
                  step="any"
                  required
                  className={inputClass}
                  style={{ color: "var(--text-primary)" }}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                  TP
                </label>
                <input
                  name="tp"
                  type="number"
                  step="any"
                  required
                  className={inputClass}
                  style={{ color: "var(--text-primary)" }}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Lots */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                {t("lotSize") || "Taille (Lots)"}
              </label>
              <input
                name="lots"
                type="number"
                step="any"
                required
                className={inputClass}
                style={{ color: "var(--text-primary)" }}
                placeholder="0.01"
              />
            </div>

            {/* Strategy */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                {t("strategy") || "Strategie"}
              </label>
              <select name="strategy" required className={inputClass} style={{ color: "var(--text-primary)" }}>
                {strategyNames.map((s) => (
                  <option key={s} value={s} style={{ background: "var(--bg-card-solid)" }}>{s}</option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || success}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                success
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white shadow-lg hover:shadow-blue-500/25"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("saving") || "Enregistrement..."}
                </span>
              ) : success ? (
                "✓"
              ) : (
                t("quickTradeSubmit") || "Enregistrer le trade"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
