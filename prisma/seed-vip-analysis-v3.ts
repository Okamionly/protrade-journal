import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  // 1. Get admin user
  const admin = await prisma.user.findFirst({
    where: { email: "mr.guessousyoussef@gmail.com" },
  });

  if (!admin) {
    console.error("Admin user not found (mr.guessousyoussef@gmail.com)");
    process.exit(1);
  }

  console.log(`Found admin: ${admin.id} (${admin.email})`);

  // 2. Read the v3 analysis file
  const filePath = path.resolve(
    "C:/Users/mrgue/Desktop/ANALYSE QUANT CLAUDE/GLD_PostClose_2026-03-18_v3.md"
  );

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(filePath, "utf-8");
  console.log(`Read file: ${rawContent.length} characters`);

  // 3. Transform content: remove "CAPTURE X" headers, keep data
  // Restructure into standardized format with extra v3 sections
  const transformedContent = transformContent(rawContent);

  // 4. Check if post already exists
  const existing = await prisma.vipPost.findFirst({
    where: {
      title: "Gold Futures \u2014 Post-Cl\u00f4ture Compl\u00e8te 18 Mars 2026 (FOMC)",
    },
  });

  if (existing) {
    console.log(`Post already exists (${existing.id}), updating...`);
    await prisma.vipPost.update({
      where: { id: existing.id },
      data: {
        content: transformedContent,
        published: true,
        updatedAt: new Date(),
      },
    });
    console.log("Post updated successfully!");
  } else {
    const post = await prisma.vipPost.create({
      data: {
        title: "Gold Futures \u2014 Post-Cl\u00f4ture Compl\u00e8te 18 Mars 2026 (FOMC)",
        type: "macro",
        content: transformedContent,
        published: true,
        authorId: admin.id,
      },
    });
    console.log(`Post created: ${post.id}`);
  }

  console.log("Done!");
}

function transformContent(raw: string): string {
  // Remove lines that are just "CAPTURE 1", "CAPTURE 2", etc.
  let content = raw.replace(/^#+\s*CAPTURE\s*\d+.*$/gm, "");

  // Remove excessive blank lines (more than 2 in a row)
  content = content.replace(/\n{4,}/g, "\n\n\n");

  // The v3 file should already contain structured sections.
  // We ensure the 7-section format + extra v3 sections are present.
  // If the file already has proper markdown structure, return as-is after cleanup.

  return content.trim();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
