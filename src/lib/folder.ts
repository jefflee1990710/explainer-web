import { STATUS_META } from "@/lib/project-status";
import type { ProjectStatus } from "@/types/project";

const NAME_MAX = 80;

export function looksLikeLegacyVideo(doc: { name?: string; skillSlug?: string }) {
  return !doc.name && Boolean(doc.skillSlug);
}

export function folderNameFromVideo(video: {
  phaseA?: { localizedTitle?: string; englishTitle?: string };
}) {
  const raw =
    video.phaseA?.localizedTitle || video.phaseA?.englishTitle || "未命名專案";
  return raw.trim().slice(0, NAME_MAX) || "未命名專案";
}

export function sanitizeFolderName(input: string) {
  const name = input.trim().slice(0, NAME_MAX);
  return name || "";
}

export function folderRollupStatus(statuses: ProjectStatus[]): ProjectStatus {
  if (statuses.length === 0) return "draft";
  if (statuses.some((status) => status === "failed")) return "failed";
  const busy = statuses.find((status) => STATUS_META[status].busy);
  if (busy) return busy;
  const action = statuses.find((status) => STATUS_META[status].tone === "action");
  if (action) return action;
  if (statuses.every((status) => status === "ready")) return "ready";
  return statuses[0];
}
