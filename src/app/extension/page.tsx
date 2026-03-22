"use client";

import type { Metadata } from "next";
import Link from "next/link";
import { useState } from "react";
import {
  MousePointerClick,
  Camera,
  FileText,
  Send,
  Chrome,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  SEO metadata is exported from a separate layout or generateMetadata
    but since this is a client component we use a head approach via
    the metadata export in a companion layout.                         */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: MousePointerClick,
    title: "Capture en 1 clic",
    desc: "Cliquez sur le chart TradingView pour capturer votre trade instantanement.",
  },
  {
    icon: Camera,
    title: "Screenshot automatique",
    desc: "Le chart est automatiquement capture en haute qualite pour votre journal.",
  },
  {
    icon: FileText,
    title: "Remplissage automatique",
    desc: "Asset, prix d'entree, direction... tous les champs sont pre-remplis.",
  },
  {
    icon: Send,
    title: "Envoi direct",
    desc: "Envoi direct dans votre journal MarketPhase, sans quitter votre navigateur.",
  },
];

const STEPS = [
  { step: 1, label: "Ouvrez TradingView", color: "bg-blue-500" },
  { step: 2, label: "Cliquez sur le bouton MarketPhase", color: "bg-emerald-500" },
  { step: 3, label: "Le trade est enregistre", color: "bg-purple-500" },
];

/* ------------------------------------------------------------------ */
/*  CSS Art mockup of the extension popup                              */
/* ------------------------------------------------------------------ */
function ExtensionMockup() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Browser window frame */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 bg-gray-100 px-4 py-2.5 border-b border-gray-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200 text-center">
              tradingview.com/chart/EURUSD
            </div>
          </div>
        </div>

        {/* Fake chart area */}
        <div className="relative bg-[#131722] p-6 h-52">
          {/* Chart grid lines */}
          <div className="absolute inset-0 opacity-10">
            {[...Array(5)].map((_, i) => (
              <div
                key={`h-${i}`}
                className="absolute w-full border-t border-gray-400"
                style={{ top: `${20 + i * 15}%` }}
              />
            ))}
            {[...Array(6)].map((_, i) => (
              <div
                key={`v-${i}`}
                className="absolute h-full border-l border-gray-400"
                style={{ left: `${10 + i * 16}%` }}
              />
            ))}
          </div>

          {/* Candlestick-like shapes */}
          <svg
            viewBox="0 0 400 120"
            className="absolute inset-6 w-[calc(100%-48px)] h-[calc(100%-48px)]"
            preserveAspectRatio="none"
          >
            {/* Uptrend line */}
            <polyline
              points="20,100 60,85 100,90 140,70 180,60 220,45 260,50 300,35 340,25 380,30"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              opacity="0.6"
            />
            {/* Candles */}
            {[
              { x: 40, o: 90, c: 80, h: 75, l: 95, bull: true },
              { x: 80, o: 85, c: 88, h: 82, l: 92, bull: false },
              { x: 120, o: 78, c: 68, h: 64, l: 82, bull: true },
              { x: 160, o: 65, c: 58, h: 54, l: 70, bull: true },
              { x: 200, o: 55, c: 48, h: 44, l: 60, bull: true },
              { x: 240, o: 50, c: 55, h: 46, l: 58, bull: false },
              { x: 280, o: 42, c: 35, h: 30, l: 48, bull: true },
              { x: 320, o: 32, c: 28, h: 24, l: 38, bull: true },
              { x: 360, o: 30, c: 34, h: 26, l: 38, bull: false },
            ].map((c, i) => (
              <g key={i}>
                <line
                  x1={c.x}
                  y1={c.h}
                  x2={c.x}
                  y2={c.l}
                  stroke={c.bull ? "#22c55e" : "#ef4444"}
                  strokeWidth="1"
                />
                <rect
                  x={c.x - 6}
                  y={Math.min(c.o, c.c)}
                  width={12}
                  height={Math.abs(c.o - c.c) || 2}
                  fill={c.bull ? "#22c55e" : "#ef4444"}
                />
              </g>
            ))}
          </svg>

          {/* Price label */}
          <div className="absolute top-3 left-4 text-[10px] font-mono text-gray-400">
            EUR/USD &middot; 1H
          </div>
          <div className="absolute top-3 right-4 text-[10px] font-mono text-emerald-400">
            1.0842
          </div>

          {/* Extension popup overlay */}
          <div className="absolute bottom-3 right-3 w-52 rounded-lg border border-gray-600 bg-[#1e222d] shadow-xl p-3 text-xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-white text-[11px]">MarketPhase Clipper</span>
            </div>
            <div className="space-y-1.5 text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500">Asset</span>
                <span className="text-white font-mono">EUR/USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Direction</span>
                <span className="text-emerald-400 font-mono">LONG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prix</span>
                <span className="text-white font-mono">1.0842</span>
              </div>
            </div>
            <button className="mt-2.5 w-full rounded-md bg-emerald-500 py-1.5 text-[11px] font-semibold text-white">
              Enregistrer le trade
            </button>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -top-3 -right-3 flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
        <Chrome className="w-3.5 h-3.5" />
        Extension Chrome
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */
export default function ExtensionPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* -------- Hero -------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50" />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left column */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700 mb-6">
                <Clock className="w-4 h-4" />
                Bientot disponible
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4">
                MarketPhase{" "}
                <span className="text-emerald-600">Trade Clipper</span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-600 font-medium mb-6">
                Enregistrez vos trades en 1 clic depuis TradingView
              </p>
              <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg">
                Plus besoin de copier-coller vos trades manuellement. Notre extension
                Chrome capture automatiquement votre chart, detecte l&apos;asset et
                le prix, puis enregistre le tout dans votre journal MarketPhase.
              </p>

              {/* Email signup */}
              {!submitted ? (
                <form onSubmit={handleSubmit} className="flex gap-2 max-w-md">
                  <input
                    type="email"
                    required
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors whitespace-nowrap"
                  >
                    Me prevenir
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-emerald-700 font-medium max-w-md">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  Merci ! Nous vous previendrons au lancement.
                </div>
              )}
            </div>

            {/* Right column — mockup */}
            <div className="lg:pl-4">
              <ExtensionMockup />
            </div>
          </div>
        </div>
      </section>

      {/* -------- Features -------- */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold mb-2">
          Comment ca marche ?
        </h2>
        <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
          L&apos;extension s&apos;integre directement dans TradingView pour une
          experience fluide et sans friction.
        </p>

        <div className="grid sm:grid-cols-2 gap-8">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* -------- 3-Step -------- */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-12">En 3 etapes simples</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`${s.color} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md`}
                  >
                    {s.step}
                  </div>
                  <span className="mt-2 text-sm font-medium text-gray-700 max-w-[140px] text-center">
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-gray-300 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------- CTA -------- */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          En attendant, utilisez notre chart integre
        </h2>
        <p className="text-gray-500 mb-8 max-w-xl mx-auto">
          MarketPhase inclut deja un chart TradingView interactif directement dans
          votre journal. Analysez vos trades sans quitter la plateforme.
        </p>
        <Link
          href="/chart"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-emerald-700 transition-colors"
        >
          Ouvrir le chart
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* -------- Footer note -------- */}
      <div className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        MarketPhase Trade Clipper est un projet en cours de developpement.
      </div>
    </div>
  );
}
