import { readFile } from "node:fs/promises";
import path from "node:path";
import { lifePoseImagePath } from "@/model/life-pose";
import { persistMedia } from "@/service/higgsfield/persist";
import { getAppUrl } from "@/util/app-url";

type Upload = (dataUrl: string, pathname: string) => Promise<string>;

// Blob copies of skeletons already uploaded by this server process.
const uploaded = new Map<string, string>();

// Skeleton reference the image provider can fetch: public https URL in deployments,
// a Blob copy on localhost. Seedream hangs on inline data-URL references, so never send one.
export async function lifePoseReferenceUrl(
  id: string,
  appUrl = getAppUrl(),
  upload: Upload = (dataUrl, pathname) => persistMedia(dataUrl, pathname, { contentType: "image/png" }),
) {
  const relative = lifePoseImagePath(id);
  if (appUrl.startsWith("https://")) return `${appUrl}${relative}`;
  const cached = uploaded.get(id);
  if (cached) return cached;
  const bytes = await readFile(path.join(process.cwd(), "public", relative));
  const url = await upload(`data:image/png;base64,${bytes.toString("base64")}`, `explainer/life-poses/${id}.png`);
  uploaded.set(id, url);
  return url;
}
