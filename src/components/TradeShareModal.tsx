"use client";

import { useState } from "react";
import { useTrades } from "@/hooks/useTrades";
import { X, Search, Share2 } from "lucide-react";

interface TradeShareModalProps {
  onSelect: (tradeId: string, content: string) => void;
  onClose: () => void;
}

export function TradeShareModal({ onSelect, onClose }: TradeShareModalProps) {
  const { trades, loading } = useTrades();
  const [search, setSearch] = useState("");

  const filtered = trades.filter(
    (t) =>
      t.asset.toLowerCase().includes(search.toLowerCase()) ||
      t.strategy.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            Partager un trade
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par actif ou stratégie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-bg border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <p className="text-gray-400 text-center py-8">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun trade trouvé.</p>
          ) : (
            filtered.slice(0, 20).map((trade) => {
              const isWin = trade.result > 0;
              return (
                <button
                  key={trade.id}
                  onClick={() => {
                    const content = `📊 Trade partagé : ${trade.asset} ${trade.direction} — ${isWin ? "+" : ""}${trade.result}€`;
                    onSelect(trade.id, content);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-gray-700 hover:bg-white/5 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        trade.direction === "LONG"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {trade.direction}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{trade.asset}</p>
                      <p className="text-xs text-gray-400">{trade.strategy}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`mono font-bold text-sm ${
                        isWin ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isWin ? "+" : ""}
                      {trade.result}€
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(trade.date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
