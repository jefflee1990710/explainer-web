import { parseCommonsImageSearch, type LifeSceneHit } from "@/service/character/life-prompt";

// Real place photos from Wikimedia Commons. Used as scene references only.
export async function searchPlaceScenes(
  query: string,
  fetchFn: typeof fetch = fetch,
): Promise<LifeSceneHit[]> {
  const trimmed = query.trim().slice(0, 120);
  if (!trimmed) return [];
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", trimmed);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "12");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime|size");
  url.searchParams.set("iiurlwidth", "1024");
  url.searchParams.set("format", "json");
  const response = await fetchFn(url, {
    headers: { "User-Agent": "Scro/1.0 (life-scene-search)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error("搜尋地點照片失敗");
  const payload = (await response.json()) as unknown;
  return parseCommonsImageSearch(payload);
}
