import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* ─── Challenge definitions ─────────────────────────────── */

interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  category: "daily" | "weekly" | "monthly" | "special";
  icon: string;
  color: string;
  gradient: string;
  reward: { xp: number; badge: string };
  compute: (ctx: ComputeCtx) => { current: number; target: number };
}

interface ComputeCtx {
  todayTrades: Trade[];
  weekTrades: Trade[];
  monthTrades: Trade[];
  allTrades: Trade[];
  dailyPlans: { date: Date }[];
}

interface Trade {
  id: string;
  date: Date;
  result: number;
  sl: number;
  tp: number;
  entry: number;
  exit: number | null;
  emotion: string | null;
  tags: string | null;
  asset: string;
  direction: string;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const CHALLENGES: ChallengeDef[] = [
  // ── Daily ──
  {
    id: "daily-3-wins",
    title: "3 trades gagnants",
    description: "Gagner 3 trades aujourd'hui",
    category: "daily",
    icon: "TrendingUp",
    color: "#10b981",
    gradient: "from-emerald-500/20 to-emerald-600/5",
    reward: { xp: 50, badge: "Gagnant du Jour" },
    compute: (ctx) => ({
      current: ctx.todayTrades.filter((t) => t.result > 0).length,
      target: 3,
    }),
  },
  {
    id: "daily-zero-revenge",
    title: "Zero revenge trade",
    description: "Aucun trade dans les 5min suivant une perte",
    category: "daily",
    icon: "Shield",
    color: "#ef4444",
    gradient: "from-red-500/20 to-red-600/5",
    reward: { xp: 40, badge: "Esprit Calme" },
    compute: (ctx) => {
      const sorted = [...ctx.todayTrades].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      let revengeCount = 0;
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (prev.result < 0) {
          const diffMs =
            new Date(curr.date).getTime() - new Date(prev.date).getTime();
          if (diffMs < 5 * 60 * 1000) revengeCount++;
        }
      }
      // progress: 1 if no revenge trades, 0 if there are
      return {
        current: revengeCount === 0 && ctx.todayTrades.length > 0 ? 1 : 0,
        target: 1,
      };
    },
  },
  {
    id: "daily-sl-set",
    title: "Respecter le SL",
    description: "Tous les trades ont un Stop Loss configuré",
    category: "daily",
    icon: "Target",
    color: "#f59e0b",
    gradient: "from-amber-500/20 to-amber-600/5",
    reward: { xp: 30, badge: "Risk Manager" },
    compute: (ctx) => {
      if (ctx.todayTrades.length === 0) return { current: 0, target: 1 };
      const withSl = ctx.todayTrades.filter(
        (t) => t.sl !== 0 && t.sl !== null
      ).length;
      return { current: withSl, target: ctx.todayTrades.length };
    },
  },
  // ── Weekly ──
  {
    id: "weekly-win-streak-5",
    title: "Série de 5",
    description: "5 trades gagnants consécutifs cette semaine",
    category: "weekly",
    icon: "Flame",
    color: "#f97316",
    gradient: "from-orange-500/20 to-orange-600/5",
    reward: { xp: 150, badge: "Série en Feu" },
    compute: (ctx) => {
      const sorted = [...ctx.weekTrades].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      let best = 0;
      let cur = 0;
      for (const t of sorted) {
        if (t.result > 0) {
          cur++;
          if (cur > best) best = cur;
        } else {
          cur = 0;
        }
      }
      return { current: Math.min(best, 5), target: 5 };
    },
  },
  {
    id: "weekly-discipline",
    title: "Discipline parfaite",
    description: "Remplir le plan quotidien chaque jour de la semaine",
    category: "weekly",
    icon: "CheckCircle2",
    color: "#8b5cf6",
    gradient: "from-violet-500/20 to-violet-600/5",
    reward: { xp: 120, badge: "Discipline de Fer" },
    compute: (ctx) => {
      const weekStart = startOfWeek();
      const plansThisWeek = ctx.dailyPlans.filter(
        (p) => new Date(p.date) >= weekStart
      ).length;
      const today = new Date().getDay();
      const tradingDays = today === 0 ? 5 : Math.min(today, 5); // Mon-Fri
      return { current: Math.min(plansThisWeek, tradingDays), target: tradingDays || 5 };
    },
  },
  {
    id: "weekly-morning-trader",
    title: "Trader matinal",
    description: "Tous les trades passés avant 12h cette semaine",
    category: "weekly",
    icon: "Sunrise",
    color: "#06b6d4",
    gradient: "from-cyan-500/20 to-cyan-600/5",
    reward: { xp: 100, badge: "Lève-tôt" },
    compute: (ctx) => {
      if (ctx.weekTrades.length === 0) return { current: 0, target: 1 };
      const morning = ctx.weekTrades.filter((t) => {
        const h = new Date(t.date).getHours();
        return h < 12;
      }).length;
      return { current: morning, target: ctx.weekTrades.length };
    },
  },
  // ── Monthly ──
  {
    id: "monthly-1000-profit",
    title: "1000€ de profit",
    description: "Atteindre 1000€ de P&L ce mois",
    category: "monthly",
    icon: "Gem",
    color: "#10b981",
    gradient: "from-emerald-500/20 to-emerald-600/5",
    reward: { xp: 300, badge: "Millionnaire en Herbe" },
    compute: (ctx) => {
      const pnl = ctx.monthTrades.reduce((s, t) => s + t.result, 0);
      return { current: Math.max(Math.round(pnl), 0), target: 1000 };
    },
  },
  {
    id: "monthly-winrate-60",
    title: "Win rate 60%+",
    description: "Maintenir un win rate de 60%+ ce mois",
    category: "monthly",
    icon: "TrendingUp",
    color: "#3b82f6",
    gradient: "from-blue-500/20 to-blue-600/5",
    reward: { xp: 250, badge: "Sniper du Marché" },
    compute: (ctx) => {
      if (ctx.monthTrades.length === 0) return { current: 0, target: 60 };
      const wins = ctx.monthTrades.filter((t) => t.result > 0).length;
      const wr = Math.round((wins / ctx.monthTrades.length) * 100);
      return { current: Math.min(wr, 100), target: 60 };
    },
  },
  {
    id: "monthly-20-trades",
    title: "20 trades minimum",
    description: "Logger au moins 20 trades ce mois",
    category: "monthly",
    icon: "BarChart3",
    color: "#ec4899",
    gradient: "from-pink-500/20 to-pink-600/5",
    reward: { xp: 200, badge: "Trader Actif" },
    compute: (ctx) => ({
      current: Math.min(ctx.monthTrades.length, 20),
      target: 20,
    }),
  },
  // ── Special ──
  {
    id: "special-rr-master",
    title: "R:R Master",
    description: "R:R moyen > 2:1 sur 10+ trades ce mois",
    category: "special",
    icon: "Crosshair",
    color: "#a855f7",
    gradient: "from-purple-500/20 to-purple-600/5",
    reward: { xp: 200, badge: "R:R Elite" },
    compute: (ctx) => {
      const rrs = ctx.monthTrades
        .map((t) => {
          const risk = Math.abs(t.entry - t.sl);
          if (risk === 0) return NaN;
          return Math.abs(t.tp - t.entry) / risk;
        })
        .filter((rr) => !isNaN(rr));
      if (rrs.length < 10) return { current: rrs.length, target: 10 };
      const avgRR = rrs.reduce((s, r) => s + r, 0) / rrs.length;
      return { current: Math.round(avgRR * 50), target: 100 }; // 2:1 = 100%
    },
  },
  {
    id: "special-consistency-king",
    title: "Roi de la Consistance",
    description: "Trader 10 jours consécutifs",
    category: "special",
    icon: "Crown",
    color: "#f59e0b",
    gradient: "from-amber-500/20 to-amber-600/5",
    reward: { xp: 250, badge: "Roi de la Consistance" },
    compute: (ctx) => {
      const days = [
        ...new Set(ctx.allTrades.map((t) => new Date(t.date).toISOString().slice(0, 10))),
      ].sort();
      if (days.length === 0) return { current: 0, target: 10 };
      const today = new Date().toISOString().slice(0, 10);
      const last = days[days.length - 1];
      const diffToday =
        (new Date(today).getTime() - new Date(last).getTime()) / 86400000;
      if (diffToday > 1) return { current: 0, target: 10 };
      let streak = 1;
      for (let i = days.length - 1; i > 0; i--) {
        const diff =
          (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) /
          86400000;
        if (diff === 1) streak++;
        else break;
      }
      return { current: Math.min(streak, 10), target: 10 };
    },
  },
  {
    id: "special-zero-tilt",
    title: "Zero Tilt",
    description: "Aucun trade avec émotion négative pendant 2 semaines",
    category: "special",
    icon: "Ban",
    color: "#ef4444",
    gradient: "from-red-500/20 to-red-600/5",
    reward: { xp: 200, badge: "Maître Zen" },
    compute: (ctx) => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const recent = ctx.allTrades.filter(
        (t) => new Date(t.date) >= twoWeeksAgo
      );
      const negativeMoods = ["tilt", "frustration", "peur", "revenge", "colère", "anxiété", "frustrated", "fearful", "angry", "fomo", "anxious", "impatient", "stressed", "stressé"];
      const tiltTrades = recent.filter(
        (t) =>
          t.emotion &&
          negativeMoods.some((m) => t.emotion!.toLowerCase().includes(m.toLowerCase()))
      );
      const days = [
        ...new Set(recent.map((t) => new Date(t.date).toISOString().slice(0, 10))),
      ].length;
      return {
        current: tiltTrades.length === 0 ? Math.min(days, 14) : 0,
        target: 14,
      };
    },
  },
];

