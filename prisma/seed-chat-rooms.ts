/**
 * Seed chat rooms for Discord/Slack-like experience
 * Run: npx tsx prisma/seed-chat-rooms.ts
 * Idempotent: uses upsert, safe to run multiple times
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROOMS = [
  { name: "Général",    description: "Discussion générale",                          icon: "MessageCircle", order: 0 },
  { name: "Signaux",    description: "Partage de signaux de trading",                icon: "Signal",        order: 1 },
  { name: "Analyses",   description: "Analyses techniques et fondamentales",         icon: "BookOpen",      order: 2 },
  { name: "Débutants",  description: "Questions et aide pour les débutants",         icon: "GraduationCap", order: 3 },
  { name: "Forex",      description: "Discussion Forex spécifique",                  icon: "TrendingUp",    order: 4 },
  { name: "Indices",    description: "US30, NAS100, S&P500",                         icon: "Zap",           order: 5 },
  { name: "Crypto",     description: "Bitcoin, Ethereum, etc.",                      icon: "Star",          order: 6 },
  { name: "VIP Lounge", description: "Réservé aux membres VIP",                      icon: "Trophy",        order: 7 },
];

async function main() {
  console.log("Seeding chat rooms...\n");

  for (const room of ROOMS) {
    const existing = await prisma.chatRoom.findUnique({ where: { name: room.name } });
    if (existing) {
      // Update description/icon/order if room already exists
      await prisma.chatRoom.update({
        where: { name: room.name },
        data: { description: room.description, icon: room.icon, order: room.order },
      });
      console.log(`  [UPDATE] ${room.name} — ${room.description}`);
    } else {
      await prisma.chatRoom.create({ data: room });
      console.log(`  [CREATE] ${room.name} — ${room.description}`);
    }
  }

  // Clean up old rooms that are not in the new list
  const roomNames = ROOMS.map((r) => r.name);
  const oldRooms = await prisma.chatRoom.findMany({
    where: { name: { notIn: roomNames } },
    select: { name: true, _count: { select: { messages: true } } },
  });

  for (const old of oldRooms) {
    if (old._count.messages === 0) {
      await prisma.chatRoom.delete({ where: { name: old.name } });
      console.log(`  [DELETE] ${old.name} (empty, not in new list)`);
    } else {
      console.log(`  [KEEP]   ${old.name} (has ${old._count.messages} messages, not deleted)`);
    }
  }

  console.log("\n--- Chat rooms seed complete ---");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
