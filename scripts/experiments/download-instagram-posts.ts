/**
 * Offline helper: download recent public Instagram posts for fashion / pose research.
 *
 * Usage:
 *   npx tsx scripts/experiments/download-instagram-posts.ts --accounts=casual,yoga,tennis,pickleball,climbing --limit=24
 *
 * Uses the public Instagram GraphQL cover endpoint by default (via experiments/fetch-instagram-posts.py),
 * or falls back to Apify when APIFY_TOKEN is set and --provider=apify is passed.
 *
 * Output lands under experiments/<account>-instagram/posts/ and is gitignored.
 */
import { loadEnvConfig } from "@next/env";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const OUT_ROOT = path.join(process.cwd(), "experiments");

/** Taste buckets used to expand wardrobe + Life templates. */
const ACCOUNT_BUCKETS: Record<string, string[]> = {
  casual: ["uniqlo", "cosstores", "arketofficial", "sportyandrich", "varley", "vuoriclothing"],
  yoga: ["aloyoga", "blogilates"],
  tennis: ["wilson", "sportyandrich"],
  pickleball: ["ppa_tour", "pickleballcentral", "blogilates"],
  climbing: ["blackdiamond"],
};

function parseArg(name: string, fallback = "") {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

async function downloadViaApify(account: string, limit: number, token: string) {
  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${account}/`],
        resultsType: "posts",
        resultsLimit: limit,
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Apify ${account}: HTTP ${response.status}`);
  }
  return (await response.json()) as Array<{ displayUrl?: string; url?: string; id?: string }>;
}

async function saveImage(account: string, index: number, id: string, imageUrl: string) {
  const dir = path.join(OUT_ROOT, `${account}-instagram`, "posts");
  await mkdir(dir, { recursive: true });
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`image ${id}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const file = path.join(dir, `${String(index).padStart(3, "0")}_${id}.jpg`);
  await writeFile(file, buffer);
  return file;
}

async function main() {
  const bucketList = parseArg("accounts", "casual,yoga,tennis,pickleball,climbing")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const limit = Math.min(Math.max(Number(parseArg("limit", "24")) || 24, 1), 80);
  const provider = parseArg("provider", "graphql");
  const accounts = [...new Set(bucketList.flatMap((bucket) => ACCOUNT_BUCKETS[bucket] ?? [bucket]))];

  const pyScript = path.join(OUT_ROOT, "fetch-instagram-posts.py");
  if (provider !== "apify" && existsSync(pyScript)) {
    console.log(`Fetching up to ${limit} public posts via GraphQL for: ${accounts.join(", ")}`);
    const result = spawnSync("python3", [pyScript, ...accounts], {
      stdio: "inherit",
      env: { ...process.env, IG_MAX_POSTS: String(limit) },
    });
    process.exitCode = result.status ?? 0;
    return;
  }

  const apifyToken = process.env.APIFY_TOKEN?.trim();
  if (!apifyToken) {
    console.error("Missing experiments/fetch-instagram-posts.py or APIFY_TOKEN.");
    process.exitCode = 2;
    return;
  }

  console.log(`Downloading up to ${limit} posts via Apify for: ${accounts.join(", ")}`);
  for (const account of accounts) {
    try {
      const posts = await downloadViaApify(account, limit, apifyToken);
      let saved = 0;
      for (const post of posts) {
        const imageUrl = post.displayUrl || post.url;
        const id = String(post.id || saved + 1);
        if (!imageUrl) continue;
        saved += 1;
        await saveImage(account, saved, id, imageUrl);
      }
      console.log(`${account}: saved ${saved} images → experiments/${account}-instagram/posts/`);
    } catch (error) {
      console.error(`${account}:`, error instanceof Error ? error.message : error);
    }
  }
}

void main();
