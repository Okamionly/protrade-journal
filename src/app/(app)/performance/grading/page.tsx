"use client";

import { useTrades } from "@/hooks/useTrades";
import { calculateRR } from "@/lib/utils";
import { Award, TrendingUp, TrendingDown, Target, AlertTriangle, Star, ChevronRight, Download, BarChart3, Users, FileText } from "lucide-react";
import { useState, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "@/i18n/context";

/* ──────────────────────────── types ──────────────────────────── */

interface TradeGrade {
  tradeId: string;
  date: string;
  asset: string;
  direction: string;
  result: number;
  emotion: string | null;
  riskReward: number | null;
  score: number;
  grade: string;
  gradeColor: string;
  rrScore: number;
  resultScore: number;
  emotionScore: number;
  timingScore: number;
}

interface WeeklySnapshot {
  weekLabel: string;
  weekStart: string;
  avg: number;
  count: number;
}

interface SubScore {
  key: string;
  label: string;
  value: number;
  max: number;
  color: string;
  tip: string;
}

interface MonthlyReport {
  month: string;
  overallScore: number;
  overallGrade: { grade: string; color: string };
  categories: { label: string; score: number; max: number; grade: { grade: string; color: string } }[];
  strengths: string[];
  weaknesses: string[];
  tradeCount: number;
}

/* ──────────────────────────── scoring helpers ──────────────────────────── */

function getEmotionScore(emotion: string | null): number {
  if (!emotion) return 10;
  const e = emotion.trim().toLowerCase();
  if (["confiant", "discipliné", "discipline"].includes(e)) return 20;
  if (["calme", "neutre"].includes(e)) return 15;
  if (["stressé", "stresse", "anxieux"].includes(e)) return 5;
  if (["fomo", "revenge"].includes(e)) return 0;
  return 10;
}

function getTimingScore(dateStr: string): number {
  const d = new Date(dateStr);
  const hour = d.getUTCHours();
  if (hour >= 8 && hour <= 12) return 20;
  if (hour >= 13 && hour <= 17) return 20;
  if (hour >= 0 && hour <= 7) return 10;
  return 5;
}

function getGrade(score: number): { grade: string; color: string } {
  if (score >= 95) return { grade: "A+", color: "#10b981" };
  if (score >= 85) return { grade: "A", color: "#10b981" };
  if (score >= 75) return { grade: "B+", color: "#06b6d4" };
  if (score >= 65) return { grade: "B", color: "#06b6d4" };
  if (score >= 55) return { grade: "C", color: "#f59e0b" };
  if (score >= 45) return { grade: "D", color: "#f97316" };
  return { grade: "F", color: "#ef4444" };
}

const ALL_GRADES = ["A+", "A", "B+", "B", "C", "D", "F"] as const;
const GRADE_COLORS: Record<string, string> = {
  "A+": "#10b981",
  A: "#10b981",
  "B+": "#06b6d4",
  B: "#06b6d4",
  C: "#f59e0b",
  D: "#f97316",
  F: "#ef4444",
};

/* ──────────────────────────── week helpers ──────────────────────────── */

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekLabel(key: string): string {
  const parts = key.split("-W");
  return `S${parts[1]}`;
}

/* ──────────────────────────── sub-components ──────────────────────────── */

function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
          {value.toFixed(1)}/{max}
        </span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "var(--bg-hover)" }}>
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function MiniProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1.5 rounded-full flex-1" style={{ background: "var(--bg-hover)" }}>
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

/* ──────────────────────────── SVG Grade History Chart ──────────────────────────── */

