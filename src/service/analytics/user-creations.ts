import {
  charactersCollection,
  generationJobsCollection,
  lifeShotsCollection,
  projectsCollection,
  usersCollection,
  videosCollection,
} from "@/dao";

export type AdminUserVideoItem = {
  id: string;
  folderId: string;
  folderName: string;
  title: string;
  skillSlug: string;
  styleId: string;
  aspectRatio: string;
  language: string;
  status: string;
  source: string;
  spokenScript: string | null;
  error: string | null;
  clipCount: number;
  framesReadyCount: number;
  clipsReadyCount: number;
  frameUrls: string[];
  clipVideoUrls: string[];
  reelUrl: string | null;
  finalUrl: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

export type AdminUserCharacterItem = {
  id: string;
  name: string;
  styleId: string;
  starterGift: boolean;
  versionCount: number;
  completedVersionCount: number;
  previewUrl: string | null;
  versionThumbs: Array<{
    id: string;
    styleId: string;
    status: string;
    url: string | null;
    editInstruction: string | null;
  }>;
  createdAtIso: string;
  updatedAtIso: string;
};

export type AdminUserLifeShotItem = {
  id: string;
  characterName: string;
  place: string;
  kind: string;
  status: string;
  sceneImageUrl: string | null;
  resultUrl: string | null;
  error: string | null;
  createdAtIso: string;
};

export type AdminUserFailedJobItem = {
  id: string;
  kind: string;
  model: string | null;
  error: string | null;
  createdAtIso: string;
};

export type AdminUserCreationsDetail = {
  clerkUserId: string;
  email: string;
  name: string;
  credits: number;
  createdAtIso: string;
  videos: AdminUserVideoItem[];
  characters: AdminUserCharacterItem[];
  lifeShots: AdminUserLifeShotItem[];
  failedJobs: AdminUserFailedJobItem[];
};

function toIso(d?: Date | string | null): string {
  if (!d) return new Date(0).toISOString();
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

// Fetch all creations (videos, characters, life shots, and failed jobs) for one user for `/scroadmin/analytics`.
export async function getAdminUserCreations(
  clerkUserId: string,
): Promise<AdminUserCreationsDetail | null> {
  const trimmedId = clerkUserId.trim();
  if (!trimmedId) return null;

  const [usersCol, foldersCol, videosCol, charsCol, lifeCol, jobsCol] =
    await Promise.all([
      usersCollection(),
      projectsCollection(),
      videosCollection(),
      charactersCollection(),
      lifeShotsCollection(),
      generationJobsCollection(),
    ]);

  const [userDoc, folders, videos, characters, lifeShots] = await Promise.all([
    usersCol.findOne({ clerkUserId: trimmedId }),
    foldersCol.find({ clerkUserId: trimmedId }).sort({ updatedAt: -1 }).toArray(),
    videosCol
      .find({ clerkUserId: trimmedId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100)
      .toArray(),
    charsCol
      .find({ clerkUserId: trimmedId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100)
      .toArray(),
    lifeCol
      .find({ clerkUserId: trimmedId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray(),
  ]);

  const folderNameById = new Map<string, string>();
  for (const f of folders) {
    if (f._id) folderNameById.set(f._id.toString(), f.name || "Untitled Folder");
  }

  const videoIds = videos.map((v) => v._id).filter(Boolean);
  const charIds = characters.map((c) => c._id).filter(Boolean);

  const failedJobsRaw =
    videoIds.length > 0 || charIds.length > 0
      ? await jobsCol
          .find({
            status: { $in: ["failed", "nsfw"] },
            $or: [
              ...(videoIds.length > 0 ? [{ projectId: { $in: videoIds } }] : []),
              ...(charIds.length > 0 ? [{ characterId: { $in: charIds } }] : []),
            ],
          })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray()
      : [];

  const videoItems: AdminUserVideoItem[] = videos.map((v) => {
    const folderHex = v.projectId ? v.projectId.toString() : "";
    const frames = v.frames ?? [];
    const clips = v.clips ?? [];
    const frameUrls = frames
      .filter((f) => f.status === "completed" && Boolean(f.blobUrl || f.outputUrl))
      .map((f) => (f.blobUrl || f.outputUrl)!)
      .slice(0, 12);
    const clipVideoUrls = clips
      .filter((c) => c.status === "completed" && Boolean(c.blobUrl || c.outputUrl))
      .map((c) => (c.blobUrl || c.outputUrl)!)
      .slice(0, 12);
    const title =
      v.phaseA?.localizedTitle ||
      v.phaseA?.englishTitle ||
      v.spokenScript?.slice(0, 60) ||
      v.source?.slice(0, 60) ||
      "Untitled Video";

    return {
      id: v._id.toString(),
      folderId: folderHex,
      folderName: folderNameById.get(folderHex) ?? "Default Project",
      title,
      skillSlug: v.skillSlug || "unknown",
      styleId: v.styleId || "realistic",
      aspectRatio: v.aspectRatio || "9:16",
      language: v.language || "en",
      status: v.status || "draft",
      source: v.source || "",
      spokenScript: v.spokenScript ?? null,
      error: v.error ?? null,
      clipCount: v.phaseA?.clips?.length ?? clips.length,
      framesReadyCount: frameUrls.length,
      clipsReadyCount: clipVideoUrls.length,
      frameUrls,
      clipVideoUrls,
      reelUrl: v.reelUrl ?? null,
      finalUrl: v.finalUrl ?? null,
      createdAtIso: toIso(v.createdAt),
      updatedAtIso: toIso(v.updatedAt ?? v.createdAt),
    };
  });

  const characterItems: AdminUserCharacterItem[] = characters.map((c) => {
    const versions = c.versions ?? [];
    const completedVersions = versions.filter(
      (ver) => ver.status === "completed" && Boolean(ver.blueprintUrl || ver.portraitUrl || ver.profileUrl),
    );
    const latestCompleted = completedVersions[completedVersions.length - 1];
    const previewUrl =
      latestCompleted?.portraitUrl ||
      latestCompleted?.profileUrl ||
      latestCompleted?.blueprintUrl ||
      null;

    return {
      id: c._id.toString(),
      name: c.name || "Unnamed Character",
      styleId: c.styleId || "realistic",
      starterGift: Boolean(c.starterGift),
      versionCount: versions.length,
      completedVersionCount: completedVersions.length,
      previewUrl,
      versionThumbs: versions
        .slice()
        .reverse()
        .slice(0, 8)
        .map((ver) => ({
          id: ver.id.toString(),
          styleId: ver.styleId || c.styleId || "realistic",
          status: ver.status,
          url: ver.portraitUrl || ver.profileUrl || ver.blueprintUrl || null,
          editInstruction: ver.editInstruction ?? null,
        })),
      createdAtIso: toIso(c.createdAt),
      updatedAtIso: toIso(c.updatedAt ?? c.createdAt),
    };
  });

  const lifeItems: AdminUserLifeShotItem[] = lifeShots.map((s) => ({
    id: s._id.toString(),
    characterName: s.characterName || "Character",
    place: s.place || "Scene",
    kind: s.kind || "selfie",
    status: s.status ?? (s.resultUrl ? "completed" : "generating"),
    sceneImageUrl: s.sceneImageUrl || null,
    resultUrl: s.resultUrl || null,
    error: s.error ?? null,
    createdAtIso: toIso(s.createdAt),
  }));

  const failedJobItems: AdminUserFailedJobItem[] = failedJobsRaw.map((j) => ({
    id: j._id.toString(),
    kind: j.kind || "unknown",
    model: typeof j.model === "string" ? j.model : null,
    error: j.error ?? null,
    createdAtIso: toIso(j.createdAt),
  }));

  return {
    clerkUserId: trimmedId,
    email: userDoc?.email || trimmedId,
    name: userDoc?.name || "User",
    credits: userDoc?.credits ?? 0,
    createdAtIso: toIso(userDoc?.createdAt),
    videos: videoItems,
    characters: characterItems,
    lifeShots: lifeItems,
    failedJobs: failedJobItems,
  };
}
