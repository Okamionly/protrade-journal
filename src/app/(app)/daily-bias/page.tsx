"use client";

import { useState, useEffect } from "react";
import { Save, ChevronLeft, ChevronRight, Crosshair, TrendingUp, TrendingDown, Minus } from "lucide-react";

const BIAS_OPTIONS = [
  { value: "bullish", label: "Haussier", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
  { value: "bearish", label: "Baissier", icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30" },
  { value: "neutral", label: "Neutre", icon: Minus, color: "text-gray-400", bg: "bg-gray-500/15 border-gray-500/30" },
];

const GRADE_OPTIONS = ["A+", "A", "B", "C", "D", "F"];

interface DailyPlan {
  id?: string;
  date: string;
  bias: string;
  notes: string;
  pairs: string;
  keyLevels: string;
  review: string;
  grade: string;
}

export default function DailyBiasPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [plan, setPlan] = useState<DailyPlan>({ date, bias: "", notes: "", pairs: "", keyLevels: "", review: "", grade: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/daily-plan?date=${date}`);
        if (res.ok) {
          const data = await res.json();
          if (data) setPlan({ ...data, date });
          else setPlan({ date, bias: "", notes: "", pairs: "", keyLevels: "", review: "", grade: "" });
        }
      } catch { /* ignore */ }
    };
    load();
  }, [date]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const isToday = date === new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crosshair className="w-6 h-6 text-cyan-400" />
            Daily Bias
          </h1>
          <p className="text-sm text-gray-400 mt-1">Plan de trading et analyse pré-marché</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-white/5 transition"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
          <span className={`px-4 py-2 rounded-xl text-sm font-medium ${isToday ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" : "bg-gray-800 text-gray-300"}`}>
            {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-white/5 transition"><ChevronRight className="w-5 h-5 text-gray-400" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pre-market plan */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Biais directionnel</h3>
            <div className="flex gap-3">
              {BIAS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = plan.bias === opt.value;
                return (
                  <button key={opt.value} onClick={() => setPlan({ ...plan, bias: opt.value })}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition font-medium ${
                      isActive ? opt.bg : "border-gray-700 text-gray-500 hover:border-gray-600"
                    }`}>
                    <Icon className={`w-5 h-5 ${isActive ? opt.color : ""}`} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-3">Paires à surveiller</h3>
            <input value={plan.pairs} onChange={(e) => setPlan({ ...plan, pairs: e.target.value })} placeholder="EUR/USD, GBP/USD, XAU/USD..."
              className="w-full bg-gray-800/50 dark:bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 focus:outline-none transition" />
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-3">Niveaux clés</h3>
            <textarea value={plan.keyLevels} onChange={(e) => setPlan({ ...plan, keyLevels: e.target.value })} placeholder="Support: 1.0850&#10;Résistance: 1.0920&#10;POI: 1.0880..." rows={4}
              className="w-full bg-gray-800/50 dark:bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 focus:outline-none transition resize-none" />
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-3">Notes pré-marché</h3>
            <textarea value={plan.notes} onChange={(e) => setPlan({ ...plan, notes: e.target.value })} placeholder="Contexte macro, catalyseurs, plan d'action..." rows={4}
              className="w-full bg-gray-800/50 dark:bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 focus:outline-none transition resize-none" />
          </div>
        </div>

        {/* Post-market review */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-3">Review post-session</h3>
            <textarea value={plan.review} onChange={(e) => setPlan({ ...plan, review: e.target.value })} placeholder="Comment s'est passée la journée ? Qu'as-tu bien fait ? Que peux-tu améliorer ?" rows={6}
              className="w-full bg-gray-800/50 dark:bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 focus:outline-none transition resize-none" />
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Note de la journée</h3>
            <div className="flex gap-2">
              {GRADE_OPTIONS.map((g) => (
                <button key={g} onClick={() => setPlan({ ...plan, grade: g })}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition border ${
                    plan.grade === g
                      ? g.startsWith("A") ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : g === "B" ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        : g === "C" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      : "border-gray-700 text-gray-500 hover:border-gray-600"
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="w-full btn-primary py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="w-5 h-5" />
            {saved ? "Sauvegardé !" : saving ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}