function GradeHistoryChart({ snapshots, tr }: { snapshots: WeeklySnapshot[]; tr: (k: string) => string }) {
  if (snapshots.length < 2) return null;

  const W = 700;
  const H = 280;
  const PAD = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const xStep = chartW / Math.max(snapshots.length - 1, 1);
  const yScale = (v: number) => PAD.top + chartH - (v / 100) * chartH;

  // build polyline
  const points = snapshots.map((s, i) => ({
    x: PAD.left + i * xStep,
    y: yScale(s.avg),
    avg: s.avg,
    label: s.weekLabel,
    count: s.count,
  }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  // trend line (linear regression)
  const n = points.length;
  const sumX = points.reduce((s, _, i) => s + i, 0);
  const sumY = points.reduce((s, p) => s + p.avg, 0);
  const sumXY = points.reduce((s, p, i) => s + i * p.avg, 0);
  const sumX2 = points.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;
  const trendStart = intercept;
  const trendEnd = intercept + slope * (n - 1);
  const trendColor = slope > 0.5 ? "#10b981" : slope < -0.5 ? "#ef4444" : "#f59e0b";
  const trendLabel = slope > 0.5 ? tr("improving") : slope < -0.5 ? tr("declining") : tr("stable");

  // color zone rects
  const zones = [
    { y1: 0, y2: 40, color: "rgba(239,68,68,0.08)" },
    { y1: 40, y2: 70, color: "rgba(245,158,11,0.08)" },
    { y1: 70, y2: 100, color: "rgba(16,185,129,0.08)" },
  ];

  return (
    <div className="metric-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={20} style={{ color: "#06b6d4" }} />
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{tr("gradeHistory")}</h2>
        <span
          className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: `${trendColor}20`, color: trendColor }}
        >
          {trendLabel}
        </span>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{tr("gradeHistoryDesc")}</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
        {/* color zones */}
        {zones.map((z, i) => (
          <rect
            key={i}
            x={PAD.left}
            y={yScale(z.y2)}
            width={chartW}
            height={yScale(z.y1) - yScale(z.y2)}
            fill={z.color}
          />
        ))}

        {/* horizontal grid lines */}
        {[0, 20, 40, 60, 80, 100].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              y1={yScale(v)}
              x2={PAD.left + chartW}
              y2={yScale(v)}
              stroke="var(--border)"
              strokeWidth={0.5}
              strokeDasharray={v === 40 || v === 70 ? "4 2" : undefined}
            />
            <text
              x={PAD.left - 6}
              y={yScale(v) + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--text-muted)"
            >
              {v}
            </text>
          </g>
        ))}

        {/* zone labels */}
        <text x={PAD.left + 4} y={yScale(85)} fontSize={9} fill="#10b981" opacity={0.6}>Vert</text>
        <text x={PAD.left + 4} y={yScale(55)} fontSize={9} fill="#f59e0b" opacity={0.6}>Ambre</text>
        <text x={PAD.left + 4} y={yScale(20)} fontSize={9} fill="#ef4444" opacity={0.6}>Rouge</text>

        {/* gradient fill under the line */}
        <defs>
          <linearGradient id="gradeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <polygon
          points={`${points[0].x},${yScale(0)} ${polyline} ${points[points.length - 1].x},${yScale(0)}`}
          fill="url(#gradeGrad)"
        />

        {/* main line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#06b6d4"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* trend line */}
        <line
          x1={points[0].x}
          y1={yScale(trendStart)}
          x2={points[points.length - 1].x}
          y2={yScale(trendEnd)}
          stroke={trendColor}
          strokeWidth={1.5}
          strokeDasharray="6 3"
          opacity={0.7}
        />

        {/* data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#06b6d4" stroke="var(--bg-card)" strokeWidth={2} />
            {/* x-axis label */}
            <text
              x={p.x}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-muted)"
            >
              {p.label}
            </text>
            {/* hover value on top of point */}
            {(i === 0 || i === points.length - 1 || i % Math.max(1, Math.floor(n / 6)) === 0) && (
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize={9}
                fontWeight={600}
                fill="var(--text-primary)"
              >
                {p.avg.toFixed(0)}
              </text>
            )}
          </g>
        ))}

        {/* trend label */}
        <text
          x={points[points.length - 1].x}
          y={yScale(trendEnd) - 8}
          textAnchor="end"
          fontSize={9}
          fill={trendColor}
          fontWeight={600}
        >
          {tr("trendLine")}
        </text>
      </svg>
    </div>
  );
}

/* ──────────────────────────── Sub-Score Breakdown ──────────────────────────── */

