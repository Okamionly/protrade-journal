"use client";

import { useTrades } from "@/hooks/useTrades";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export default function CalendarPage() {
  const { trades, loading } = useTrades();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<{ day: number; trades: typeof trades } | null>(null);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Chargement...</div></div>;
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  // Group trades by day
  const tradesByDay: Record<number, typeof trades> = {};
  trades.forEach((t) => {
    const d = new Date(t.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!tradesByDay[day]) tradesByDay[day] = [];
      tradesByDay[day].push(t);
    }
  });

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Calendrier des Trades</h3>
          <div className="flex items-center space-x-2">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-700 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 font-medium">{MONTH_NAMES[month]} {year}</span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-700 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center mb-2 text-gray-400 text-sm">
          <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div>Dim</div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayTrades = tradesByDay[day] || [];
            const hasTrade = dayTrades.length > 0;
            const dayProfit = dayTrades.reduce((sum, t) => sum + t.result, 0);
            const isWin = dayProfit >= 0;

            return (
              <div
                key={day}
                className={`calendar-day aspect-square rounded-lg border p-2 relative ${
                  hasTrade
                    ? isWin
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-rose-500/10 border-rose-500/30"
                    : "bg-gray-800/30 border-gray-700"
                }`}
                onClick={() => setSelectedDay({ day, trades: dayTrades })}
              >
                <span className={`text-sm ${hasTrade ? "font-bold" : "text-gray-400"} ${hasTrade ? (isWin ? "text-emerald-400" : "text-rose-400") : ""}`}>
                  {day}
                </span>
                {hasTrade && (
                  <div className={`text-xs mt-1 truncate ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                    {isWin ? "+" : ""}{dayProfit}€
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Trades Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
          <div className="glass rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">
                Trades du {selectedDay.day} {MONTH_NAMES[month]} {year}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-current">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              {selectedDay.trades.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun trade ce jour</p>
              ) : (
                selectedDay.trades.map((trade) => {
                  const isWin = trade.result > 0;
                  return (
                    <div key={trade.id} className={`p-4 rounded-xl border ${isWin ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">
                            {trade.asset}{" "}
                            <span className={`text-xs px-2 py-1 rounded ${trade.direction === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                              {trade.direction}
                            </span>
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {trade.strategy} | {trade.setup?.substring(0, 50) || "Pas de description"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(trade.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold mono ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                            {isWin ? "+" : ""}{trade.result}€
                          </p>
                          <p className="text-xs text-gray-500">{trade.lots} lots</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
