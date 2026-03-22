"use client";

import { Activity } from "lucide-react";

export default function FlowPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold flex items-center gap-3"
          style={{ color: "var(--text-primary)" }}
        >
          <Activity className="w-7 h-7 text-violet-400" />
          Flux d&apos;Options
        </h1>
      </div>

      {/* Coming Soon Card */}
      <div
        className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center"
        style={{ minHeight: "400px" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "rgba(139,92,246,0.15)" }}
        >
          <Activity className="w-8 h-8 text-violet-400" />
        </div>
        <h2
          className="text-xl font-bold mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          Disponible prochainement
        </h2>
        <p
          className="text-sm max-w-md"
          style={{ color: "var(--text-secondary)" }}
        >
          L&apos;analyse du flux d&apos;options sera disponible prochainement.
        </p>
      </div>
    </div>
  );
}
