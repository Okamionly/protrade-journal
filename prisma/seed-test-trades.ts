import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Realistic forex trade generator for 2 months of data
// Win rate ~60%, mix of strategies, emotions, sessions
async function main() {
  // Find the user
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    console.error("No user found in database");
    process.exit(1);
  }

  console.log(`Seeding trades for user: ${user.email} (${user.id})`);

  // Find or create strategies
  let strategies = await prisma.strategy.findMany({
    where: { userId: user.id },
  });

  if (strategies.length === 0) {
    const stratNames = [
      { name: "Breakout", color: "#3b82f6" },
      { name: "Pullback", color: "#10b981" },
      { name: "Scalping", color: "#f59e0b" },
      { name: "Swing", color: "#8b5cf6" },
    ];
    for (const s of stratNames) {
      await prisma.strategy.create({
        data: { name: s.name, color: s.color, userId: user.id },
      });
    }
    strategies = await prisma.strategy.findMany({
      where: { userId: user.id },
    });
  }

  const strategyIds = strategies.map((s) => s.id);
  const strategyNames = strategies.map((s) => s.name);

  const assets = [
    "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "EUR/JPY",
    "GBP/JPY", "AUD/USD", "USD/CHF", "NZD/USD", "USD/CAD",
  ];

  const emotions = ["Confiant", "Neutre", "Incertain", "Stressé", "Calme", "Euphorique", "Discipliné"];
  const setups = ["Double Bottom", "Head & Shoulders", "Flag", "Wedge", "Channel Break", "Support Bounce", "Resistance Rejection", "Trend Continuation"];
  const directions = ["BUY", "SELL"];

  // Generate trades for the last 2 months (weekdays only)
  const trades: Array<{
    date: Date;
    asset: string;
    direction: string;
    strategy: string;
    strategyId: string;
    entry: number;
    exit: number;
    sl: number;
    tp: number;
    lots: number;
    result: number;
    emotion: string;
    setup: string;
    duration: number;
    commission: number;
    swap: number;
    notes: string;
    userId: string;
  }> = [];

  const now = new Date();
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  // Iterate through weekdays
  const currentDate = new Date(twoMonthsAgo);
  let tradeCount = 0;

  while (currentDate <= now) {
    const dayOfWeek = currentDate.getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // 1-3 trades per day (some days 0)
    const tradesPerDay = Math.random() < 0.15 ? 0 : Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < tradesPerDay; i++) {
      const asset = assets[Math.floor(Math.random() * assets.length)];
      const direction = directions[Math.floor(Math.random() * 2)];
      const stratIdx = Math.floor(Math.random() * strategyNames.length);
      const strategy = strategyNames[stratIdx];
      const strategyId = strategyIds[stratIdx];
      const emotion = emotions[Math.floor(Math.random() * emotions.length)];
      const setup = setups[Math.floor(Math.random() * setups.length)];

      // Realistic prices based on asset
      let entry: number, sl: number, tp: number, exitPrice: number, result: number;
      const lots = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0][Math.floor(Math.random() * 7)];

      // Win probability ~60%
      const isWin = Math.random() < 0.60;

      if (asset === "XAU/USD") {
        entry = 2200 + Math.random() * 300; // Gold range 2200-2500
        const risk = 5 + Math.random() * 15; // 5-20 points risk
        const rrRatio = 1.5 + Math.random() * 2.5; // 1.5:1 to 4:1 R:R
        if (direction === "BUY") {
          sl = entry - risk;
          tp = entry + risk * rrRatio;
          exitPrice = isWin ? entry + risk * (0.5 + Math.random() * rrRatio) : entry - risk * (0.3 + Math.random() * 0.7);
        } else {
          sl = entry + risk;
          tp = entry - risk * rrRatio;
          exitPrice = isWin ? entry - risk * (0.5 + Math.random() * rrRatio) : entry + risk * (0.3 + Math.random() * 0.7);
        }
        result = direction === "BUY" ? (exitPrice - entry) * lots * 100 : (entry - exitPrice) * lots * 100;
      } else if (asset === "USD/JPY" || asset === "EUR/JPY" || asset === "GBP/JPY") {
        entry = asset === "USD/JPY" ? 148 + Math.random() * 12 : asset === "EUR/JPY" ? 160 + Math.random() * 8 : 185 + Math.random() * 10;
        const risk = 0.15 + Math.random() * 0.5;
        const rrRatio = 1.5 + Math.random() * 2;
        if (direction === "BUY") {
          sl = entry - risk;
          tp = entry + risk * rrRatio;
          exitPrice = isWin ? entry + risk * (0.5 + Math.random() * rrRatio) : entry - risk * (0.3 + Math.random() * 0.7);
        } else {
          sl = entry + risk;
          tp = entry - risk * rrRatio;
          exitPrice = isWin ? entry - risk * (0.5 + Math.random() * rrRatio) : entry + risk * (0.3 + Math.random() * 0.7);
        }
        result = direction === "BUY" ? (exitPrice - entry) * lots * 1000 / entry * 100000 : (entry - exitPrice) * lots * 1000 / entry * 100000;
        // Simplify: use pip value
        result = direction === "BUY" ? (exitPrice - entry) * lots * 100000 / entry : (entry - exitPrice) * lots * 100000 / entry;
      } else {
        // Standard forex pairs
        entry = asset === "EUR/USD" ? 1.05 + Math.random() * 0.1 : asset === "GBP/USD" ? 1.25 + Math.random() * 0.08 : asset === "AUD/USD" ? 0.64 + Math.random() * 0.05 : asset === "NZD/USD" ? 0.58 + Math.random() * 0.04 : asset === "USD/CHF" ? 0.87 + Math.random() * 0.05 : 1.35 + Math.random() * 0.04;
        const risk = 0.001 + Math.random() * 0.003; // 10-40 pips
        const rrRatio = 1.5 + Math.random() * 2;
        if (direction === "BUY") {
          sl = entry - risk;
          tp = entry + risk * rrRatio;
          exitPrice = isWin ? entry + risk * (0.5 + Math.random() * rrRatio) : entry - risk * (0.3 + Math.random() * 0.7);
        } else {
          sl = entry + risk;
          tp = entry - risk * rrRatio;
          exitPrice = isWin ? entry - risk * (0.5 + Math.random() * rrRatio) : entry + risk * (0.3 + Math.random() * 0.7);
        }
        result = direction === "BUY" ? (exitPrice - entry) * lots * 100000 : (entry - exitPrice) * lots * 100000;
      }

      // Round values
      const decimals = asset.includes("JPY") ? 3 : asset === "XAU/USD" ? 2 : 5;
      entry = parseFloat(entry.toFixed(decimals));
      exitPrice = parseFloat(exitPrice.toFixed(decimals));
      sl = parseFloat(sl.toFixed(decimals));
      tp = parseFloat(tp.toFixed(decimals));
      result = parseFloat(result.toFixed(2));

      // Trade hour (8h-20h, weighted toward London/NY sessions)
      const hour = Math.random() < 0.6 ? 8 + Math.floor(Math.random() * 8) : 16 + Math.floor(Math.random() * 4);
      const minute = Math.floor(Math.random() * 60);
      const tradeDate = new Date(currentDate);
      tradeDate.setHours(hour, minute, 0, 0);

      // Duration: 5min to 8h
      const duration = Math.floor(Math.random() * 480) + 5;

      // Commission & swap
      const commission = parseFloat((lots * (2 + Math.random() * 5)).toFixed(2));
      const swap = Math.random() < 0.3 ? parseFloat(((Math.random() - 0.5) * 5).toFixed(2)) : 0;

      trades.push({
        date: tradeDate,
        asset,
        direction,
        strategy,
        strategyId,
        entry,
        exit: exitPrice,
        sl,
        tp,
        lots,
        result,
        emotion,
        setup,
        duration,
        commission,
        swap,
        notes: "",
        userId: user.id,
      });

      tradeCount++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`Creating ${tradeCount} trades...`);

  // Batch insert
  const created = await prisma.trade.createMany({
    data: trades,
  });

  console.log(`Successfully created ${created.count} trades over 2 months`);

  // Show summary
  const wins = trades.filter((t) => t.result > 0).length;
  const totalPnl = trades.reduce((s, t) => s + t.result, 0);
  console.log(`Win rate: ${((wins / trades.length) * 100).toFixed(1)}%`);
  console.log(`Total P&L: ${totalPnl.toFixed(2)}€`);
  console.log(`Avg trade: ${(totalPnl / trades.length).toFixed(2)}€`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