function SubScoreBreakdown({ subScores, tr }: { subScores: SubScore[]; tr: (k: string) => string }) {
  const totalScore = subScores.reduce((s, sc) => s + sc.value, 0);
  const totalMax = subScores.reduce((s, sc) => s + sc.max, 0);

  return (
    <div className="metric-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={20} style={{ color: "#a855f7" }} />
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{tr("subScoreBreakdown")}</h2>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>{tr("subScoreDesc")}</p>

      {/* total score at top */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="text-3xl font-black"
          style={{ color: getGrade(Math.round((totalScore / totalMax) * 100)).color }}
        >
          {totalScore.toFixed(0)}
        </div>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>/ {totalMax} {tr("points")}</div>
        <div
          className="ml-auto text-xl font-bold px-3 py-1 rounded-xl"
          style={{
            background: `${getGrade(Math.round((totalScore / totalMax) * 100)).color}15`,
            color: getGrade(Math.round((totalScore / totalMax) * 100)).color,
          }}
        >
          {getGrade(Math.round((totalScore / totalMax) * 100)).grade}
        </div>
      </div>

      <div className="space-y-5">
        {subScores.map((sc) => {
          const pct = sc.max > 0 ? (sc.value / sc.max) * 100 : 0;
          return (
            <div key={sc.key}>
              <div className="flex justify-between items-center text-sm mb-1.5">
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{sc.label}</span>
                <span className="font-mono font-semibold" style={{ color: sc.color }}>
                  {sc.value.toFixed(1)} / {sc.max} {tr("points")}
                </span>
              </div>
              <div className="h-3 rounded-full" style={{ background: "var(--bg-hover)" }}>
                <div
                  className="h-3 rounded-full transition-all duration-700 relative"
                  style={{ width: `${pct}%`, background: sc.color }}
                >
                  {pct > 20 && (
                    <span
                      className="absolute right-1.5 top-0 text-[9px] font-bold leading-3"
                      style={{ color: "white" }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-1.5 mt-1.5">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${sc.color}15`, color: sc.color }}>
                  {tr("tip")}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{sc.tip}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────── Peer Comparison ──────────────────────────── */

function PeerComparison({ userScore, tr }: { userScore: number; tr: (k: string) => string }) {
  const benchmarks = [
    { label: tr("beginnerAvg"), score: 35, color: "#ef4444" },
    { label: tr("intermediateTrader"), score: 55, color: "#f59e0b" },
    { label: tr("advancedTrader"), score: 75, color: "#06b6d4" },
    { label: tr("top10"), score: 85, color: "#10b981" },
  ];

  const userColor = getGrade(Math.round(userScore)).color;

  return (
    <div className="metric-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Users size={20} style={{ color: "#f59e0b" }} />
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{tr("peerComparison")}</h2>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>{tr("peerComparisonDesc")}</p>

      {/* Scale bar */}
      <div className="relative mb-8">
        {/* background bar */}
        <div className="h-4 rounded-full overflow-hidden flex">
          <div style={{ width: "40%", background: "rgba(239,68,68,0.2)" }} />
          <div style={{ width: "30%", background: "rgba(245,158,11,0.2)" }} />
          <div style={{ width: "30%", background: "rgba(16,185,129,0.2)" }} />
        </div>

        {/* benchmark markers */}
        {benchmarks.map((b) => (
          <div
            key={b.label}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${b.score}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-0.5 h-4" style={{ background: b.color }} />
            <div className="text-[10px] mt-1 whitespace-nowrap font-medium" style={{ color: b.color }}>
              {b.score}
            </div>
            <div className="text-[9px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
              {b.label}
            </div>
          </div>
        ))}

        {/* user marker */}
        <div
          className="absolute flex flex-col items-center"
          style={{ left: `${Math.min(userScore, 100)}%`, top: -22, transform: "translateX(-50%)" }}
        >
          <div
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: userColor, color: "white" }}
          >
            {userScore.toFixed(0)}
          </div>
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `5px solid ${userColor}`,
            }}
          />
        </div>
      </div>

      {/* benchmark list */}
      <div className="space-y-2.5 mt-4">
        {benchmarks.map((b) => {
          const isAbove = userScore >= b.score;
          return (
            <div key={b.label} className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: b.color }}
              />
              <span className="text-sm flex-1" style={{ color: "var(--text-secondary)" }}>{b.label}</span>
              <span className="text-sm font-mono font-semibold" style={{ color: b.color }}>{b.score}/100</span>
              {isAbove ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                  ✓
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                  -
                </span>
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: userColor }} />
          <span className="text-sm font-semibold flex-1" style={{ color: "var(--text-primary)" }}>{tr("yourScore")}</span>
          <span className="text-sm font-mono font-bold" style={{ color: userColor }}>{userScore.toFixed(0)}/100</span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── Monthly Report Card ──────────────────────────── */

function MonthlyReportCard({ report, tr }: { report: MonthlyReport; tr: (k: string) => string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(() => {
    if (!cardRef.current) return;
    // Use canvas to export as image
    const el = cardRef.current;
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = el.offsetWidth * scale;
    canvas.height = el.offsetHeight * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw a simplified version
    ctx.scale(scale, scale);
    ctx.fillStyle = "#0f1729";
    ctx.fillRect(0, 0, el.offsetWidth, el.offsetHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px system-ui";
    ctx.fillText(`${tr("monthlyReportCard")} — ${report.month}`, 24, 40);

    ctx.font = "bold 64px system-ui";
    ctx.fillStyle = report.overallGrade.color;
    ctx.fillText(report.overallGrade.grade, 24, 110);

    ctx.font = "16px system-ui";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`Score: ${report.overallScore.toFixed(0)}/100  |  ${report.tradeCount} trades`, 24, 140);

    let yPos = 175;
    ctx.font = "bold 14px system-ui";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(tr("categoryGrades"), 24, yPos);
    yPos += 24;

    report.categories.forEach((cat) => {
      ctx.font = "13px system-ui";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`${cat.label}: `, 24, yPos);
      ctx.fillStyle = cat.grade.color;
      ctx.font = "bold 13px system-ui";
      ctx.fillText(`${cat.grade.grade} (${cat.score.toFixed(0)}/${cat.max})`, 180, yPos);
      yPos += 22;
    });

    yPos += 10;
    ctx.font = "bold 14px system-ui";
    ctx.fillStyle = "#10b981";
    ctx.fillText(tr("strengths"), 24, yPos);
    yPos += 20;
    ctx.font = "13px system-ui";
    report.strengths.forEach((s) => {
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(`+ ${s}`, 32, yPos);
      yPos += 20;
    });

    yPos += 10;
    ctx.font = "bold 14px system-ui";
    ctx.fillStyle = "#f59e0b";
    ctx.fillText(tr("weaknesses"), 24, yPos);
    yPos += 20;
    ctx.font = "13px system-ui";
    report.weaknesses.forEach((w) => {
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(`- ${w}`, 32, yPos);
      yPos += 20;
    });

    // footer
    yPos += 16;
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#475569";
    ctx.fillText("ProTrade Journal", 24, yPos);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bulletin-${report.month}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [report, tr]);

  return (
    <div className="metric-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <FileText size={20} style={{ color: "#06b6d4" }} />
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{tr("monthlyReportCard")}</h2>
        <button
          onClick={handleExport}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "#06b6d4", background: "rgba(6,182,212,0.1)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(6,182,212,0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(6,182,212,0.1)")}
        >
          <Download size={13} />
          {tr("exportImage")}
        </button>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>{tr("monthlyReportDesc")}</p>

      <div ref={cardRef}>
        {/* Grade header */}
        <div className="flex items-center gap-6 mb-6">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black"
            style={{ background: `${report.overallGrade.color}15`, color: report.overallGrade.color }}
          >
            {report.overallGrade.grade}
          </div>
          <div>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>{tr("overallGrade")}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: "var(--text-primary)" }}>
              {report.overallScore.toFixed(0)}/100
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {report.month} — {report.tradeCount} trades
            </div>
          </div>
        </div>

        {/* Category grades */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
            {tr("categoryGrades")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {report.categories.map((cat) => (
              <div key={cat.label} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: "var(--bg-hover)" }}>
                <span
                  className="text-lg font-bold w-10 text-center"
                  style={{ color: cat.grade.color }}
                >
                  {cat.grade.grade}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{cat.label}</div>
                  <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{cat.score.toFixed(0)}/{cat.max}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: "#10b981" }}>{tr("strengths")}</h4>
            {report.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5 text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                <span style={{ color: "#10b981" }}>+</span> {s}
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: "#f59e0b" }}>{tr("weaknesses")}</h4>
            {report.weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                <span style={{ color: "#f59e0b" }}>-</span> {w}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── Main Page ──────────────────────────── */

export default function GradingPage() {
  const { trades, loading } = useTrades();
  const { t: tr } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  /* ── graded trades (per-trade scoring, same as before) ── */
  const gradedTrades = useMemo<TradeGrade[]>(() => {
    return trades.map((t) => {
      const rrRaw = calculateRR(t.entry, t.sl, t.tp);
      const rr = parseFloat(rrRaw);
      const hasRR = !isNaN(rr) && rrRaw !== "-";

      const rrScore = hasRR ? Math.min(rr * 10, 30) : 15;
      const resultScore = t.result > 0 ? 30 : t.result === 0 ? 15 : 0;
      const emotionScore = getEmotionScore(t.emotion);
      const timingScore = getTimingScore(t.date);
      const score = Math.round(rrScore + resultScore + emotionScore + timingScore);
      const { grade, color } = getGrade(score);

      return {
        tradeId: t.id,
        date: t.date,
        asset: t.asset,
        direction: t.direction,
        result: t.result,
        emotion: t.emotion,
        riskReward: hasRR ? rr : null,
        score,
        grade,
        gradeColor: color,
        rrScore,
        resultScore,
        emotionScore,
        timingScore,
      };
    }).sort((a, b) => b.score - a.score);
  }, [trades]);

  /* ── original stats ── */
  const stats = useMemo(() => {
    if (gradedTrades.length === 0) return null;

    const total = gradedTrades.length;
    const avgScore = gradedTrades.reduce((s, t) => s + t.score, 0) / total;
    const avgGrade = getGrade(Math.round(avgScore));

    const distribution: Record<string, number> = {};
    ALL_GRADES.forEach((g) => (distribution[g] = 0));
    gradedTrades.forEach((t) => distribution[t.grade]++);

    const avgRR = gradedTrades.reduce((s, t) => s + t.rrScore, 0) / total;
    const avgResult = gradedTrades.reduce((s, t) => s + t.resultScore, 0) / total;
    const avgEmotion = gradedTrades.reduce((s, t) => s + t.emotionScore, 0) / total;
    const avgTiming = gradedTrades.reduce((s, t) => s + t.timingScore, 0) / total;

    // Best setup
    const combos: Record<string, { total: number; count: number }> = {};
    gradedTrades.forEach((t) => {
      const key = `${t.asset} ${t.direction}`;
      if (!combos[key]) combos[key] = { total: 0, count: 0 };
      combos[key].total += t.score;
      combos[key].count++;
    });
    let bestSetup = { key: "-", avg: 0 };
    Object.entries(combos).forEach(([key, val]) => {
      const avg = val.total / val.count;
      if (avg > bestSetup.avg && val.count >= 2) bestSetup = { key, avg };
    });
    if (bestSetup.key === "-" && Object.keys(combos).length > 0) {
      const first = Object.entries(combos).sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)[0];
      if (first) bestSetup = { key: first[0], avg: first[1].total / first[1].count };
    }

    // Weakest component
    const components = [
      { label: "Risk/Reward", avg: avgRR, max: 30 },
      { label: "Résultat", avg: avgResult, max: 30 },
      { label: "Émotion", avg: avgEmotion, max: 20 },
      { label: "Timing", avg: avgTiming, max: 20 },
    ];
    const weakest = components.reduce((w, c) => (c.avg / c.max < w.avg / w.max ? c : w), components[0]);

    return { total, avgScore, avgGrade, distribution, avgRR, avgResult, avgEmotion, avgTiming, bestSetup, weakest };
  }, [gradedTrades]);

  /* ── weekly snapshots for Grade History Chart ── */
  const weeklySnapshots = useMemo<WeeklySnapshot[]>(() => {
    if (gradedTrades.length === 0) return [];
    const byWeek: Record<string, { total: number; count: number; start: string }> = {};
    // sort by date for chronological weeks
    const sorted = [...gradedTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach((t) => {
      const wk = getWeekKey(t.date);
      if (!byWeek[wk]) byWeek[wk] = { total: 0, count: 0, start: t.date };
      byWeek[wk].total += t.score;
      byWeek[wk].count++;
    });
    return Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        weekLabel: weekLabel(key),
        weekStart: val.start,
        avg: val.total / val.count,
        count: val.count,
      }));
  }, [gradedTrades]);

  /* ── sub-scores (portfolio-level, 0-25 each) ── */
  const subScores = useMemo<SubScore[]>(() => {
    if (trades.length === 0) return [];

    const wins = trades.filter((t) => t.result > 0).length;
    const total = trades.length;
    const winRate = total > 0 ? wins / total : 0;
    const winRateScore = Math.min(winRate * 50, 25); // 50% = 25pts

    const rrValues = trades.map((t) => {
      const rr = parseFloat(calculateRR(t.entry, t.sl, t.tp));
      return isNaN(rr) ? 1 : rr;
    });
    const avgRR = rrValues.reduce((s, v) => s + v, 0) / (rrValues.length || 1);
    const rrScore = Math.min(avgRR * 10, 25); // 2.5 R:R = 25pts

    const totalWins = trades.filter((t) => t.result > 0).reduce((s, t) => s + t.result, 0);
    const totalLoss = Math.abs(trades.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0));
    const profitFactor = totalLoss > 0 ? totalWins / totalLoss : totalWins > 0 ? 25 : 0;
    const pfScore = typeof profitFactor === "number" ? Math.min(profitFactor * 10, 25) : 0; // PF 2.5 = 25pts

    // consistency: 1 - coefficient of variation of absolute results (lower CV = more consistent)
    const absResults = trades.map((t) => Math.abs(t.result));
    const meanAbs = absResults.reduce((s, v) => s + v, 0) / (absResults.length || 1);
    const variance = absResults.reduce((s, v) => s + Math.pow(v - meanAbs, 2), 0) / (absResults.length || 1);
    const cv = meanAbs > 0 ? Math.sqrt(variance) / meanAbs : 0;
    const consistencyScore = Math.max(0, Math.min(25, 25 * (1 - cv / 2)));

    return [
      { key: "winRate", label: tr("winRateContrib"), value: Math.round(winRateScore * 10) / 10, max: 25, color: "#10b981", tip: tr("tipWinRate") },
      { key: "rr", label: tr("rrContrib"), value: Math.round(rrScore * 10) / 10, max: 25, color: "#06b6d4", tip: tr("tipRR") },
      { key: "pf", label: tr("profitFactorContrib"), value: Math.round(pfScore * 10) / 10, max: 25, color: "#a855f7", tip: tr("tipProfitFactor") },
      { key: "consistency", label: tr("consistencyContrib"), value: Math.round(consistencyScore * 10) / 10, max: 25, color: "#f59e0b", tip: tr("tipConsistency") },
    ];
  }, [trades, tr]);

  /* ── monthly report ── */
  const monthlyReport = useMemo<MonthlyReport | null>(() => {
    if (trades.length === 0) return null;

    // latest month with trades
    const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestDate = new Date(sorted[0].date);
    const monthKey = `${latestDate.getFullYear()}-${String(latestDate.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = latestDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    const monthTrades = trades.filter((t) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === monthKey;
    });

    if (monthTrades.length < 2) return null;

    const mTotal = monthTrades.length;
    const wins = monthTrades.filter((t) => t.result > 0).length;
    const winRate = wins / mTotal;
    const winRateScore = Math.min(winRate * 50, 25);

    const rrValues = monthTrades.map((t) => {
      const rr = parseFloat(calculateRR(t.entry, t.sl, t.tp));
      return isNaN(rr) ? 1 : rr;
    });
    const avgRR = rrValues.reduce((s, v) => s + v, 0) / rrValues.length;
    const rrScore = Math.min(avgRR * 10, 25);

    const totalWins = monthTrades.filter((t) => t.result > 0).reduce((s, t) => s + t.result, 0);
    const totalLoss = Math.abs(monthTrades.filter((t) => t.result < 0).reduce((s, t) => s + t.result, 0));
    const profitFactor = totalLoss > 0 ? totalWins / totalLoss : totalWins > 0 ? 25 : 0;
    const pfScore = Math.min(profitFactor * 10, 25);

    const absResults = monthTrades.map((t) => Math.abs(t.result));
    const meanAbs = absResults.reduce((s, v) => s + v, 0) / absResults.length;
    const variance = absResults.reduce((s, v) => s + Math.pow(v - meanAbs, 2), 0) / absResults.length;
    const cv = meanAbs > 0 ? Math.sqrt(variance) / meanAbs : 0;
    const consistencyScore = Math.max(0, Math.min(25, 25 * (1 - cv / 2)));

    const overallScore = Math.round(winRateScore + rrScore + pfScore + consistencyScore);

    const categories = [
      { label: tr("winRateContrib"), score: winRateScore, max: 25, grade: getGrade(Math.round((winRateScore / 25) * 100)) },
      { label: tr("rrContrib"), score: rrScore, max: 25, grade: getGrade(Math.round((rrScore / 25) * 100)) },
      { label: tr("profitFactorContrib"), score: pfScore, max: 25, grade: getGrade(Math.round((pfScore / 25) * 100)) },
      { label: tr("consistencyContrib"), score: consistencyScore, max: 25, grade: getGrade(Math.round((consistencyScore / 25) * 100)) },
    ];

    // sort by score to find strengths and weaknesses
    const sortedCats = [...categories].sort((a, b) => b.score - a.score);
    const strengths = sortedCats.slice(0, 2).map((c) => `${c.label} (${c.grade.grade} — ${c.score.toFixed(0)}/${c.max})`);
    const weaknesses = sortedCats.slice(-2).reverse().map((c) => `${c.label} (${c.grade.grade} — ${c.score.toFixed(0)}/${c.max})`);

    return {
      month: monthLabel,
      overallScore,
      overallGrade: getGrade(overallScore),
      categories,
      strengths,
      weaknesses,
      tradeCount: mTotal,
    };
  }, [trades, tr]);

  /* ──────────────────────────── render ──────────────────────────── */

  if (loading) {
    return <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>{tr("loading")}</div>;
  }

  if (!stats || gradedTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: "var(--text-muted)" }}>
        <Award size={48} />
        <p className="text-lg">{tr("noTradeToGrade")}</p>
        <p className="text-sm">{tr("addTradesToGrade")}</p>
      </div>
    );
  }

  const visibleTrades = showAll ? gradedTrades : gradedTrades.slice(0, 50);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
          <Award size={28} />
          {tr("gradingTitle")}
        </h1>
        <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
          {tr("gradingSubtitle")}
        </p>
      </div>

      {/* Grade Distribution */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {ALL_GRADES.map((g) => {
          const count = stats.distribution[g];
          const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(0) : "0";
          return (
            <div
              key={g}
              className="metric-card rounded-2xl p-4 text-center"
            >
              <div
                className="text-2xl font-bold"
                style={{ color: GRADE_COLORS[g] }}
              >
                {g}
              </div>
              <div className="text-xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                {count}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {pct}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Average Grade + Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Average Grade */}
        <div className="metric-card rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
          <Star size={32} style={{ color: stats.avgGrade.color }} />
          <div className="text-5xl font-black" style={{ color: stats.avgGrade.color }}>
            {stats.avgGrade.grade}
          </div>
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {tr("avgScoreLabel")}: <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>{stats.avgScore.toFixed(1)}/100</span>
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            sur {stats.total} trade{stats.total > 1 ? "s" : ""}
          </div>
        </div>

        {/* Breakdown */}
        <div className="metric-card rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            {tr("componentBreakdown")}
          </h2>
          <ProgressBar value={stats.avgRR} max={30} color="#06b6d4" label="Risk/Reward" />
          <ProgressBar value={stats.avgResult} max={30} color="#10b981" label="Résultat" />
          <ProgressBar value={stats.avgEmotion} max={20} color="#a855f7" label="Émotion" />
          <ProgressBar value={stats.avgTiming} max={20} color="#f59e0b" label="Timing" />
        </div>
      </div>

      {/* ════════ NEW: Grade History Chart ════════ */}
      <GradeHistoryChart snapshots={weeklySnapshots} tr={tr} />

      {/* ════════ NEW: Sub-Score Breakdown + Peer Comparison ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {subScores.length > 0 && <SubScoreBreakdown subScores={subScores} tr={tr} />}
        <PeerComparison userScore={stats.avgScore} tr={tr} />
      </div>

      {/* ════════ NEW: Monthly Report Card ════════ */}
      {monthlyReport && <MonthlyReportCard report={monthlyReport} tr={tr} />}

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="metric-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Target size={20} style={{ color: "#10b981" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{tr("bestSetup")}</h3>
          </div>
          <div className="text-lg font-bold" style={{ color: "#10b981" }}>
            {stats.bestSetup.key}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Score moyen: {stats.bestSetup.avg.toFixed(1)}/100 ({getGrade(Math.round(stats.bestSetup.avg)).grade})
          </div>
        </div>

        <div className="metric-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={20} style={{ color: "#f59e0b" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{tr("improvementPoint")}</h3>
          </div>
          <div className="text-lg font-bold" style={{ color: "#f59e0b" }}>
            {stats.weakest.label}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Moyenne: {stats.weakest.avg.toFixed(1)}/{stats.weakest.max} ({((stats.weakest.avg / stats.weakest.max) * 100).toFixed(0)}%)
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="metric-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {tr("tradeDetail")} ({stats.total})
          </h2>
        </div>

        {/* Table Header */}
        <div
          className="hidden md:grid grid-cols-8 gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
        >
          <div>Note</div>
          <div>Date</div>
          <div>Actif</div>
          <div>Direction</div>
          <div className="text-right">P&L</div>
          <div className="text-right">R:R</div>
          <div>Émotion</div>
          <div className="text-right">Score</div>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {visibleTrades.map((t) => (
            <div key={t.tradeId}>
              <div
                className="grid grid-cols-3 md:grid-cols-8 gap-2 px-4 py-3 items-center cursor-pointer transition-colors"
                style={{ borderColor: "var(--border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => setExpandedId(expandedId === t.tradeId ? null : t.tradeId)}
              >
                {/* Grade Badge */}
                <div>
                  <span
                    className="rounded-full px-3 py-1 font-bold text-sm inline-block"
                    style={{ background: `${t.gradeColor}20`, color: t.gradeColor }}
                  >
                    {t.grade}
                  </span>
                </div>

                {/* Date */}
                <div className="hidden md:block text-sm" style={{ color: "var(--text-secondary)" }}>
                  {new Date(t.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                </div>

                {/* Asset */}
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {t.asset}
                </div>

                {/* Direction */}
                <div className="hidden md:flex items-center gap-1 text-sm">
                  {t.direction.toLowerCase() === "buy" || t.direction.toLowerCase() === "long" ? (
                    <TrendingUp size={14} style={{ color: "#10b981" }} />
                  ) : (
                    <TrendingDown size={14} style={{ color: "#ef4444" }} />
                  )}
                  <span style={{ color: "var(--text-secondary)" }}>{t.direction}</span>
                </div>

                {/* P&L */}
                <div
                  className="text-sm font-mono text-right"
                  style={{ color: t.result >= 0 ? "#10b981" : "#ef4444" }}
                >
                  {t.result >= 0 ? "+" : ""}
                  {t.result.toFixed(2)}
                </div>

                {/* R:R */}
                <div className="hidden md:block text-sm font-mono text-right" style={{ color: "var(--text-secondary)" }}>
                  {t.riskReward !== null ? `${t.riskReward.toFixed(1)}` : "-"}
                </div>

                {/* Emotion */}
                <div className="hidden md:block text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t.emotion || "-"}
                </div>

                {/* Score */}
                <div className="text-right flex items-center justify-end gap-1">
                  <span className="text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                    {t.score}
                  </span>
                  <ChevronRight
                    size={14}
                    className="transition-transform"
                    style={{
                      color: "var(--text-muted)",
                      transform: expandedId === t.tradeId ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  />
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedId === t.tradeId && (
                <div
                  className="px-4 pb-4 pt-1 grid grid-cols-2 md:grid-cols-4 gap-3"
                  style={{ background: "var(--bg-hover)" }}
                >
                  <div className="space-y-1">
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>R:R ({t.rrScore.toFixed(0)}/30)</div>
                    <MiniProgressBar value={t.rrScore} max={30} color="#06b6d4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>Résultat ({t.resultScore.toFixed(0)}/30)</div>
                    <MiniProgressBar value={t.resultScore} max={30} color="#10b981" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>Émotion ({t.emotionScore.toFixed(0)}/20)</div>
                    <MiniProgressBar value={t.emotionScore} max={20} color="#a855f7" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>Timing ({t.timingScore.toFixed(0)}/20)</div>
                    <MiniProgressBar value={t.timingScore} max={20} color="#f59e0b" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Show more */}
        {!showAll && gradedTrades.length > 50 && (
          <div className="p-4 text-center" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setShowAll(true)}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ color: "#06b6d4", background: "rgba(6,182,212,0.1)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(6,182,212,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(6,182,212,0.1)")}
            >
              {tr("seeMore")} ({gradedTrades.length - 50} {tr("tradesRemaining")})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
