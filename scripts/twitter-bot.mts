/**
 * MarketPhase Twitter/X Bot
 *
 * Automated tweet posting for MarketPhase trading journal promotion.
 * Uses pre-written tweets from tweets-bank.json organized by category.
 *
 * Usage:
 *   npx tsx scripts/twitter-bot.ts                  # Post a random tweet now
 *   npx tsx scripts/twitter-bot.ts --dry-run        # Preview without posting
 *   npx tsx scripts/twitter-bot.ts --schedule       # Run scheduler (9am, 12pm, 5pm EST)
 *   npx tsx scripts/twitter-bot.ts --category tips  # Post from specific category
 *   npx tsx scripts/twitter-bot.ts --thread feat-6  # Post a specific thread by ID
 *   npx tsx scripts/twitter-bot.ts --list           # List all tweet IDs
 *
 * Environment variables:
 *   TWITTER_API_KEY        - Twitter API key (consumer key)
 *   TWITTER_API_SECRET     - Twitter API secret (consumer secret)
 *   TWITTER_ACCESS_TOKEN   - Twitter access token
 *   TWITTER_ACCESS_SECRET  - Twitter access token secret
 */

import { TwitterApi } from "twitter-api-v2";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SingleTweet {
  id: string;
  type: "single";
  text: string;
}

interface ThreadTweet {
  id: string;
  type: "thread";
  tweets: string[];
}

type TweetEntry = SingleTweet | ThreadTweet;

type CategoryKey =
  | "feature_showcase"
  | "trading_tips"
  | "motivational"
  | "engagement"
  | "memes_relatable";

