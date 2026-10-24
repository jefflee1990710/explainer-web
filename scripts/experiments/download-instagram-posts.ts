/**
 * Offline helper: download recent Instagram posts for fashion / pose research.
 *
 * Usage:
 *   npx tsx scripts/experiments/download-instagram-posts.ts --accounts=yoga,tennis --limit=30
 *
 * Auth (pick one, never put secrets on argv):
 *   INSTAGRAM_SESSION_ID=...   cookie sessionid from a logged-in browser
 *   APIFY_TOKEN=...            optional Apify Instagram scraper actor
 *
 * Output lands under experiments/ig-posts/<account>/ and is gitignored.
 */
import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const OUT_ROOT = path.join(process.cwd(), "experiments", "ig-posts");

/** Taste buckets used to expand wardrobe + Life templates. */
const ACCOUNT_BUCKETS: Record<string, string[]> = {
  casual: ["lydiajanetomlinson", "wendyslookbook", "anoukyve"],
  yoga: ["yogajournal", "blogilates"],
  tennis: ["nikecourt", "wilson"],
  pickleball: ["pickleballcentral", "ppa_tour"],
  climbing: ["thenorthface", "blackdiamond"],
};

function parseArg(name: string, fallback = "") {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

async function downloadViaApify(account: string, limit: number, token: string) {
  // Apify "apify/instagram-scraper" — results vary by actor version; keep offline-only.
  const response = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      directUrls: [`https://www.instagram.com/${account}/`],
      resultsType: "posts",
      resultsLimit: limit,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`Apify ${account}: HTTP ${response.status}`);
  }
  return (await response.json()) as Array<{ displayUrl?: string; url?: string; id?: string }>;
}

async function saveImage(account: string, id: string, imageUrl: string) {
  const dir = path.join(OUT_ROOT, account);
  await mkdir(dir, { recursive: true });
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`image ${id}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const file = path.join(dir, `${id}.jpg`);
  await writeFile(file, buffer);
  return file;
}

async function main() {
  const bucketList = parseArg("accounts", "casual,yoga,tennis,pickleball")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const limit = Math.min(Math.max(Number(parseArg("limit", "20")) || 20, 1), 80);
  const apifyToken = process.env.APIFY_TOKEN?.trim();
  const sessionId = process.env.INSTAGRAM_SESSION_ID?.trim();

  if (!apifyToken && !sessionId) {
    console.error(
      "Missing APIFY_TOKEN or INSTAGRAM_SESSION_ID. Catalogs were expanded from curated fashion research instead; re-run locally when credentials are available.",
    );
    process.exitCode = 2;
    return;
  }

  if (!apifyToken) {
    console.error(
      "INSTAGRAM_SESSION_ID-only mode is not automated in cloud agents (login walls). Set APIFY_TOKEN for batch download, or run a browser session locally.",
    );
    process.exitCode = 2;
    return;
  }

  const accounts = [...new Set(bucketList.flatMap((bucket) => ACCOUNT_BUCKETS[bucket] ?? [bucket]))];
  console.log(`Downloading up to ${limit} posts for: ${accounts.join(", ")}`);

  for (const account of accounts) {
    try {
      const posts = await downloadViaApify(account, limit, apifyToken);
      let saved = 0;
      for (const post of posts) {
        const imageUrl = post.displayUrl || post.url;
        const id = String(post.id || saved);
        if (!imageUrl) continue;
        await saveImage(account, id, imageUrl);
        saved += 1;
      }
      console.log(`${account}: saved ${saved} images → experiments/ig-posts/${account}/`);
    } catch (error) {
      console.error(`${account}:`, error instanceof Error ? error.message : error);
    }
  }
}

void main();
