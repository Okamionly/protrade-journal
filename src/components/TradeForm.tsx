"use client";

import { useState, useEffect, useRef } from "react";
import { X, ArrowUp, ArrowDown, Upload, Plus, Save, FolderOpen, Trash2, Pencil } from "lucide-react";
import { Trade } from "@/hooks/useTrades";
import { useStrategies } from "@/hooks/useStrategies";
import { TagPicker } from "@/components/TagPicker";
import { useTranslation } from "@/i18n/context";

interface TradeTemplate {
  id: string;
  name: string;
  asset: string;
  direction: string;
  strategy: string;
  lots: number;
  sl: number;
  tp: number;
  entry?: number;
  emotion?: string;
}

function loadTemplates(): TradeTemplate[] {
  try {
    const raw = localStorage.getItem("trade-templates");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: TradeTemplate[]) {
  localStorage.setItem("trade-templates", JSON.stringify(templates));
}

interface TradeFormProps {
  onSubmit: (trade: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
  editTrade?: Trade | null;
}

const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "USD/CHF", "AUD/USD", "NZD/USD", "USD/CAD", "EUR/GBP", "EUR/JPY", "GBP/JPY"];
const FALLBACK_STRATEGIES = ["Breakout", "Retracement", "Support/Resistance", "Trend Following", "Scalping"];
const EMOTION_KEYS = ["confident", "fear", "greedy", "impatient", "neutralEmotion", "stressed", "frustrated", "euphoric"] as const;

export function TradeForm({ onSubmit, onClose, editTrade }: TradeFormProps) {
  const { strategies } = useStrategies();
  const { t } = useTranslation();
  const [direction, setDirection] = useState(editTrade?.direction || "LONG");
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [showNewStrategy, setShowNewStrategy] = useState(false);
  const [newStratName, setNewStratName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    editTrade?.tags ? editTrade.tags.split(",").map((t) => t.trim()).filter(Boolean) : []
  );

  // Template state
  const [templates, setTemplates] = useState<TradeTemplate[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const handleSaveTemplate = () => {
    if (!formRef.current || !templateName.trim()) return;
    const form = new FormData(formRef.current);
    const tpl: TradeTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      asset: form.get("asset") as string,
      direction,
      strategy: form.get("strategy") as string,
      lots: parseFloat(form.get("lots") as string) || 0,
      sl: parseFloat(form.get("sl") as string) || 0,
      tp: parseFloat(form.get("tp") as string) || 0,
      entry: parseFloat(form.get("entry") as string) || undefined,
      emotion: form.get("emotion") as string || undefined,
    };
    const updated = [...templates, tpl];
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateName("");
  };

  const handleLoadTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl || !formRef.current) return;
    const form = formRef.current;
    const setVal = (name: string, value: string | number) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (el) el.value = String(value);
    };
    setVal("asset", tpl.asset);
    setDirection(tpl.direction);
    setVal("strategy", tpl.strategy);
    setVal("lots", tpl.lots);
    setVal("sl", tpl.sl);
    setVal("tp", tpl.tp);
    if (tpl.entry) setVal("entry", tpl.entry);
    if (tpl.emotion) setVal("emotion", tpl.emotion);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  };

  const handleRenameTemplate = (id: string) => {
    if (!renameValue.trim()) return;
    const updated = templates.map((t) => t.id === id ? { ...t, name: renameValue.trim() } : t);
    setTemplates(updated);
    saveTemplates(updated);
    setRenamingId(null);
    setRenameValue("");
  };

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
      tags: selectedTags.join(", "),
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
            {editTrade ? t("editTrade") : t("newTradeTitle")}
          </h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }} className="hover:opacity-80">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Template controls */}
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                <FolderOpen className="w-3 h-3 inline mr-1" />
                Charger un template
              </label>
              <select
                onChange={(e) => { if (e.target.value) handleLoadTemplate(e.target.value); e.target.value = ""; }}
                className="input-field text-sm"
                defaultValue=""
              >
                <option value="" disabled>-- Sélectionner --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                <Save className="w-3 h-3 inline mr-1" />
                Sauvegarder comme template
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="input-field text-sm flex-1"
                  placeholder="Nom du template..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSaveTemplate())}
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium btn-primary text-white disabled:opacity-40 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {templates.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTemplateManager(!showTemplateManager)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                Gérer ({templates.length})
              </button>
            )}
          </div>

          {/* Template manager */}
          {showTemplateManager && templates.length > 0 && (
            <div className="p-4 rounded-xl space-y-2" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <h4 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Gérer les templates</h4>
              {templates.map((tpl) => (
                <div key={tpl.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                  {renamingId === tpl.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="input-field text-sm flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleRenameTemplate(tpl.id)}
                        autoFocus
                      />
                      <button type="button" onClick={() => handleRenameTemplate(tpl.id)} className="text-emerald-400 hover:text-emerald-300 text-xs">OK</button>
                      <button type="button" onClick={() => setRenamingId(null)} className="text-[--text-muted] hover:text-[--text-primary] text-xs">Annuler</button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{tpl.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">{tpl.asset}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${tpl.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>{tpl.direction}</span>
                      <button type="button" onClick={() => { setRenamingId(tpl.id); setRenameValue(tpl.name); }} className="text-blue-400 hover:text-blue-300">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDeleteTemplate(tpl.id)} className="text-rose-400 hover:text-rose-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("dateTime")}</label>
              <input
                type="datetime-local"
                name="date"
                defaultValue={editTrade ? formatDateTimeLocal(editTrade.date) : new Date().toISOString().slice(0, 16)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("asset")}</label>
              <select name="asset" defaultValue={editTrade?.asset || ASSETS[0]} className="input-field">
                {ASSETS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("direction")}</label>
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
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("strategy")}</label>
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
                  title={t("newStrategy")}
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
                    placeholder={t("strategyName")}
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
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("entryPrice")}</label>
              <input type="number" step="0.00001" name="entry" defaultValue={editTrade?.entry} className="input-field mono" required />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("stopLoss")}</label>
              <input type="number" step="0.00001" name="sl" defaultValue={editTrade?.sl} className="input-field mono" required />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("takeProfit")}</label>
              <input type="number" step="0.00001" name="tp" defaultValue={editTrade?.tp} className="input-field mono" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("lotSize")}</label>
              <input type="number" step="0.01" name="lots" defaultValue={editTrade?.lots} className="input-field mono" required />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("exitPrice")}</label>
              <input type="number" step="0.00001" name="exit" defaultValue={editTrade?.exit ?? undefined} className="input-field mono" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("resultEur")}</label>
              <input type="number" step="0.01" name="result" defaultValue={editTrade?.result} className="input-field mono" required />
            </div>
          </div>

          {/* Commission, Swap, MAE, MFE */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("commissionEur")}</label>
              <input type="number" step="0.01" name="commission" defaultValue={0} className="input-field mono" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("swapEur")}</label>
              <input type="number" step="0.01" name="swap" defaultValue={0} className="input-field mono" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("maePrice")}</label>
              <input type="number" step="0.00001" name="maePrice" className="input-field mono" placeholder="Optionnel" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("mfePrice")}</label>
              <input type="number" step="0.00001" name="mfePrice" className="input-field mono" placeholder="Optionnel" />
            </div>
          </div>

          <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{t("setupScreenshots")}</label>
            <div
              className={`screenshot-preview rounded-xl p-8 text-center cursor-pointer ${screenshots.length > 0 ? "has-image" : ""}`}
              onClick={() => document.getElementById("screenshotInput")?.click()}
            >
              <input type="file" id="screenshotInput" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} />
              {screenshots.length === 0 ? (
                <div>
                  <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("clickToAddScreenshots")}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{t("imageFormats")}</p>
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
            <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("setupDescription")}</label>
            <textarea name="setup" rows={3} defaultValue={editTrade?.setup || ""} className="input-field" placeholder={t("describeAnalysis")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("emotionPsychology")}</label>
              <select name="emotion" defaultValue={editTrade?.emotion || t(EMOTION_KEYS[0])} className="input-field">
                {EMOTION_KEYS.map((key) => (
                  <option key={key} value={t(key)}>{t(key)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("tags")}</label>
              <TagPicker selected={selectedTags} onChange={setSelectedTags} />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg transition" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {t("cancel")}
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-lg btn-primary text-white font-medium disabled:opacity-50">
              {loading ? t("saving") : editTrade ? t("saveChanges") : t("saveTrade")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
