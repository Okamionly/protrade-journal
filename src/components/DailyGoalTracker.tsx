"use client";

import { useState, useEffect, useMemo } from "react";
import { Target, Pencil, Check, X } from "lucide-react";
import type { Trade } from "@/hooks/useTrades";

interface DailyGoalTrackerProps {
  trades: Trade[];
  monthlyGoal: number;
}

export function DailyGoalTracker({ trades, monthlyGoal }: DailyGoalTrackerProps) {
  const [editing, setEditing] = useState(false);
  const [customDaily, setCustomDaily] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("customDailyGoal");
    if (saved) setCustomDaily(parseFloat(saved));
  }, []);

  // Daily goal: custom or derived from monthly / 22 trading days
  const dailyGoal = customDaily ?? (monthlyGoal > 0 ? monthlyGoal / 22 : 0);

  const todayPnL = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return trades
      .filter((t) => new Date(t.date).toISOString().slice(0, 10) === todayStr)
      .reduce((s, t) => s + t.result, 0);
  }, [trades]);

  const progress = dailyGoal > 0 ? Math.min((todayPnL / dailyGoal) * 100, 100) : 0;
  const clampedProgress = Math.max(progress, 0);

  // Color logic
  const color =
    progress >= 100
      ? "#10b981" // green - reached
      : progress >= 60
      ? "#f59e0b" // amber - close
      : "#6366f1"; // indigo - default

  const handleSave = () => {
    const val = parseFloat(input);
    if (!isNaN(val) && val > 0) {
      setCustomDaily(val);
      localStorage.setItem("customDailyGoal", String(val));
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setInput("");
  };

  if (!mounted) return null;
  if (dailyGoal <= 0 && !editing) return null;

  // SVG circle params
  const size = 64;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div
      className="fixed bottom-6 right-6 z-40"
      style={{ pointerEvents: "auto" }}
    >
      {/* Edit popover */}
      {editing && (
        <div
          className="absolute bottom-full right-0 mb-2 p-3 rounded-xl"
          style={{
            background: "var(--widget-bg, rgba(30,30,40,0.95))",
            border: "1px solid var(--border)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            minWidth: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div
            className="text-xs font-bold uppercase tracking-wider mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Objectif du jour
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={dailyGoal > 0 ? dailyGoal.toFixed(0) : "100"}
              className="flex-1 px-2 py-1.5 rounded-lg text-sm mono"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                outline: "none",
                width: 80,
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
            <button
              onClick={handleSave}
              className="p-1.5 rounded-lg transition hover:opacity-80"
              style={{ background: "rgba(16,185,129,0.2)", color: "#10b981" }}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-lg transition hover:opacity-80"
              style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main floating circle */}
      <button
        onClick={() => {
          setInput(dailyGoal > 0 ? dailyGoal.toFixed(0) : "");
          setEditing(!editing);
        }}
        className="group relative flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110"
        style={{
          width: size,
          height: size,
          background: "var(--widget-bg, rgba(20,20,30,0.9))",
          border: `2px solid ${color}40`,
          boxShadow: `0 4px 20px ${color}20, 0 0 0 1px var(--border)`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          cursor: "pointer",
        }}
        title="Objectif du jour — cliquez pour modifier"
      >
        {/* Progress ring */}
        <svg
          width={size}
          height={size}
          className="absolute inset-0"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.3s ease" }}
          />
        </svg>

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center">
          {progress >= 100 ? (
            <Target className="w-4 h-4" style={{ color }} />
          ) : (
            <span
              className="text-xs font-black mono leading-none"
              style={{ color }}
            >
              {clampedProgress.toFixed(0)}%
            </span>
          )}
        </div>

        {/* Edit hint on hover */}
        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: color, color: "#fff" }}
          >
            <Pencil className="w-2.5 h-2.5" />
          </div>
        </div>
      </button>

      {/* Label tooltip below */}
      <div
        className="text-center mt-1 text-[9px] font-bold uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        {todayPnL.toFixed(0)} / {dailyGoal.toFixed(0)}
      </div>
    </div>
  );
}