/* ─── GET: Return all challenges with progress ──────────── */

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const userId = session.user.id;

    // Fetch data in parallel
    const [trades, dailyPlans, progressRecords] = await Promise.all([
      prisma.trade.findMany({
        where: { userId },
        select: {
          id: true,
          date: true,
          result: true,
          sl: true,
          tp: true,
          entry: true,
          exit: true,
          emotion: true,
          tags: true,
          asset: true,
          direction: true,
        },
        orderBy: { date: "asc" },
      }),
      prisma.dailyPlan.findMany({
        where: { userId },
        select: { date: true },
      }),
      prisma.challengeProgress.findMany({
        where: { userId },
      }),
    ]);

    const now = new Date();
    const todayStart = startOfToday();
    const weekStart = startOfWeek();
    const monthStart = startOfMonth();

    const todayTrades = trades.filter((t) => new Date(t.date) >= todayStart);
    const weekTrades = trades.filter((t) => new Date(t.date) >= weekStart);
    const monthTrades = trades.filter((t) => new Date(t.date) >= monthStart);

    const ctx: ComputeCtx = {
      todayTrades,
      weekTrades,
      monthTrades,
      allTrades: trades,
      dailyPlans,
    };

    // Build progress map
    const progressMap = new Map(
      progressRecords.map((p) => [p.challengeId, p])
    );

    // Compute challenges
    const challenges = CHALLENGES.map((def) => {
      const { current, target } = def.compute(ctx);
      const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      const completed = progress >= 100;
      const dbProgress = progressMap.get(def.id);
      const joined = !!dbProgress;

      return {
        id: def.id,
        title: def.title,
        description: def.description,
        category: def.category,
        icon: def.icon,
        color: def.color,
        gradient: def.gradient,
        current,
        target,
        progress: Math.round(progress * 10) / 10,
        completed,
        completedAt: dbProgress?.completedAt?.toISOString() || null,
        joined,
        startedAt: dbProgress?.startedAt?.toISOString() || null,
        reward: def.reward,
      };
    });

    return NextResponse.json({ challenges });
  } catch (error) {
    console.error("GET challenges error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ─── POST: Join a challenge ────────────────────────────── */

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { challengeId } = await req.json();

    if (!challengeId || !CHALLENGES.find((c) => c.id === challengeId)) {
      return NextResponse.json(
        { error: "Challenge invalide" },
        { status: 400 }
      );
    }

    // Upsert to handle rejoining
    const progress = await prisma.challengeProgress.upsert({
      where: {
        userId_challengeId: {
          userId: session.user.id,
          challengeId,
        },
      },
      update: {
        progress: 0,
        completed: false,
        completedAt: null,
        startedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        challengeId,
        progress: 0,
      },
    });

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error("POST challenge error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ─── PATCH: Update challenge progress (called by client) ─ */

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { challengeId, progress, completed } = await req.json();

    if (!challengeId)
      return NextResponse.json(
        { error: "challengeId requis" },
        { status: 400 }
      );

    const updated = await prisma.challengeProgress.upsert({
      where: {
        userId_challengeId: {
          userId: session.user.id,
          challengeId,
        },
      },
      update: {
        progress: progress ?? 0,
        completed: completed ?? false,
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId: session.user.id,
        challengeId,
        progress: progress ?? 0,
        completed: completed ?? false,
        completedAt: completed ? new Date() : null,
      },
    });

    // Create notification on completion
    if (completed) {
      const challenge = CHALLENGES.find((c) => c.id === challengeId);
      if (challenge) {
        await prisma.notification.create({
          data: {
            userId: session.user.id,
            type: "challenge_complete",
            title: "Challenge terminé !",
            body: `Vous avez complété "${challenge.title}" et gagné ${challenge.reward.xp} XP !`,
            href: "/challenges",
          },
        });
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("PATCH challenge error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
