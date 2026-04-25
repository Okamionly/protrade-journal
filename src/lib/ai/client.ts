import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Singleton Anthropic client.
 *
 * Reads ANTHROPIC_API_KEY from env. Throws a typed error at call-site
 * if the key is missing so the route can return a clean 503.
 */
let cached: Anthropic | null = null;

export class MissingApiKeyError extends Error {
  code = "ANTHROPIC_API_KEY_MISSING" as const;
  constructor() {
    super("ANTHROPIC_API_KEY not configured on server");
  }
}

export function getAnthropicClient(): Anthropic {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new MissingApiKeyError();
  cached = new Anthropic({ apiKey: key });
  return cached;
}

/** Default model — Claude 4.5 Sonnet (vision-capable, fast, cheap with caching). */
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

/* ─────────────────────────────────────────────────────────────────────── */
/*  Image helpers                                                          */
/* ─────────────────────────────────────────────────────────────────────── */

const ALLOWED_IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const MIME_BY_EXT: Record<string, "image/png" | "image/jpeg" | "image/webp" | "image/gif"> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Convert a public-asset URL like "/uploads/abc.png" to an Anthropic
 * vision content block (base64-encoded). Returns null if the file
 * cannot be read or the mime type is unsupported.
 */
export async function localImageToContentBlock(
  url: string,
): Promise<Anthropic.ImageBlockParam | null> {
  if (!url.startsWith("/uploads/")) return null;
  const ext = url.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_IMAGE_EXT.has(ext)) return null;
  const media_type = MIME_BY_EXT[ext];
  if (!media_type) return null;

  const filepath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  try {
    const buf = await readFile(filepath);
    // Anthropic caps individual images at ~5MB — we already enforce 5MB on upload.
    return {
      type: "image",
      source: {
        type: "base64",
        media_type,
        data: buf.toString("base64"),
      },
    };
  } catch {
    return null;
  }
}