interface TweetsBank {
  categories: Record<CategoryKey, TweetEntry[]>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_SHORT_NAMES: Record<string, CategoryKey> = {
  features: "feature_showcase",
  feature: "feature_showcase",
  feat: "feature_showcase",
  tips: "trading_tips",
  tip: "trading_tips",
  motivational: "motivational",
  motivation: "motivational",
  engage: "engagement",
  engagement: "engagement",
  memes: "memes_relatable",
  meme: "memes_relatable",
  relatable: "memes_relatable",
};

/** Optimal posting times in EST (America/New_York) */
const SCHEDULE_HOURS_EST = [9, 12, 17]; // 9am, 12pm, 5pm

/** Weighted distribution — features and tips appear more often */
const CATEGORY_WEIGHTS: Record<CategoryKey, number> = {
  feature_showcase: 3,
  trading_tips: 3,
  motivational: 2,
  engagement: 2,
  memes_relatable: 2,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadTweetsBank(): TweetsBank {
  const bankPath = path.join(__dirname, "tweets-bank.json");
  const raw = fs.readFileSync(bankPath, "utf-8");
  return JSON.parse(raw) as TweetsBank;
}

function getAllTweets(bank: TweetsBank): TweetEntry[] {
  return Object.values(bank.categories).flat();
}

function getPostedIdsPath(): string {
  return path.join(__dirname, ".twitter-bot-posted.json");
}

function loadPostedIds(): Set<string> {
  const filePath = getPostedIdsPath();
  if (!fs.existsSync(filePath)) return new Set();
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function savePostedId(id: string): void {
  const posted = loadPostedIds();
  posted.add(id);
  fs.writeFileSync(getPostedIdsPath(), JSON.stringify([...posted], null, 2));
}

function resetPostedIdsIfExhausted(
  available: TweetEntry[],
  posted: Set<string>
): Set<string> {
  const allIds = available.map((t) => t.id);
  const remaining = allIds.filter((id) => !posted.has(id));
  if (remaining.length === 0) {
    console.log(
      "[bot] All tweets have been posted. Resetting rotation cycle.\n"
    );
    fs.writeFileSync(getPostedIdsPath(), JSON.stringify([], null, 2));
    return new Set();
  }
  return posted;
}

/** Pick a weighted random category */
function pickRandomCategory(): CategoryKey {
  const entries = Object.entries(CATEGORY_WEIGHTS) as [CategoryKey, number][];
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * totalWeight;
  for (const [cat, weight] of entries) {
    rand -= weight;
    if (rand <= 0) return cat;
  }
  return entries[entries.length - 1][0];
}

/** Pick a random unposted tweet, optionally from a specific category */
function pickTweet(
  bank: TweetsBank,
  posted: Set<string>,
  category?: CategoryKey
): TweetEntry | null {
  const pool = category
    ? bank.categories[category]
    : bank.categories[pickRandomCategory()];

  const unposted = pool.filter((t) => !posted.has(t.id));
  if (unposted.length === 0) {
    // Fallback: try all categories
    const allUnposted = getAllTweets(bank).filter((t) => !posted.has(t.id));
    if (allUnposted.length === 0) return null;
    return allUnposted[Math.floor(Math.random() * allUnposted.length)];
  }
  return unposted[Math.floor(Math.random() * unposted.length)];
}

function findTweetById(bank: TweetsBank, id: string): TweetEntry | undefined {
  return getAllTweets(bank).find((t) => t.id === id);
}

function createClient(): TwitterApi {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.error(
      "[bot] Missing Twitter API credentials. Required env vars:\n" +
        "  TWITTER_API_KEY\n" +
        "  TWITTER_API_SECRET\n" +
        "  TWITTER_ACCESS_TOKEN\n" +
        "  TWITTER_ACCESS_SECRET"
    );
    process.exit(1);
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  });
}

// ---------------------------------------------------------------------------
// Posting logic
// ---------------------------------------------------------------------------

async function postSingleTweet(
  client: TwitterApi,
  text: string,
  dryRun: boolean
): Promise<string | null> {
  if (dryRun) {
    console.log("[dry-run] Would post tweet:");
    console.log(`  "${text}"\n`);
    return null;
  }

  const result = await client.v2.tweet(text);
  console.log(`[bot] Tweet posted! ID: ${result.data.id}`);
  return result.data.id;
}

async function postThread(
  client: TwitterApi,
  tweets: string[],
  dryRun: boolean
): Promise<string | null> {
  if (dryRun) {
    console.log("[dry-run] Would post thread:");
    tweets.forEach((t, i) => {
      console.log(`  [${i + 1}/${tweets.length}] "${t}"\n`);
    });
    return null;
  }

  let lastTweetId: string | null = null;

  for (let i = 0; i < tweets.length; i++) {
    const options: { text: string; reply?: { in_reply_to_tweet_id: string } } = {
      text: tweets[i],
    };

    if (lastTweetId) {
      options.reply = { in_reply_to_tweet_id: lastTweetId };
    }

    const result = await client.v2.tweet(options);
    lastTweetId = result.data.id;
    console.log(
      `[bot] Thread ${i + 1}/${tweets.length} posted. ID: ${lastTweetId}`
    );
  }

  return lastTweetId;
}

async function postTweet(
  entry: TweetEntry,
  dryRun: boolean,
  client?: TwitterApi
): Promise<void> {
  const api = dryRun ? (null as unknown as TwitterApi) : client!;

  console.log(`[bot] Posting: ${entry.id} (${entry.type})`);

  if (entry.type === "thread") {
    await postThread(api, entry.tweets, dryRun);
  } else {
    await postSingleTweet(api, entry.text, dryRun);
  }

  if (!dryRun) {
    savePostedId(entry.id);
  }
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

function msUntilNextSlot(): { ms: number; hour: number } {
  const now = new Date();
  // Get current time in EST
  const estString = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  const est = new Date(estString);

  const currentHour = est.getHours();
  const currentMinutes = est.getMinutes();
  const currentTotal = currentHour * 60 + currentMinutes;

  // Find the next scheduled slot
  for (const hour of SCHEDULE_HOURS_EST) {
    const slotTotal = hour * 60;
    if (slotTotal > currentTotal) {
      const diffMinutes = slotTotal - currentTotal;
      return { ms: diffMinutes * 60 * 1000, hour };
    }
  }

  // All slots passed today — schedule for first slot tomorrow
  const firstSlot = SCHEDULE_HOURS_EST[0];
  const minutesLeftToday = 24 * 60 - currentTotal;
  const diffMinutes = minutesLeftToday + firstSlot * 60;
  return { ms: diffMinutes * 60 * 1000, hour: firstSlot };
}

function formatMs(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

async function runScheduler(dryRun: boolean): Promise<void> {
  const client = dryRun ? undefined : createClient();
  const bank = loadTweetsBank();

  console.log("[scheduler] MarketPhase Twitter Bot started");
  console.log(
    `[scheduler] Schedule: ${SCHEDULE_HOURS_EST.map((h) => `${h}:00`).join(", ")} EST`
  );
  console.log(`[scheduler] Dry run: ${dryRun}`);
  console.log(
    `[scheduler] Total tweets in bank: ${getAllTweets(bank).length}\n`
  );

  const scheduleNext = () => {
    const { ms, hour } = msUntilNextSlot();
    console.log(
      `[scheduler] Next post at ${hour}:00 EST (in ${formatMs(ms)})`
    );

    setTimeout(async () => {
      try {
        let posted = loadPostedIds();
        posted = resetPostedIdsIfExhausted(getAllTweets(bank), posted);

        const entry = pickTweet(bank, posted);
        if (entry) {
          await postTweet(entry, dryRun, client);
        } else {
          console.log("[scheduler] No tweets available to post.");
        }
      } catch (err) {
        console.error("[scheduler] Error posting tweet:", err);
      }

      // Schedule the next one
      scheduleNext();
    }, ms);
  };

  scheduleNext();

  // Keep process alive
  await new Promise(() => {});
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const schedule = args.includes("--schedule");
  const listMode = args.includes("--list");

  const bank = loadTweetsBank();

  // --list: show all tweet IDs by category
  if (listMode) {
    const posted = loadPostedIds();
    console.log("Tweet Bank Summary:\n");
    for (const [category, tweets] of Object.entries(bank.categories)) {
      console.log(`  ${category} (${tweets.length} tweets):`);
      for (const t of tweets) {
        const status = posted.has(t.id) ? " [posted]" : "";
        const typeTag = t.type === "thread" ? " (thread)" : "";
        console.log(`    - ${t.id}${typeTag}${status}`);
      }
      console.log();
    }
    const total = getAllTweets(bank).length;
    console.log(`Total: ${total} tweets | Posted: ${posted.size} | Remaining: ${total - posted.size}`);
    return;
  }

  // --schedule: run the scheduler loop
  if (schedule) {
    await runScheduler(dryRun);
    return;
  }

  // --thread <id>: post a specific thread/tweet by ID
  const threadIdx = args.indexOf("--thread");
  if (threadIdx !== -1) {
    const tweetId = args[threadIdx + 1];
    if (!tweetId) {
      console.error("Usage: --thread <tweet-id>");
      process.exit(1);
    }
    const entry = findTweetById(bank, tweetId);
    if (!entry) {
      console.error(`Tweet with ID "${tweetId}" not found.`);
      process.exit(1);
    }
    const client = dryRun ? undefined : createClient();
    await postTweet(entry, dryRun, client);
    return;
  }

  // --category <name>: post from a specific category
  const catIdx = args.indexOf("--category");
  let category: CategoryKey | undefined;
  if (catIdx !== -1) {
    const catName = args[catIdx + 1]?.toLowerCase();
    if (!catName) {
      console.error(
        `Usage: --category <${Object.keys(CATEGORY_SHORT_NAMES).join("|")}>`
      );
      process.exit(1);
    }
    category = CATEGORY_SHORT_NAMES[catName];
    if (!category) {
      console.error(
        `Unknown category "${catName}". Valid: ${Object.keys(CATEGORY_SHORT_NAMES).join(", ")}`
      );
      process.exit(1);
    }
  }

  // Default: post one random tweet
  let posted = loadPostedIds();
  posted = resetPostedIdsIfExhausted(getAllTweets(bank), posted);

  const entry = pickTweet(bank, posted, category);
  if (!entry) {
    console.log("[bot] No tweets available to post.");
    return;
  }

  const client = dryRun ? undefined : createClient();
  await postTweet(entry, dryRun, client);
}

main().catch((err) => {
  console.error("[bot] Fatal error:", err);
  process.exit(1);
});
