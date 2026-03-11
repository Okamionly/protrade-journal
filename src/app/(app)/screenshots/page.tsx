"use client";

import { useTrades } from "@/hooks/useTrades";
import { useState } from "react";
import { X, Camera } from "lucide-react";

export default function ScreenshotsPage() {
  const { trades, loading } = useTrades();
  const [filter, setFilter] = useState("all");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Chargement...</div></div>;
  }

  const allScreenshots: { src: string; trade: typeof trades[0] }[] = [];
  trades.forEach((trade) => {
    if (trade.screenshots?.length > 0) {
      const shouldInclude = filter === "all" || (filter === "win" && trade.result > 0) || (filter === "loss" && trade.result < 0);
      if (shouldInclude) {
        trade.screenshots.forEach((s) => {
          allScreenshots.push({ src: s.url, trade });
        });
      }
    }
  });

  // Strategy performance for trades with screenshots
  const stratPerf: Record<string, { wins: number; total: number; profit: number }> = {};
  trades.forEach((t) => {
    if (t.screenshots?.length > 0) {
      if (!stratPerf[t.strategy]) stratPerf[t.strategy] = { wins: 0, total: 0, profit: 0 };
      stratPerf[t.strategy].total++;
      stratPerf[t.strategy].profit += t.result;
      if (t.result > 0) stratPerf[t.strategy].wins++;
    }
  });
  const sortedStrats = Object.entries(stratPerf).sort((a, b) => b[1].profit - a[1].profit).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Bibliothèque de Screenshots</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-sm"
          >
            <option value="all">Tous les trades</option>
            <option value="win">Trades gagnants</option>
            <option value="loss">Trades perdants</option>
          </select>
        </div>

        {allScreenshots.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun screenshot enregistré</p>
          </div>
        ) : (
          <div className="screenshot-gallery">
            {allScreenshots.map((item, i) => (
              <div
                key={i}
                className="screenshot-thumb"
                onClick={() => setLightboxSrc(item.src)}
              >
                <img src={item.src} alt={`Setup ${item.trade.asset}`} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs font-medium">{item.trade.asset}</p>
                  <p className={`${item.trade.result > 0 ? "text-emerald-400" : "text-rose-400"} text-xs`}>
                    {item.trade.result > 0 ? "+" : ""}{item.trade.result}€
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Analyse Visuelle</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Setups les plus profitables</h4>
            <div className="space-y-2">
              {sortedStrats.length > 0 ? sortedStrats.map(([name, stats]) => (
                <div key={name} className="flex justify-between items-center p-2 bg-gray-800/50 rounded-lg">
                  <span className="text-sm">{name}</span>
                  <span className={`text-sm font-bold ${stats.profit > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {stats.profit > 0 ? "+" : ""}{stats.profit}€
                  </span>
                </div>
              )) : <p className="text-gray-600 text-sm">Pas assez de données</p>}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Erreurs visuelles fréquentes</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-2 bg-gray-800/50 rounded-lg">
                <span className="text-yellow-500">⚠</span>
                <span className="text-sm">Entrées anticipées sur breakout</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-gray-800/50 rounded-lg">
                <span className="text-yellow-500">⚠</span>
                <span className="text-sm">SL trop serré en volatilité</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {lightboxSrc && (
        <div className="lightbox" onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10">
            <X className="w-8 h-8" />
          </button>
          <img src={lightboxSrc} alt="Screenshot" className="max-w-[90%] max-h-[90%] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
