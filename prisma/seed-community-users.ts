/**
 * Seed 10 realistic French trader accounts with trades and community chat
 * Run: npx tsx prisma/seed-community-users.ts
 * Idempotent: safe to run multiple times (uses upsert / existence checks)
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// ── 10 French trader profiles ──────────────────────────────────────────────
const USERS = [
  { username: "Lucas_Trading",   email: "lucas.trading@gmail.com",      fullName: "Lucas Dupont" },
  { username: "MarineFX",        email: "marine.fx@gmail.com",          fullName: "Marine Lefebvre" },
  { username: "Antoine_Scalp",   email: "antoine.scalp@outlook.fr",     fullName: "Antoine Moreau" },
  { username: "SophieTrader",    email: "sophie.trader@gmail.com",      fullName: "Sophie Martin" },
  { username: "MaximeSwing",     email: "maxime.swing@hotmail.fr",      fullName: "Maxime Bernard" },
  { username: "ClaraDayTrade",   email: "clara.daytrade@gmail.com",     fullName: "Clara Rousseau" },
  { username: "ThomasAlgo",      email: "thomas.algo@proton.me",        fullName: "Thomas Petit" },
  { username: "JulieOptions",    email: "julie.options@gmail.com",      fullName: "Julie Garnier" },
  { username: "NicolasICT",      email: "nicolas.ict@outlook.fr",       fullName: "Nicolas Fournier" },
  { username: "EmmaForex",       email: "emma.forex@gmail.com",         fullName: "Emma Dubois" },
];

// ── Assets with realistic price ranges ─────────────────────────────────────
const ASSET_CONFIG: Record<string, { min: number; max: number; pip: number }> = {
  EURUSD:  { min: 1.0750, max: 1.0950, pip: 0.0001 },
  GBPUSD:  { min: 1.2600, max: 1.2800, pip: 0.0001 },
  USDJPY:  { min: 149.50, max: 152.00, pip: 0.01 },
  XAUUSD:  { min: 2280, max: 2420, pip: 0.10 },
  US30:    { min: 39200, max: 40800, pip: 1 },
  NAS100:  { min: 18200, max: 19400, pip: 1 },
};

const STRATEGIES = ["ICT", "SMC", "Scalping", "Swing", "Price Action"];
const EMOTIONS   = ["Confiant", "Neutre", "Stresse", "Euphorique"];
const SESSIONS   = ["London", "New York", "Asian"];

// ── Chat messages ──────────────────────────────────────────────────────────
const CHAT_MESSAGES: string[] = [
  "Long EURUSD a 1.0850, TP 1.0920. Le setup H4 est propre",
  "Grosse journee aujourd'hui, 3 trades gagnants sur le gold",
  "Quelqu'un trade les news NFP demain ?",
  "Mon setup ICT sur le GBPUSD a parfaitement fonctionne",
  "J'ai pris un short USDJPY apres le FVG en M15, SL au dessus du high",
  "Attention zone de supply sur le NAS100 a 19350, je surveille un rejet",
  "Session London explosive ce matin, +2.5R sur EURUSD",
  "Le gold continue son trend haussier, j'accumule sur les pullbacks",
  "Mon plan du jour : uniquement des setups A+ en session NY",
  "Qui est long sur le US30 ? Le breaker block en H1 a bien reagi",
  "Journee rouge pour moi, 2 SL touches sur le cable. Ca arrive",
  "J'ai commence a backtester la strat SMC sur 6 mois, 64% de winrate",
  "Le dollar montre des signes de faiblesse, attention aux paires USD",
  "Petit scalp rapide sur XAUUSD ce matin, +45 pips en 20 minutes",
  "N'oubliez pas : la patience est la cle. Pas de setup, pas de trade",
  "Belle OB en H4 sur le GBPUSD, j'attends la confirmation en M15 pour entrer",
  "3eme semaine consecutive positive, le journal de trading fait vraiment la difference",
  "Session asiatique calme, je me prepare pour London avec mes niveaux cles",
  "Stop loss touche sur NAS100 mais le plan etait respecte, pas de regret",
  "Le Price Action sur le daily EURUSD donne un biais clairement haussier cette semaine",
  "Resultat du mois : +8.3R avec 58% de winrate. Content mais je vise 65%",
  "Mon conseil : ne jamais deplacer son SL dans le sens de la perte",
  "J'utilise maintenant les killzones ICT, ca filtre enormement les mauvais setups",
  "Le USDJPY est dans une zone interessante, possible retournement si on casse 150.00",
  "Bonne soiree a tous, demain c'est CPI US, pas de position overnight pour moi",
  "Setup Swing sur XAUUSD : entry 2350, SL 2330, TP 2400. R:R 1:2.5",
  "La communaute ProTrade m'aide beaucoup a rester discipline, merci a tous",
  "Analyse du week-end : le marche est en range, je vais attendre un breakout clair",
  "Premier mois profitable depuis que j'ai reduit mes lots et augmente ma patience",
  "Le SMC fonctionne vraiment bien sur les indices, surtout en session NY",
  "Attention aux annonces BCE jeudi, volatilite attendue sur les paires EUR",
  "Mon setup prefere : Order Block + FVG + Liquidity sweep. Triple confluence",
  "Session NY terminee, +1.8R sur le gold. Le plan a ete suivi a la lettre",
  "Pour ceux qui debutent : commencez par maitriser UN seul asset, pas 10",
  "Le drawdown fait partie du jeu. L'important c'est de respecter son risk management",
  "Qui d'autre utilise le time frame M5 pour les entrees en scalping ?",
  "Gros mouvement sur le GBPUSD apres les donnees UK, j'ai rate l'entree",
  "Mon objectif ce trimestre : passer de 1% a 1.5% de risque par trade progressivement",
  "Trade partage : Short NAS100 a 19280, SL 19340, TP 19100. Setup SMC clean",
  "Felicitations a MaximeSwing pour sa serie de 8 trades gagnants !",
  "Je teste une nouvelle approche avec les sessions de Londres, resultats la semaine prochaine",
  "Le backtest de ma strategie ICT donne un profit factor de 2.3, je suis confiant",
  "Rappel : toujours prendre des screenshots de vos setups, c'est precieux pour le review",
  "XAUUSD a touche les 2400, exactement mon TP. Patience recompensee",
  "Bilan hebdo : 5 trades, 3W 2L, +3.1R. Semaine solide",
];

// Messages that reference shared trades
const TRADE_SHARE_MESSAGES: string[] = [
  "Voici mon trade du jour, setup ICT textbook",
  "Trade partage : belle execution sur ce niveau",
  "Regardez ce setup, le price action etait limpide",
  "Mon meilleur trade de la semaine, R:R 1:3",
  "Voila comment j'ai trade le breakout ce matin",
  "Setup Swing valide, je partage pour la communaute",
  "Analyse complete dans le journal, voici le resultat",
  "Ce trade montre bien l'importance de la patience",
  "Short propre sur la supply zone, trade partage",
  "Entry parfaite grace au FVG en M15",
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((min + Math.random() * (max - min)).toFixed(decimals));
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** Date within the last N days, at a realistic trading hour */
function tradingDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  // Trading hours: 7-22 UTC (covers Asian through NY close)
  const hour = randInt(7, 22);
  const minute = randInt(0, 59);
  d.setHours(hour, minute, randInt(0, 59), 0);
  return d;
}

