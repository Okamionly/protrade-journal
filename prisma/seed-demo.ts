import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "NAS100", "US30", "GOLD", "AAPL", "TSLA", "NVDA", "SPY", "BTC/USD"];
const STRATEGIES = [
  { name: "Breakout", color: "#10b981" },
  { name: "Supply & Demand", color: "#06b6d4" },
  { name: "Order Block", color: "#8b5cf6" },
  { name: "Scalping", color: "#f59e0b" },
  { name: "Trend Following", color: "#3b82f6" },
];
const EMOTIONS = ["Confiant", "Calme", "Hésitant", "Excité", "Stressé", "Neutre", "Impatient", "Discipliné", "FOMO", "Revenge"];
const SETUPS = ["Asian Breakout", "London Open", "NY Session", "News Trade", "Range Break", "Pullback", "Reversal", "Continuation"];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🌱 Seeding demo data...");

  // Create demo user
  const password = await hash("Demo1234!", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@marketphase.app" },
    update: {},
    create: {
      email: "demo@marketphase.app",
      password,
      name: "Trader Demo",
      balance: 25000,
    },
  });

  console.log(`✅ User: ${user.email} (id: ${user.id})`);

  // Create strategies
  const strategyRecords = [];
  for (const s of STRATEGIES) {
    const strat = await prisma.strategy.upsert({
      where: { userId_name: { userId: user.id, name: s.name } },
      update: {},
      create: { name: s.name, color: s.color, userId: user.id, description: `Stratégie ${s.name}` },
    });
    strategyRecords.push(strat);
  }
  console.log(`✅ ${strategyRecords.length} strategies created`);

  // Create tags
  const tagNames = ["Tendance", "Range", "High-Impact News", "Confluence", "Liquidity Grab", "FVG", "OB", "Breakout", "Reversal"];
  for (const name of tagNames) {
    await prisma.tag.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: {},
      create: { name, color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`, userId: user.id },
    });
  }
  console.log(`✅ ${tagNames.length} tags created`);

  // Generate 75 trades over the last 3 months
  const trades = [];
  const now = new Date();

  for (let i = 0; i < 75; i++) {
    const daysAgo = Math.floor(rand(1, 90));
    const date = new Date(now.getTime() - daysAgo * 86400000);
    // Skip weekends
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    // Set hour between 8-20
    date.setHours(Math.floor(rand(8, 20)), Math.floor(rand(0, 59)));

    const asset = pick(ASSETS);
    const direction = Math.random() > 0.48 ? "LONG" : "SHORT";
    const strat = pick(strategyRecords);

    // Price ranges by asset
    let basePrice = 1.1;
    if (asset === "GBP/USD") basePrice = 1.27;
    else if (asset === "USD/JPY") basePrice = 148;
    else if (asset === "NAS100") basePrice = 21500;
    else if (asset === "US30") basePrice = 43000;
    else if (asset === "GOLD") basePrice = 2350;
    else if (asset === "AAPL") basePrice = 230;
    else if (asset === "TSLA") basePrice = 280;
    else if (asset === "NVDA") basePrice = 140;
    else if (asset === "SPY") basePrice = 580;
    else if (asset === "BTC/USD") basePrice = 95000;

    const priceVariation = basePrice * 0.001;
    const entry = basePrice + rand(-priceVariation * 5, priceVariation * 5);

    // 58% win rate
    const isWin = Math.random() < 0.58;
    const rrRatio = isWin ? rand(1, 4) : rand(0.3, 1);

    const slDistance = rand(priceVariation * 0.5, priceVariation * 3);
    const sl = direction === "LONG" ? entry - slDistance : entry + slDistance;
    const tpDistance = slDistance * rand(1.5, 4);
    const tp = direction === "LONG" ? entry + tpDistance : entry - tpDistance;

    let exit: number;
    if (isWin) {
      const exitDistance = slDistance * rrRatio;
      exit = direction === "LONG" ? entry + exitDistance : entry - exitDistance;
    } else {
      const exitLoss = slDistance * rand(0.5, 1.2);
      exit = direction === "LONG" ? entry - exitLoss : entry + exitLoss;
    }

    const lots = parseFloat(rand(0.01, 2.0).toFixed(2));
    // Calculate result based on lots and price movement
    let pipValue = 10; // default for forex
    if (["NAS100", "US30"].includes(asset)) pipValue = 1;
    else if (asset === "GOLD") pipValue = 100;
    else if (["AAPL", "TSLA", "NVDA", "SPY"].includes(asset)) pipValue = 100;
    else if (asset === "BTC/USD") pipValue = 1;

    const result = parseFloat(
      ((direction === "LONG" ? exit - entry : entry - exit) * lots * pipValue).toFixed(2)
    );

    const commission = parseFloat(rand(1, 8).toFixed(2));
    const duration = Math.floor(rand(5, 480)); // 5 min to 8 hours

    trades.push({
      date,
      asset,
      direction,
      strategy: strat.name,
      strategyId: strat.id,
      entry: parseFloat(entry.toFixed(asset.includes("/") ? 5 : 2)),
      exit: parseFloat(exit.toFixed(asset.includes("/") ? 5 : 2)),
      sl: parseFloat(sl.toFixed(asset.includes("/") ? 5 : 2)),
      tp: parseFloat(tp.toFixed(asset.includes("/") ? 5 : 2)),
      lots,
      result,
      emotion: pick(EMOTIONS),
      setup: pick(SETUPS),
      rating: Math.floor(rand(1, 6)),
      notes: isWin
        ? pick(["Bonne entrée, setup propre", "Patience payée", "Trend following classique", "Entrée sur OB + FVG", "Exécution parfaite du plan"])
        : pick(["SL touché, mouvement contre moi", "Entrée trop tôt", "News imprévue", "Mauvais timing", "Pas attendu la confirmation"]),
      duration,
      commission,
      swap: parseFloat(rand(-3, 3).toFixed(2)),
      userId: user.id,
    });
  }

  // Insert all trades
  const created = await prisma.trade.createMany({ data: trades });
  console.log(`✅ ${created.count} trades created`);

  // Create some monthly goals
  const months = [
    { month: now.getMonth(), year: now.getFullYear() },
    { month: now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1, year: now.getMonth() - 1 < 0 ? now.getFullYear() - 1 : now.getFullYear() },
  ];
  for (const { month, year } of months) {
    await prisma.monthlyGoal.create({
      data: {
        userId: user.id,
        month,
        year,
        targetPnl: 2000,
        targetTrades: 25,
        targetWinRate: 60,
      },
    });
  }
  console.log("✅ Monthly goals created");

  // Create trading rules
  const rules = [
    "Ne pas trader avant 9h30",
    "Maximum 3 trades par jour",
    "Risque max 2% par trade",
    "Toujours attendre la confirmation",
    "Pas de trading le vendredi après-midi",
  ];
  for (let i = 0; i < rules.length; i++) {
    await prisma.tradingRule.create({
      data: { userId: user.id, text: rules[i], order: i },
    });
  }
  console.log("✅ Trading rules created");

  console.log("\n🎉 Demo data seeded successfully!");
  console.log(`📧 Login: demo@marketphase.app`);
  console.log(`🔑 Password: Demo1234!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
