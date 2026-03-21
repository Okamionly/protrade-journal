/**
 * Seed 10 realistic trader accounts with community interactions
 * Run: npx tsx prisma/seed-community.ts
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const COMMUNITY_ROOM_ID = "comm-room-001";

// 10 realistic French trader profiles
const USERS = [
  { name: "Alexandre_FX", email: "alex.fx@example.com", style: "Swing trader Forex" },
  { name: "Sophie_Trades", email: "sophie.trades@example.com", style: "Day trader indices" },
  { name: "Marc_Crypto", email: "marc.crypto@example.com", style: "Crypto swing" },
  { name: "Camille_Gold", email: "camille.gold@example.com", style: "Gold & commodities" },
  { name: "Thomas_Scalp", email: "thomas.scalp@example.com", style: "Scalper DAX/NAS" },
  { name: "Léa_Macro", email: "lea.macro@example.com", style: "Macro trader" },
  { name: "Hugo_Options", email: "hugo.options@example.com", style: "Options trader" },
  { name: "Emma_Indices", email: "emma.indices@example.com", style: "S&P 500 specialist" },
  { name: "Lucas_Swing", email: "lucas.swing@example.com", style: "Multi-asset swing" },
  { name: "Chloé_Risk", email: "chloe.risk@example.com", style: "Risk management focus" },
];

const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "US30", "NAS100", "SPY", "GBP/JPY", "AUD/USD"];
const STRATEGIES = ["Supply & Demand", "Order Block", "Trend Following", "Breakout", "Scalping", "Mean Reversion"];
const EMOTIONS = ["Confiant", "Neutre", "Discipliné", "Prudent", "Concentré", "Calme"];

const COMMUNITY_MESSAGES = [
  // Trade analyses & discussions
  "Belle structure haussière sur EUR/USD en H4, zone de demand à 1.0850. J'attends un pullback pour entrer long 📈",
  "Attention au FOMC ce soir, je reste flat jusqu'à l'annonce. Pas de risque inutile avant les news 🔔",
  "Mon setup du jour : Order Block sur GBP/USD en M15, SL serré sous le dernier low. R:R 1:3 minimum",
  "3 trades ce matin, 2 gagnants 1 perdant. Le perdant c'était du revenge trading, je dois travailler là-dessus 🎯",
  "Quelqu'un d'autre voit la divergence RSI sur le Gold en daily ? Ça sent le retournement",
  "Session London propre aujourd'hui. Supply zone touchée sur USD/JPY, short pris à 153.20 ✅",
  "Journée rouge hier mais discipline respectée. SL jamais déplacé, c'est le plus important",
  "Le DXY montre une faiblesse claire, toutes les paires dollar devraient en bénéficier cette semaine",
  "Setup Breakout validé sur NAS100 au-dessus de 18500. Target 18800, SL 18350",
  "Conseil pour les débutants : ne tradez JAMAIS les 15 premières minutes de session, trop de bruit",
  "Ma règle #1 : jamais plus de 1% de risque par trade. C'est ce qui m'a sauvé pendant les drawdowns",
  "Analyse COT cette semaine : les commercials sont massivement long EUR, signal haussier à moyen terme",
  "BTC consolide entre 68K et 72K. Breakout imminent ? Je surveille le volume",
  "Backtest terminé sur ma stratégie Supply & Demand : 62% win rate sur 200 trades, PF 2.1 🔥",
  "Le calendrier éco de demain est chargé : CPI UK, PPI US, minutes BCE. Prudence",
  "Qui utilise les sessions Tokyo pour scalper ? J'ai de bons résultats sur AUD/USD pendant cette session",
  "Mon objectif ce mois : 15 trades max, qualité > quantité. Déjà 8 trades, 6 gagnants",
  "Pattern récurrent : je perds quand je trade l'après-midi. Mon edge est clairement le matin",
  "Stop loss touché sur GBP/JPY mais le setup était bon. Pas de regret, next trade",
  "Félicitations à tous ceux qui ont tenu leur plan cette semaine ! La discipline paie toujours 💪",
  "Nouveau record personnel : 12 trades gagnants d'affilée ! Merci la patience et la sélection de setup",
  "Le Gold a cassé les 2400$, prochain objectif 2500$ si le DXY continue de baisser",
  "Petite astuce : je note mon émotion AVANT chaque trade. Ça m'aide énormément à filtrer les mauvais trades",
  "Session NY explosive aujourd'hui. +3.5R sur un seul trade EUR/USD, belle journée",
  "Rappel : un bon trader n'est pas celui qui gagne le plus, c'est celui qui perd le moins quand il a tort",
  "Analyse hebdo : tendance haussière sur EUR/USD, range sur GBP/USD, baissier sur USD/JPY",
  "J'ai ajouté le Profit Factor à mon dashboard, game changer pour évaluer mes stratégies",
  "Weekend review : 4 trades cette semaine, 3W 1L, +4.2R total. Satisfait mais je peux mieux sélectionner",
  "Le spread s'élargit sur les exotiques en ce moment, restez sur les majors si possible",
  "Début de semaine calme, j'attends les niveaux clés avant d'entrer. Patience = profit",
];

// Helper functions
function randomDate(daysBack: number): Date {
  const now = new Date();
  const ms = now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function generateTrade(userId: string, daysBack: number) {
  const asset = randomFrom(ASSETS);
  const direction = Math.random() > 0.45 ? "BUY" : "SELL";
  const strategy = randomFrom(STRATEGIES);
  const emotion = randomFrom(EMOTIONS);
  const isWin = Math.random() < 0.6;

  let entry: number, exit: number, sl: number, tp: number, result: number;

  if (asset.includes("USD") && !asset.includes("BTC") && !asset.includes("XAU")) {
    entry = randomBetween(1.05, 1.15);
    const diff = randomBetween(0.001, 0.008);
    if (direction === "BUY") {
      exit = isWin ? entry + diff : entry - diff * 0.6;
      sl = entry - diff * 0.8;
      tp = entry + diff * 1.5;
    } else {
      exit = isWin ? entry - diff : entry + diff * 0.6;
      sl = entry + diff * 0.8;
      tp = entry - diff * 1.5;
    }
    result = isWin ? randomBetween(50, 800) : -randomBetween(30, 400);
  } else if (asset.includes("BTC")) {
    entry = randomBetween(65000, 75000);
    const diff = randomBetween(200, 2000);
    if (direction === "BUY") {
      exit = isWin ? entry + diff : entry - diff * 0.5;
      sl = entry - diff * 0.7;
      tp = entry + diff * 2;
    } else {
      exit = isWin ? entry - diff : entry + diff * 0.5;
      sl = entry + diff * 0.7;
      tp = entry - diff * 2;
    }
    result = isWin ? randomBetween(100, 2000) : -randomBetween(50, 1000);
  } else if (asset.includes("XAU")) {
    entry = randomBetween(2300, 2500);
    const diff = randomBetween(5, 40);
    if (direction === "BUY") {
      exit = isWin ? entry + diff : entry - diff * 0.5;
      sl = entry - diff * 0.7;
      tp = entry + diff * 1.8;
    } else {
      exit = isWin ? entry - diff : entry + diff * 0.5;
      sl = entry + diff * 0.7;
      tp = entry - diff * 1.8;
    }
    result = isWin ? randomBetween(80, 1500) : -randomBetween(40, 600);
  } else {
    // Indices
    entry = randomBetween(17000, 19000);
    const diff = randomBetween(20, 200);
    if (direction === "BUY") {
      exit = isWin ? entry + diff : entry - diff * 0.5;
      sl = entry - diff * 0.7;
      tp = entry + diff * 1.5;
    } else {
      exit = isWin ? entry - diff : entry + diff * 0.5;
      sl = entry + diff * 0.7;
      tp = entry - diff * 1.5;
    }
    result = isWin ? randomBetween(60, 1200) : -randomBetween(30, 500);
  }

  return {
    date: randomDate(daysBack),
    asset,
    direction,
    strategy,
    entry: Math.round(entry * 100) / 100,
    exit: Math.round(exit * 100) / 100,
    sl: Math.round(sl * 100) / 100,
    tp: Math.round(tp * 100) / 100,
    lots: randomFrom([0.1, 0.2, 0.5, 1.0, 0.3, 0.05]),
    result: Math.round(result * 100) / 100,
    emotion,
    setup: strategy,
    rating: isWin ? randomFrom([4, 5]) : randomFrom([2, 3]),
    userId,
    commission: randomBetween(0.5, 5),
    swap: randomBetween(-2, 2),
  };
}

async function main() {
  console.log("🚀 Seeding 10 community users...\n");

  const password = await hash("MarketPhase2026!", 12);
  const createdUsers: { id: string; name: string }[] = [];

  for (const u of USERS) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`  ⏩ ${u.name} already exists, skipping`);
      createdUsers.push({ id: existing.id, name: existing.name || u.name });
      continue;
    }

    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password,
        role: "USER",
      },
    });
    console.log(`  ✅ Created ${u.name} (${u.email})`);
    createdUsers.push({ id: user.id, name: user.name || u.name });
  }

  // Create trades for each user (5-15 trades each)
  console.log("\n📊 Creating trades for each user...");
  const allTrades: { id: string; userId: string; result: number; asset: string; direction: string }[] = [];

  for (const user of createdUsers) {
    const tradeCount = Math.floor(Math.random() * 11) + 5; // 5-15 trades
    for (let i = 0; i < tradeCount; i++) {
      const tradeData = generateTrade(user.id, 30);
      const trade = await prisma.trade.create({ data: tradeData });
      allTrades.push({ id: trade.id, userId: user.id, result: tradeData.result, asset: tradeData.asset, direction: tradeData.direction });
    }
    console.log(`  📈 ${user.name}: ${tradeCount} trades created`);
  }

  // Create community messages
  console.log("\n💬 Creating community messages...");

  // Verify community room exists
  const room = await prisma.chatRoom.findUnique({ where: { id: COMMUNITY_ROOM_ID } });
  if (!room) {
    console.log("  ❌ Community room not found! Creating...");
    await prisma.chatRoom.create({
      data: { id: COMMUNITY_ROOM_ID, name: "Communaute", description: "Salon communautaire MarketPhase" },
    });
  }

  // Create regular text messages (spread over last 7 days)
  const shuffledMessages = [...COMMUNITY_MESSAGES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < shuffledMessages.length; i++) {
    const user = randomFrom(createdUsers);
    const hoursAgo = Math.random() * 168; // last 7 days in hours
    const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    await prisma.chatMessage.create({
      data: {
        content: shuffledMessages[i],
        userId: user.id,
        roomId: COMMUNITY_ROOM_ID,
        createdAt,
      },
    });
  }
  console.log(`  ✅ ${shuffledMessages.length} text messages created`);

  // Create trade share messages (10 users sharing their best trades)
  const tradeShareMessages = [
    "Trade du jour ! 🎯",
    "Setup propre, exécution parfaite ✅",
    "Voilà pourquoi la patience paie 💰",
    "Mon meilleur trade de la semaine",
    "R:R respecté, plan suivi à la lettre",
    "Belle entrée sur ce niveau 📊",
    "La discipline, toujours la discipline 🧠",
    "Petit scalp rapide ce matin ⚡",
    "Swing trade validé, target atteint ! 🎯",
    "Trade partagé pour la communauté, analyse dans les commentaires",
    "Setup Order Block textbook 📚",
    "Supply zone touchée, short exécuté parfaitement",
    "Breakout confirmé, volume au rendez-vous",
    "Session London profitable, merci le plan de trading",
    "Nouveau setup testé, résultats prometteurs !",
  ];

  // Pick winning trades to share
  const winningTrades = allTrades.filter(t => t.result > 0).sort(() => Math.random() - 0.5).slice(0, 15);

  for (let i = 0; i < winningTrades.length; i++) {
    const trade = winningTrades[i];
    const hoursAgo = Math.random() * 120; // last 5 days
    const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    await prisma.chatMessage.create({
      data: {
        content: tradeShareMessages[i % tradeShareMessages.length],
        userId: trade.userId,
        roomId: COMMUNITY_ROOM_ID,
        tradeId: trade.id,
        createdAt,
      },
    });
  }
  console.log(`  ✅ ${winningTrades.length} trade share messages created`);

  // Create reactions on messages
  console.log("\n❤️ Adding reactions...");
  const allMessages = await prisma.chatMessage.findMany({
    where: { roomId: COMMUNITY_ROOM_ID },
    select: { id: true },
  });

  const emojis = ["🔥", "👍", "💪", "📈", "🎯", "💰", "✅", "🧠"];
  let reactionCount = 0;

  for (const msg of allMessages) {
    // Each message gets 0-5 random reactions
    const numReactions = Math.floor(Math.random() * 4);
    const reactors = [...createdUsers].sort(() => Math.random() - 0.5).slice(0, numReactions);

    for (const reactor of reactors) {
      try {
        await prisma.reaction.create({
          data: {
            emoji: randomFrom(emojis),
            userId: reactor.id,
            messageId: msg.id,
          },
        });
        reactionCount++;
      } catch {
        // Skip duplicates
      }
    }
  }
  console.log(`  ✅ ${reactionCount} reactions added`);

  console.log("\n🎉 Community seeding complete!");
  console.log(`   - ${createdUsers.length} users`);
  console.log(`   - ${allTrades.length} trades`);
  console.log(`   - ${shuffledMessages.length + winningTrades.length} messages`);
  console.log(`   - ${reactionCount} reactions`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
