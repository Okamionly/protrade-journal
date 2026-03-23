"use client";

import { useState } from "react";
import { Compass, BarChart3, PieChart, Activity, ShieldAlert, Bell, CheckCircle } from "lucide-react";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Volume Flow",
    description: "Suivez les flux de volume en temps réel sur les options les plus actives du marché.",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/20",
  },
  {
    icon: PieChart,
    title: "Put/Call Ratio",
    description: "Analysez le ratio put/call pour anticiper le sentiment du marché.",
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
  },
  {
    icon: Activity,
    title: "Gamma Exposure",
    description: "Visualisez l\u2019exposition gamma des market makers pour identifier les niveaux cl\u00e9s.",
    color: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/20",
  },
  {
    icon: ShieldAlert,
    title: "Dark Pool Activity",
    description: "D\u00e9tectez les transactions institutionnelles hors march\u00e9 pour mieux comprendre les mouvements.",
    color: "from-amber-500/20 to-amber-600/10",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/20",
  },
];

export default function FlowPage() {
  const [notified, setNotified] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("flow_notify") === "true";
  });

  const handleNotify = () => {
    localStorage.setItem("flow_notify", "true");
    setNotified(true);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 shadow-lg shadow-violet-500/20">
          <Compass className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Flux d&apos;Options
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Analyse des flux institutionnels en temps r&eacute;el
          </p>
        </div>
      </div>

      {/* Hero glass card */}
      <div className="glass rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-40%] left-[-20%] w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-40%] right-[-20%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/20"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.6))" }}
          >
            <Compass className="w-10 h-10 text-white" />
          </div>

          <h2
            className="text-2xl md:text-3xl font-bold mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Bient&ocirc;t disponible
          </h2>
          <p
            className="text-sm max-w-lg mx-auto mb-8 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            L&apos;analyse du flux d&apos;options vous donnera un avantage d&eacute;cisif
            en r&eacute;v&eacute;lant les mouvements institutionnels avant qu&apos;ils n&apos;impactent le march&eacute;.
          </p>

          {/* Notify button */}
          {notified ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Vous serez notifi&eacute; du lancement
            </div>
          ) : (
            <button
              onClick={handleNotify}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:scale-[1.02]"
            >
              <Bell className="w-4 h-4" />
              M&apos;avertir du lancement
            </button>
          )}
        </div>
      </div>

      {/* Feature preview cards */}
      <div>
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Ce qui vous attend
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`glass rounded-xl p-5 border ${f.borderColor} bg-gradient-to-br ${f.color} transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <Icon className={`w-5 h-5 ${f.iconColor}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                      {f.title}
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {f.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
