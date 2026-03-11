"use client";

import { useState } from "react";
import { X, ArrowUp, ArrowDown, Upload } from "lucide-react";

interface TradeFormProps {
  onSubmit: (trade: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}

const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD"];
const STRATEGIES = ["Breakout", "Retracement", "Support/Resistance", "Trend Following", "Scalping"];
const EMOTIONS = ["Confiant", "Peur", "Gourmand", "Impatient", "Neutre"];

export function TradeForm({ onSubmit, onClose }: TradeFormProps) {
  const [direction, setDirection] = useState("LONG");
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);

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
      emotion: form.get("emotion"),
      setup: form.get("setup"),
      tags: form.get("tags"),
      screenshots,
    };

    const ok = await onSubmit(trade);
    setLoading(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold">Nouveau Trade</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-current">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date & Heure</label>
              <input
                type="datetime-local"
                name="date"
                defaultValue={new Date().toISOString().slice(0, 16)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Actif</label>
              <select name="asset" className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2">
                {ASSETS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Direction</label>
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
              <label className="block text-sm text-gray-400 mb-1">Stratégie</label>
              <select name="strategy" className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2">
                {STRATEGIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Prix d&apos;entrée</label>
              <input type="number" step="0.00001" name="entry" className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 mono" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Stop Loss</label>
              <input type="number" step="0.00001" name="sl" className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 mono" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Take Profit</label>
              <input type="number" step="0.00001" name="tp" className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 mono" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Taille (Lots)</label>
              <input type="number" step="0.01" name="lots" className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 mono" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Prix de sortie</label>
              <input type="number" step="0.00001" name="exit" className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 mono" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Résultat (€)</label>
              <input type="number" step="0.01" name="result" className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 mono" required />
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <label className="block text-sm text-gray-400 mb-2">Captures d&apos;écran du Setup</label>
            <div
              className={`screenshot-preview rounded-xl p-8 text-center cursor-pointer ${screenshots.length > 0 ? "has-image" : ""}`}
              onClick={() => document.getElementById("screenshotInput")?.click()}
            >
              <input type="file" id="screenshotInput" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} />
              {screenshots.length === 0 ? (
                <div>
                  <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Cliquez pour ajouter des screenshots</p>
                  <p className="text-gray-600 text-xs mt-1">JPG, PNG, WEBP (max 5MB)</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {screenshots.map((src, i) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-gray-600">
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
            <label className="block text-sm text-gray-400 mb-1">Setup / Description</label>
            <textarea name="setup" rows={3} className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2" placeholder="Décrivez votre analyse..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Émotion / Psychologie</label>
              <select name="emotion" className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2">
                {EMOTIONS.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tags</label>
              <input type="text" name="tags" className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2" placeholder="scalp, tendance, news..." />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg border border-gray-600 hover:bg-gray-800 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-lg btn-primary text-white font-medium disabled:opacity-50">
              {loading ? "Enregistrement..." : "Enregistrer le Trade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
