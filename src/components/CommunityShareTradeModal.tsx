"use client";

import { useState } from "react";
import { useTrades } from "@/hooks/useTrades";
import { X, Search, Share2, Send, TrendingUp, TrendingDown } from "lucide-react";

interface CommunityShareTradeModalProps {
  onShare: (tradeId: string, content: string, comment: string) => void;
  onClose: () => void;
}

export function CommunityShareTradeModal({ onShare, onClose }: CommunityShareTradeModalProps) {
  const { trades, loading } = useTrades();
  const [search, setSearch] = useState("");
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const filtered = trades.filter(
    (t) =>
      t.asset.toLowerCase().includes(search.toLowerCase()) ||
      t.strategy.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTrade = trades.find((t) => t.id === selectedTradeId);

  const handleShare = () => {
    if (!selectedTrade) return;
    const isWin = selectedTrade.result > 0;
    const content = `📊 Trade partagé : ${selectedTrade.asset} ${selectedTrade.direction} — ${isWin ? "+" : ""}${selectedTrade.result}€`;
    onShare(selectedTrade.id, content, comment);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col border border-[--border]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            Partager dans la communaute
          </h3>
          <button onClick={onClose} className="text-[--text-secondary] hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!selectedTradeId ? (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--text-secondary]" />
              <input
                type="text"
                placeholder="Rechercher par actif ou strategie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-cyan-500/50 transition"
              />
            </div>

            {/* Trade List */}
            <div className="overflow-y-auto flex-1 space-y-2">
              {loading ? (
                <p className="text-[--text-secondary] text-center py-8">Chargement...</p>
              ) : filtered.length === 0 ? (
                <p className="text-[--text-muted] text-center py-8">Aucun trade trouve.</p>
              ) : (
                filtered.slice(0, 20).map((trade) => {
                  const isWin = trade.result > 0;
                  return (
                    <button
                      key={trade.id}
                      onClick={() => setSelectedTradeId(trade.id)}
                      className="w-full text-left p-3 rounded-xl border border-[--border] hover:bg-[var(--bg-hover)] transition flex items-center justify-between"
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
                          <p className="text-xs text-[--text-secondary]">{trade.strategy}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`mono font-bold text-sm ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                          {isWin ? "+" : ""}{trade.result}€
                        </p>
                        <p className="text-xs text-[--text-muted]">
                          {new Date(trade.date).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            {/* Preview selected trade */}
            {selectedTrade && (
              <div className="rounded-xl p-4 bg-[--bg-secondary]/50 border border-[--border] mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{selectedTrade.asset}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        selectedTrade.direction === "LONG"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {selectedTrade.direction}
                    </span>
                  </div>
                  {selectedTrade.result >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <p className="text-[--text-muted]">Entree</p>
                    <p className="mono font-medium">{selectedTrade.entry}</p>
                  </div>
                  <div>
                    <p className="text-[--text-muted]">Sortie</p>
                    <p className="mono font-medium">{selectedTrade.exit || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[--text-muted]">Lots</p>
                    <p className="mono font-medium">{selectedTrade.lots}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[--border]">
                  <span className="text-xs text-[--text-muted]">{selectedTrade.strategy}</span>
                  <span className={`mono font-bold text-sm ${selectedTrade.result >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {selectedTrade.result >= 0 ? "+" : ""}{selectedTrade.result}€
                  </span>
                </div>
              </div>
            )}

            {/* Comment input */}
            <div className="mb-4">
              <label className="text-xs text-[--text-secondary] mb-1.5 block">
                Ajouter un commentaire (optionnel)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre analyse, votre raisonnement..."
                rows={3}
                maxLength={500}
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-cyan-500/50 transition resize-none"
              />
              <p className="text-xs text-[--text-muted] mt-1 text-right">{comment.length}/500</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedTradeId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-[--border] bg-[--bg-secondary]/50 hover:bg-[--bg-secondary] transition"
              >
                Retour
              </button>
              <button
                onClick={handleShare}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Publier
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
