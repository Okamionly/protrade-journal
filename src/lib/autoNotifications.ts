import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

/* ── Helpers ──────────────────────────────────────────────────────── */

/**
 * Fire-and-forget wrapper: runs the async fn without blocking the caller.
 * Errors are logged but never thrown.
 */
export function fireAndForget(fn: () => Promise<unknown>) {
  fn().catch((err) => console.error("[autoNotifications]", err));
}

/* ── Streak broken ────────────────────────────────────────────────── */

export async function notifyStreakBroken(userId: string) {
  // Fetch the most recent trades to determine the streak that just ended
  const recentTrades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 100,
    select: { result: true },
  });

  if (recentTrades.length < 2) return;

  // The latest trade should be a loss (streak just broke)
  if (recentTrades[0].result >= 0) return;

  // Count the consecutive wins before the loss
  let streakCount = 0;
  for (let i = 1; i < recentTrades.length; i++) {
    if (recentTrades[i].result > 0) {
      streakCount++;
    } else {
      break;
    }
  }

  if (streakCount < 2) return; // Only notify for meaningful streaks

  await createNotification({
    userId,
    type: "streak_broken",
    title: "Série terminée",
    body: `Votre série de ${streakCount} victoires est terminée. Analysez ce trade pour progresser !`,
    href: "/dashboard",
  });
}

/* ── New badge ────────────────────────────────────────────────────── */

export async function notifyNewBadge(userId: string, badgeName: string) {
  await createNotification({
    userId,
    type: "badge_earned",
    title: "Nouveau badge débloqué !",
    body: `Nouveau badge débloqué : ${badgeName} !`,
    href: "/gamification",
  });
}

/* ── Monthly goal reached ─────────────────────────────────────────── */

export async function notifyGoalReached(userId: string, amount: number) {
  const formatted = amount >= 0 ? `+${amount}` : `${amount}`;
  await createNotification({
    userId,
    type: "goal_reached",
    title: "Objectif mensuel atteint !",
    body: `Objectif mensuel atteint ! ${formatted}€`,
    href: "/dashboard",
  });
}

/* ── Monthly goal progress ────────────────────────────────────────── */

export async function notifyGoalProgress(userId: string, pct: number) {
  await createNotification({
    userId,
    type: "goal_progress",
    title: "Progression objectif",
    body: `Vous êtes à ${Math.round(pct)}% de votre objectif mensuel. Continuez comme ça !`,
    href: "/dashboard",
  });
}

/* ── New challenge available ──────────────────────────────────────── */

export async function notifyNewChallenge(userId: string) {
  await createNotification({
    userId,
    type: "challenge_available",
    title: "Nouveau défi disponible !",
    body: "Nouveau défi disponible cette semaine ! Relevez le challenge.",
    href: "/gamification",
  });
}

/* ── Trade review reminder ────────────────────────────────────────── */

export async function notifyTradeReview(userId: string, tradeId: string) {
  await createNotification({
    userId,
    type: "review_reminder",
    title: "Revue de trade",
    body: "N'oubliez pas de noter votre dernier trade et d'ajouter vos observations.",
    href: `/trades/${tradeId}`,
  });
}

/* ── Post-trade checks (called after a trade is created) ──────────── */

/**
 * Run all relevant auto-notification checks after a new trade is created.
 * Designed to be called via `fireAndForget(...)` so it never blocks the response.
 */
export async function checkPostTradeNotifications(
  userId: string,
  tradeId: string,
  tradeResult: number
) {
  try {
    // 1. Check if a win streak was just broken
    if (tradeResult < 0) {
      await notifyStreakBroken(userId);
    }

    // 2. Check monthly goal progress & completion
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [monthlyGoal, monthTrades] = await Promise.all([
      prisma.monthlyGoal.findFirst({
        where: {
          userId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      }),
      prisma.trade.findMany({
        where: {
          userId,
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { result: true },
      }),
    ]);

    if (monthlyGoal?.targetPnl && monthlyGoal.targetPnl > 0) {
      const totalPnl = monthTrades.reduce((sum, t) => sum + t.result, 0);
      const pct = (totalPnl / monthlyGoal.targetPnl) * 100;

      if (pct >= 100) {
        // Check we haven't already sent this notification this month
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            type: "goal_reached",
            createdAt: { gte: monthStart },
          },
        });
        if (!existing) {
          await notifyGoalReached(userId, Math.round(totalPnl));
        }
      } else if (pct >= 80) {
        // Check we haven't already sent a progress notification above 80%
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            type: "goal_progress",
            createdAt: { gte: monthStart },
          },
        });
        if (!existing) {
          await notifyGoalProgress(userId, pct);
        }
      }
    }

    // 3. Trade review reminder (if the trade has no rating/notes yet)
    await notifyTradeReview(userId, tradeId);
  } catch (err) {
    console.error("[checkPostTradeNotifications]", err);
  }
}
