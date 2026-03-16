"use client";

import { useState, useEffect } from "react";
import { X, ArrowUp, ArrowDown, Upload, Plus } from "lucide-react";
import { Trade } from "@/hooks/useTrades";
import { useStrategies } from "@/hooks/useStrategies";

interface TradeFormProps {
  onSubmit: (trade: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
  editTrade?: Trade | null;
}

const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "USD/CHF", "AUD/USD", "NZD/USD", "USD/CAD", "EUR/GBP", "EUR/JPY", "GBP/JPY"];
const FALLBACK_STRATEGIES = ["Breakout", "Retracement", "Support/Resistance", "Trend Following", "Scalping"];
const EMOTIONS = ["Confiant", "Peur", "Gourmand", "Impatient", "Neutre"];

export function TradeForm({ onSubmit, onClose, editTrade }: TradeFormProps) {
  const { strategies } = useStrategies();
  const [direction, setDirection] = useState(editTrade?.direction || "LONG");
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [showNewStrategy, setShowNewStrategy] = useState(false);
  const [newStratName, setNewStratName] = useState("");

  const strategyNames = strategies.length > 0
    ? strategies.map((s) => s.name)
    : FALLBACK_STRATEGIES;

  useEffect(() => {
    if (editTrade?.screenshots?.length) {
      setScreenshots(editTrade.screenshots.map((s) => s.url));
    }
  }, [editTrade]);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setScreenshots((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateStrategy = async () => {
    if (!newStratName.trim()) return;
    try {
      await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStratName.trim() }),
      });
      setNewStratName("");
      setShowNewStrategy(false);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const trade = {
      date: form.get("date"),
      asset: form.get("asset"),
      direction,
      strategy: form.get("strategy"),
      entry: parseFloat(form.get("entry") as string),
      exit: parseFloat(form.get("exit") as string) || null,
      sl: parseFloat(form.get("sl") as string),
      tp: parseFloat(form.get("tp") as string),
      lots: parseFloat(form.get("lots") as string),
      result: parseFloat(form.get("result") as string) || 0,
      commission: parseFloat(form.get("commission") as string) || 0,
      swap: parseFloat(form.get("swap") as string) || 0,
      maePrice: parseFloat(form.get("maePrice") as string) || null,
      mfePrice: parseFloat(form.get("mfePrice") as string) || null,
      emotion: form.get("emotion"),
      setup: form.get("setup"),
      tags: form.get("tags"),
      screenshots,
    };

    const ok = await onSubmit(trade);
    setLoading(false);
    if (ok) onClose();
  };

  const formatDateTimeLocal = (date: string) => {
    return new Date(date).toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {editTrade ? "Modifier le Trade" : "Nouveau Trade"}
          </h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }} className="hover:opacity-80">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Date & Heure</label>
              <input
                type="datetime-local"
                name="date"
                defaultValue={editTrade ? formatDateTimeLocal(editTrade.date) : new Date().toISOString().slice(0, 16)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Actif</label>
              <select name="asset" defaultValue={editTrade?.asset || ASSETS[0]} className="input-field">
                {ASSETS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Direction</label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDirection("LONG")}
                  className={`flex-1 py-2 rounded-lg border transition flex items-center justify-center ${
                    direction === "LONG"
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  <ArrowUp className="w-4 h-4 mr-2" />
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("SHORT")}
                  className={`flex-1 py-2 rounded-lg border transition flex items-center justify-center ${
                    direction === "SHORT"
                      ? "border-rose-500 bg-rose-500/20 text-rose-400 ring-2 ring-rose-500"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  }`}
                >
                  <ArrowDown className="w-4 h-4 mr-2" />
                  SHORT
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Stratégie</label>
              <div className="flex gap-2">
                <select name="strategy" defaultValue={editTrade?.strategy || strategyNames[0]} className="input-field flex-1">
                  {strategyNames.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewStrategy(!showNewStrategy)}
                  className="p-2 rounded-xl hover:bg-blue-500/10 transition"
                  style={{ border: "1px solid var(--border-input)", color: "var(--text-muted)" }}
                  title="Nouvelle stratégie"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {showNewStrategy && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={newStratName}
                    onChange={(e) => setNewStratName(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Nom de la stratégie"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateStrategy())}
                  />
                  <button type="button" onClick={handleCreateStrategy} className="btn-primary text-white px-3 py-1 rounded-lg text-sm">
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Prix d&apos;entrée</label>
              <input type="number" step="0.00001" name="entry" defaultValue={editTrade?.entry} className="input-field mono" required />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Stop Loss</label>
              <input type="number" step="0.00001" name="sl" defaultValue={editTrade?.sl} className="input-field mono" required />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Take Profit</label>
              <input type="number" step="0.00001" name="tp" defaultValue={editTrade?.tp} className="input-field mono" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Taille (Lots)</label>
              <input type="number" step="0.01" name="lots" defaultValue={editTrade?.lots} className="input-field mono" required />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Prix de sortie</label>
              <input type="number" step="0.00001" name="exit" defaultValue={editTrade?.exit ?? undefined} className="input-field mono" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Résultat (€)</label>
              <input type="number" step="0.01" name="result" defaultValue={editTrade?.result} className="input-field mono" required />
            </div>
          </div>

          {/* Commission, Swap, MAE, MFE */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Commission (€)</label>
              <input type="number" step="0.01" name="commission" defaultValue={0} className="input-field mono" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Swap (€)</label>
              <input type="number" step="0.01" name="swap" defaultValue={0} className="input-field mono" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>MAE (prix)</label>
              <input type="number" step="0.00001" name="maePrice" className="input-field mono" placeholder="Optionnel" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>MFE (prix)</label>
              <input type="number" step="0.00001" name="mfePrice" className="input-field mono" placeholder="Optionnel" />
            </div>
          </div>

          <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Captures d&apos;écran du Setup</label>
            <div
              className={`screenshot-preview rounded-xl p-8 text-center cursor-pointer ${screenshots.length > 0 ? "has-image" : ""}`}
              onClick={() => document.getElementById("screenshotInput")?.click()}
            >
              <input type="file" id="screenshotInput" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} />
              {screenshots.length === 0 ? (
                <div>
                  <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Cliquez pour ajouter des screenshots</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>JPG, PNG, WEBP (max 5MB)</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {screenshots.map((src, i) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScreenshots((prev) => prev.filter((_, idx) => idx !== i));
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Setup / Description</label>
            <textarea name="setup" rows={3} defaultValue={editTrade?.setup || ""} className="input-field" placeholder="Décrivez votre analyse..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Émotion / Psychologie</label>
              <select name="emotion" defaultValue={editTrade?.emotion || EMOTIONS[0]} className="input-field">
                {EMOTIONS.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Tags</label>
              <input type="text" name="tags" defaultValue={editTrade?.tags || ""} className="input-field" placeholder="scalp, tendance, news..." />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg transition" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-lg btn-primary text-white font-medium disabled:opacity-50">
              {loading ? "Enregistrement..." : editTrade ? "Sauvegarder les modifications" : "Enregistrer le Trade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
