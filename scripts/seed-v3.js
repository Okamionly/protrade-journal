const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const p = new PrismaClient();

async function main() {
  const admin = await p.user.findUnique({
    where: { email: "mr.guessousyoussef@gmail.com" },
    select: { id: true },
  });
  if (!admin) { console.log("Admin not found"); return; }

  // Find the v3 file
  const dir = "C:\\Users\\mrgue\\Desktop\\ANALYSE QUANT CLAUDE";
  const files = fs.readdirSync(dir).filter(f => f.includes("v3"));
  if (files.length === 0) { console.log("No v3 file found"); return; }

  const filePath = path.join(dir, files[files.length - 1]);
  console.log("Reading:", filePath);

  let content = fs.readFileSync(filePath, "utf-8");
  console.log("Read", content.length, "chars");

  // Clean up
  content = content.replace(/^#+\s*CAPTURE\s*\d+.*$/gm, "");
  content = content.replace(/\n{4,}/g, "\n\n\n");
  content = content.trim();

  // Delete old macro/futures posts
  const deleted = await p.$executeRawUnsafe('DELETE FROM "VipPost" WHERE type != $1', 'indicator');
  console.log("Deleted old posts:", deleted);

  // Insert new post
  const id = crypto.randomBytes(12).toString("hex");
  await p.$executeRawUnsafe(
    'INSERT INTO "VipPost" (id, title, type, content, published, "createdAt", "updatedAt", "authorId") VALUES ($1, $2, $3, $4, true, NOW(), NOW(), $5)',
    id,
    "Gold Futures — Analyse Post-Cloture 18 Mars 2026 (FOMC)",
    "macro",
    content,
    admin.id
  );
  console.log("Created post:", id);

  // Update indicator script with full Pine code
  const scriptPath = path.join(dir, "..", "sniper-v3.pine");
  // We'll skip this if file doesn't exist

  console.log("Done!");
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
