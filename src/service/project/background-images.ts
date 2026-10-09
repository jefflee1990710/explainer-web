export const MAX_BACKGROUND_IMAGES = 2;

export type BackgroundImagesParse =
  | { ok: true; urls: string[] }
  | { ok: false; error: string };

// Talking-head background photos. Order is the upload order; blanks and dupes drop.
export function parseBackgroundImageUrls(
  raw: string,
  isAllowedUrl: (url: string) => boolean,
): BackgroundImagesParse {
  if (!raw.trim()) return { ok: true, urls: [] };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "背景參考圖資料無效" };
  }
  if (!Array.isArray(data)) return { ok: false, error: "背景參考圖資料無效" };
  const urls: string[] = [];
  for (const item of data) {
    const url = typeof item === "string" ? item.trim() : "";
    if (!url || !isAllowedUrl(url)) return { ok: false, error: "背景參考圖來源無效，請重新上傳" };
    if (!urls.includes(url)) urls.push(url);
  }
  if (urls.length > MAX_BACKGROUND_IMAGES) {
    return { ok: false, error: `背景參考圖最多 ${MAX_BACKGROUND_IMAGES} 張` };
  }
  return { ok: true, urls };
}