/** Spread user creation dates over the last ~60 days */
function accountCreatedAt(index: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - 60 + index * 5 + randInt(0, 4));
  d.setHours(randInt(8, 20), randInt(0, 59), 0, 0);
  return d;
}

function generateTrade(userId: string) {
  const asset = rand(Object.keys(ASSET_CONFIG));
  const cfg = ASSET_CONFIG[asset];
  const direction = Math.random() > 0.5 ? "BUY" : "SELL";
  const strategy = rand(STRATEGIES);
  const emotion = rand(EMOTIONS);
  const session = rand(SESSIONS);
  const isWin = Math.random() < 0.60;

  const entry = randFloat(cfg.min, cfg.max, asset.includes("JPY") ? 2 : asset === "XAUUSD" ? 2 : asset === "US30" || asset === "NAS100" ? 0 : 4);

  // Distance in pips (varies by asset)
  let slPips: number, tpPips: number;
  if (asset === "XAUUSD") {
    slPips = randFloat(8, 25, 1);
    tpPips = randFloat(15, 60, 1);
  } else if (asset === "US30" || asset === "NAS100") {
    slPips = randFloat(30, 120, 0);
    tpPips = randFloat(60, 250, 0);
  } else if (asset === "USDJPY") {
    slPips = randFloat(0.15, 0.50, 2);
    tpPips = randFloat(0.30, 1.00, 2);
  } else {
    slPips = randFloat(0.0010, 0.0040, 4);
    tpPips = randFloat(0.0020, 0.0080, 4);
  }

  const sign = direction === "BUY" ? 1 : -1;
  const sl = parseFloat((entry - sign * slPips).toFixed(5));
  const tp = parseFloat((entry + sign * tpPips).toFixed(5));

  let exit: number;
  if (isWin) {
    // Won: exit between entry and TP
    const winFraction = randFloat(0.5, 1.0);
    exit = parseFloat((entry + sign * tpPips * winFraction).toFixed(5));
  } else {
    // Lost: exit near SL
    const lossFraction = randFloat(0.6, 1.0);
    exit = parseFloat((entry - sign * slPips * lossFraction).toFixed(5));
  }

  const lots = rand([0.05, 0.1, 0.2, 0.3, 0.5, 1.0]);
  let result: number;
  if (asset === "XAUUSD") {
    result = isWin ? randFloat(40, 800) : -randFloat(20, 350);
  } else if (asset === "US30" || asset === "NAS100") {
    result = isWin ? randFloat(50, 600) : -randFloat(25, 300);
  } else {
    result = isWin ? randFloat(30, 500) : -randFloat(15, 250);
  }

  return {
    date: tradingDate(30),
    asset,
    direction,
    strategy,
    entry,
    exit,
    sl,
    tp,
    lots,
    result,
    emotion,
    setup: `${strategy} - ${session}`,
    rating: isWin ? randInt(3, 5) : randInt(1, 3),
    notes: isWin ? rand(["Plan respecte", "Belle execution", "Patience payante", "Setup A+", null]) : rand(["SL touche", "Sorti trop tot", "Entry precipitee", "A revoir", null]),
    duration: randInt(5, 480),
    commission: randFloat(0.5, 4.0),
    swap: randFloat(-2, 2),
    userId,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Seeding 10 French community users...\n");

  const password = await hash("Test1234!", 12);
  const createdUsers: { id: string; name: string }[] = [];

  // 1. Upsert users
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.username,
        email: u.email,
        password,
        role: "USER",
        balance: randFloat(20000, 50000),
        createdAt: accountCreatedAt(i),
      },
    });
    console.log(`  [OK] ${u.username} (${u.email})`);
    createdUsers.push({ id: user.id, name: u.username });
  }

  // 2. Create trades (5-10 per user)
  console.log("\nCreating trades...");
  const allTradeIds: { id: string; userId: string; result: number; asset: string }[] = [];

  for (const user of createdUsers) {
    // Check if this user already has trades (idempotency)
    const existingCount = await prisma.trade.count({ where: { userId: user.id } });
    if (existingCount > 0) {
      console.log(`  ${user.name}: already has ${existingCount} trades, skipping`);
      const existing = await prisma.trade.findMany({
        where: { userId: user.id },
        select: { id: true, userId: true, result: true, asset: true },
      });
      allTradeIds.push(...existing);
      continue;
    }

    const count = randInt(5, 10);
    for (let i = 0; i < count; i++) {
      const data = generateTrade(user.id);
      const trade = await prisma.trade.create({ data });
      allTradeIds.push({ id: trade.id, userId: trade.userId, result: data.result, asset: data.asset });
    }
    console.log(`  ${user.name}: ${count} trades created`);
  }

  // 3. Find or create "Communaute" room
  console.log("\nEnsuring Communaute chat room...");
  let room = await prisma.chatRoom.findUnique({ where: { name: "Communaute" } });
  if (!room) {
    room = await prisma.chatRoom.create({
      data: { name: "Communaute", description: "Salon communautaire ProTrade", icon: "MessageCircle", order: 0 },
    });
    console.log("  Created Communaute room");
  } else {
    console.log("  Communaute room already exists");
  }

  // 4. Check if messages already exist for idempotency
  const existingMsgCount = await prisma.chatMessage.count({
    where: {
      roomId: room.id,
      userId: { in: createdUsers.map(u => u.id) },
    },
  });

  if (existingMsgCount > 10) {
    console.log(`\n  Messages already seeded (${existingMsgCount} found). Skipping message creation.`);
  } else {
    // 5. Create 45 chat messages spread over last 14 days
    console.log("\nCreating community chat messages...");

    const shuffled = [...CHAT_MESSAGES].sort(() => Math.random() - 0.5).slice(0, 45);

    for (let i = 0; i < shuffled.length; i++) {
      const user = rand(createdUsers);
      const d = new Date();
      d.setDate(d.getDate() - Math.floor(Math.random() * 14));
      // Realistic trading hours in CET (8h-22h)
      const hour = rand([8, 9, 9, 10, 10, 11, 14, 14, 15, 15, 16, 16, 17, 20, 21]);
      d.setHours(hour, randInt(0, 59), randInt(0, 59), 0);

      await prisma.chatMessage.create({
        data: {
          content: shuffled[i],
          userId: user.id,
          roomId: room.id,
          createdAt: d,
        },
      });
    }
    console.log(`  ${shuffled.length} chat messages created`);

    // 6. Create trade-share messages (linking trades)
    console.log("\nCreating trade share messages...");
    const winningTrades = allTradeIds.filter(t => t.result > 0).sort(() => Math.random() - 0.5).slice(0, 10);

    for (let i = 0; i < winningTrades.length; i++) {
      const trade = winningTrades[i];
      const d = new Date();
      d.setDate(d.getDate() - randInt(0, 10));
      d.setHours(rand([10, 11, 15, 16, 17, 20]), randInt(0, 59), 0, 0);

      await prisma.chatMessage.create({
        data: {
          content: TRADE_SHARE_MESSAGES[i % TRADE_SHARE_MESSAGES.length],
          userId: trade.userId,
          roomId: room.id,
          tradeId: trade.id,
          createdAt: d,
        },
      });
    }
    console.log(`  ${winningTrades.length} trade share messages created`);

    // 7. Add some reactions
    console.log("\nAdding reactions...");
    const recentMessages = await prisma.chatMessage.findMany({
      where: { roomId: room.id, userId: { in: createdUsers.map(u => u.id) } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const emojis = ["fire", "thumbsup", "chart_increasing", "target", "muscle", "brain", "check"];
    let reactionCount = 0;

    for (const msg of recentMessages) {
      const numReactions = randInt(0, 4);
      const reactors = [...createdUsers].sort(() => Math.random() - 0.5).slice(0, numReactions);
      for (const reactor of reactors) {
        try {
          await prisma.reaction.create({
            data: { emoji: rand(emojis), userId: reactor.id, messageId: msg.id },
          });
          reactionCount++;
        } catch {
          // unique constraint violation = skip
        }
      }
    }
    console.log(`  ${reactionCount} reactions added`);
  }

  // Summary
  const totalTrades = allTradeIds.length;
  const wins = allTradeIds.filter(t => t.result > 0).length;
  console.log("\n--- Seed complete ---");
  console.log(`  Users:    ${createdUsers.length}`);
  console.log(`  Trades:   ${totalTrades} (${wins}W / ${totalTrades - wins}L = ${((wins / totalTrades) * 100).toFixed(0)}% WR)`);
  console.log(`  Room:     ${room.name} (${room.id})`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
