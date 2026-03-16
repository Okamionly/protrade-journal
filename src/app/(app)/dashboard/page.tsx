"use client";

import { useTrades, useUser, Trade } from "@/hooks/useTrades";
import { DashboardCards } from "@/components/DashboardCards";
import { EquityChart, StrategyChart } from "@/components/ChartComponents";
import { TradeForm } from "@/components/TradeForm";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { ForexSessions } from "@/components/ForexSessions";
import { calculateRR, formatDate } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Camera, Target, Flame, TrendingUp, TrendingDown, Calendar, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function DashboardPage() {
  const { trades, loading, addTrade, deleteTrade, updateTrade } = useTrades();
  const { user, updateBalance } = useUser();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("monthlyGoal");
    if (saved) setMonthlyGoal(parseFloat(saved));
  }, []);

  const handleAddTrade = async (trade: Record<string, unknown>) => {
    const ok = await addTrade(trade);
    if (ok) toast("Trade créé avec succès", "success");
    else toast("Erreur lors de la création", "error");
    return ok;
  };

  const handleUpdateTrade = async (trade: Record<string, unknown>) => {
    if (!editingTrade) return false;
    const ok = await updateTrade(editingTrade.id, trade);
    if (ok) toast("Trade modifié avec succès", "success");
    else toast("Erreur lors de la modification", "error");
    return ok;
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer ce trade ?")) {
      const ok = await deleteTrade(id);
      if (ok) toast("Trade supprimé", "success");
      else toast("Erreur lors de la suppression", "error");
    }
  };

  const saveBalance = async () => {
    const value = parseFloat(balanceInput);
    if (!isNaN(value) && value >= 0) {
      const ok = await updateBalance(value);
      if (ok) {
        toast("Balance mise à jour", "success");
        setShowBalanceModal(false);
      } else {
        toast("Erreur lors de la mise à jour", "error");
      }
    }
  };

  const saveGoal = () => {
    const value = parseFloat(goalInput);
    if (!isNaN(value) && value > 0) {
      setMonthlyGoal(value);
      localStorage.setItem("monthlyGoal", String(value));
      setShowGoalModal(false);
      toast("Objectif mensuel mis à jour", "success");
    }
  };

  // Monthly P&L
  const now = new Date();
  const monthlyTrades = trades.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyPnL = monthlyTrades.reduce((s, t) => s + t.result, 0);
  const goalProgress = monthlyGoal > 0 ? Math.min((monthlyPnL / monthlyGoal) * 100, 100) : 0;

  if (loading) return <DashboardSkeleton />;

  const recentTrades = trades.slice(0, 5);

  return (
    <>
      <DashboardCards
        trades={trades}
        balance={user?.balance ?? 25000}
        onEditBalance={() => {
          setBalanceInput(String(user?.balance ?? 25000));
          setShowBalanceModal(true);
        }}
      />

      {/* Objectif mensuel */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold">Objectif Mensuel</h3>
          </div>
          <button
            onClick={() => { setGoalInput(String(monthlyGoal || "")); setShowGoalModal(true); }}
            className="text-sm text-blue-400 hover:text-blue-300 transition"
          >
            {monthlyGoal > 0 ? "Modifier" : "Définir un objectif"}
          </button>
        </div>
        {monthlyGoal > 0 ? (
          <>
            <div className="flex justify-between text-sm mb-2">
              <span className={monthlyPnL >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {monthlyPnL >= 0 ? "+" : ""}€{monthlyPnL.toFixed(2)}
              </span>
              <span className="text-gray-400">Objectif : €{monthlyGoal.toFixed(2)}</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${monthlyPnL >= monthlyGoal ? "bg-emerald-500" : monthlyPnL >= 0 ? "bg-blue-500" : "bg-rose-500"}`}
                style={{ width: `${Math.max(goalProgress, 0)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{goalProgress.toFixed(1)}% atteint — {monthlyTrades.length} trades ce mois</p>
          </>
        ) : (
          <p className="text-gray-500 text-sm">Aucun objectif défini. Cliquez pour en définir un.</p>
        )}
      </div>

      {/* Streak + Forex Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Win/Loss Streak */}
        {(() => {
          let currentStreak = 0;
          let streakType: "win" | "loss" | "none" = "none";
          const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          for (const t of sorted) {
            if (currentStreak === 0) {
              streakType = t.result > 0 ? "win" : t.result < 0 ? "loss" : "none";
              currentStreak = 1;
            } else if ((streakType === "win" && t.result > 0) || (streakType === "loss" && t.result < 0)) {
              currentStreak++;
            } else {
              break;
            }
          }
          let bestWin = 0, bestLoss = 0, tempWin = 0, tempLoss = 0;
          for (const t of sorted.reverse()) {
            if (t.result > 0) { tempWin++; tempLoss = 0; bestWin = Math.max(bestWin, tempWin); }
            else if (t.result < 0) { tempLoss++; tempWin = 0; bestLoss = Math.max(bestLoss, tempLoss); }
            else { tempWin = 0; tempLoss = 0; }
          }
          return (
            <div className="glass rounded-2xl p-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Série en cours</h4>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${streakType === "win" ? "bg-emerald-500/20" : streakType === "loss" ? "bg-rose-500/20" : "bg-gray-500/20"}`}>
                  <Flame className={`w-6 h-6 ${streakType === "win" ? "text-emerald-400" : streakType === "loss" ? "text-rose-400" : "text-gray-400"}`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold mono ${streakType === "win" ? "text-emerald-400" : streakType === "loss" ? "text-rose-400" : "text-gray-400"}`}>
                    {currentStreak}
                  </div>
                  <div className="text-xs text-gray-500">
                    {streakType === "win" ? "victoires" : streakType === "loss" ? "défaites" : "—"}
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Meilleure série W</span><span className="text-emerald-400 font-bold">{bestWin}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Pire série L</span><span className="text-rose-400 font-bold">{bestLoss}</span></div>
              </div>
            </div>
          );
        })()}

        {/* Quick Stats */}
        <div className="glass rounded-2xl p-4">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Aujourd&apos;hui</h4>
          {(() => {
            const today = new Date().toISOString().slice(0, 10);
            const todayTrades = trades.filter(t => new Date(t.date).toISOString().slice(0, 10) === today);
            const todayPnL = todayTrades.reduce((s, t) => s + t.result, 0);
            const todayWins = todayTrades.filter(t => t.result > 0).length;
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {todayPnL >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-rose-400" />}
                  <span className={`text-xl font-bold mono ${todayPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {todayPnL >= 0 ? "+" : ""}€{todayPnL.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">{todayTrades.length} trades — {todayWins} gagnants</div>
                <div className="text-xs text-gray-500">
                  WR: {todayTrades.length > 0 ? ((todayWins / todayTrades.length) * 100).toFixed(0) : 0}%
                </div>
              </div>
            );
          })()}
        </div>

        {/* Forex Sessions */}
        <ForexSessions />
      </div>

      {/* Weekly Comparison */}
      {(() => {
        const today = new Date();
        const dayOfWeek = today.getDay() || 7;
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - dayOfWeek + 1);
        thisWeekStart.setHours(0, 0, 0, 0);
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(thisWeekStart);
        lastWeekEnd.setMilliseconds(-1);

        const thisWeekTrades = trades.filter(t => new Date(t.date) >= thisWeekStart);
        const lastWeekTrades = trades.filter(t => { const d = new Date(t.date); return d >= lastWeekStart && d <= lastWeekEnd; });

        const twPnL = thisWeekTrades.reduce((s, t) => s + t.result, 0);
        const lwPnL = lastWeekTrades.reduce((s, t) => s + t.result, 0);
        const twWins = thisWeekTrades.filter(t => t.result > 0).length;
        const lwWins = lastWeekTrades.filter(t => t.result > 0).length;
        const twWR = thisWeekTrades.length > 0 ? (twWins / thisWeekTrades.length) * 100 : 0;
        const lwWR = lastWeekTrades.length > 0 ? (lwWins / lastWeekTrades.length) * 100 : 0;

        const metrics = [
          { label: "P&L", current: twPnL, previous: lwPnL, format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}€` },
          { label: "Trades", current: thisWeekTrades.length, previous: lastWeekTrades.length, format: (v: number) => String(v) },
          { label: "Win Rate", current: twWR, previous: lwWR, format: (v: number) => `${v.toFixed(0)}%` },
          { label: "Avg P&L", current: thisWeekTrades.length ? twPnL / thisWeekTrades.length : 0, previous: lastWeekTrades.length ? lwPnL / lastWeekTrades.length : 0, format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}€` },
        ];

        return (
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Comparaison Hebdomadaire</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map(({ label, current, previous, format }) => {
                const delta = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : current > 0 ? 100 : 0;
                const improved = current >= previous;
                return (
                  <div key={label} className="rounded-xl p-4" style={{ background: "var(--bg-hover)" }}>
                    <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
                    <div className="text-xl font-bold mono" style={{ color: current >= 0 || label === "Trades" || label === "Win Rate" ? "var(--text-primary)" : "#ef4444" }}>
                      {format(current)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {improved ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                      <span className={`text-xs font-medium ${improved ? "text-emerald-400" : "text-rose-400"}`}>
                        {Math.abs(delta).toFixed(0)}% vs sem. préc.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Courbe d&apos;Équité</h3>
          <EquityChart trades={trades} startingBalance={user?.balance ?? 25000} />
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Répartition par Stratégie</h3>
          <StrategyChart trades={trades} />
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Trades Récents</h3>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Trade
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Actif</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Entrée</th>
                <th className="pb-3 font-medium">Sortie</th>
                <th className="pb-3 font-medium">Screenshots</th>
                <th className="pb-3 font-medium">R:R</th>
                <th className="pb-3 font-medium">P&L</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Aucun trade enregistré. Cliquez sur &quot;Nouveau Trade&quot; pour commencer.
                  </td>
                </tr>
              ) : (
                recentTrades.map((trade) => {
                  const isWin = trade.result > 0;
                  const rr = calculateRR(trade.entry, trade.sl, trade.tp);
                  return (
                    <tr key={trade.id} className="trade-row border-b border-gray-800">
                      <td className="py-4 mono text-gray-400">{formatDate(trade.date)}</td>
                      <td className="py-4 font-medium">{trade.asset}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${trade.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-4 mono">{trade.entry}</td>
                      <td className="py-4 mono">{trade.exit || "-"}</td>
                      <td className="py-4">
                        {trade.screenshots.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">
                            <Camera className="w-3 h-3 mr-1" />
                            {trade.screenshots.length}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="py-4 mono text-gray-400">1:{rr}</td>
                      <td className={`py-4 mono font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                        {isWin ? "+" : ""}{trade.result}€
                      </td>
                      <td className="py-4 flex gap-2">
                        <button onClick={() => { setEditingTrade(trade); }} className="text-blue-400 hover:text-blue-300">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(trade.id)} className="text-rose-400 hover:text-rose-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <TradeForm onSubmit={handleAddTrade} onClose={() => setShowForm(false)} />}
      {editingTrade && <TradeForm onSubmit={handleUpdateTrade} onClose={() => setEditingTrade(null)} editTrade={editingTrade} />}

      {/* Balance Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Modifier la Balance</h3>
            <p className="text-sm text-gray-400 mb-4">Entrez votre capital initial en euros.</p>
            <input
              type="number"
              step="0.01"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              placeholder="Ex: 25000"
              className="modal-input mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveBalance()}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowBalanceModal(false)} className="flex-1 py-2 rounded-lg border border-gray-600 hover:bg-gray-800 transition">
                Annuler
              </button>
              <button onClick={saveBalance} className="flex-1 py-2 rounded-lg btn-primary text-white font-medium">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Objectif Mensuel</h3>
            <p className="text-sm text-gray-400 mb-4">Définissez votre objectif de profit mensuel en euros.</p>
            <input
              type="number"
              step="0.01"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Ex: 500"
              className="modal-input mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveGoal()}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowGoalModal(false)} className="flex-1 py-2 rounded-lg border border-gray-600 hover:bg-gray-800 transition">
                Annuler
              </button>
              <button onClick={saveGoal} className="flex-1 py-2 rounded-lg btn-primary text-white font-medium">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
