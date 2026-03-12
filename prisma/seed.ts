import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rooms = [
  { name: "General", icon: "MessageCircle", description: "Discussion libre", order: 0 },
  { name: "Signaux", icon: "Signal", description: "Partage de signaux de trading", order: 1 },
  { name: "Stratégies", icon: "BookOpen", description: "Discussion de stratégies", order: 2 },
  { name: "Débutants", icon: "GraduationCap", description: "Questions et aide pour les débutants", order: 3 },
  { name: "Résultats", icon: "Trophy", description: "Partagez vos résultats", order: 4 },
];

async function main() {
  for (const room of rooms) {
    await prisma.chatRoom.upsert({
      where: { name: room.name },
      update: {},
      create: room,
    });
  }
  console.log("Seed: Chat rooms created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
