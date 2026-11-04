import { charactersCollection, videosCollection } from "@/dao";
import type { Project } from "@/model/project";
import { AllVideosView } from "@/presentation/components/app/videos/all-videos-view";
import {
  toPublicCharacter,
  toPublicVideoCard,
  VIDEO_LIST_PROJECTION,
} from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { listJutsuJobs } from "@/service/jutsu/pipeline";
import { listTeleportJobs } from "@/service/teleport/pipeline";

export const dynamic = "force-dynamic";

export default async function VideosLibraryPage() {
  const user = await requireAppUser();
  const [videosCol, charCol] = await Promise.all([
    videosCollection(),
    charactersCollection(),
  ]);

  const [videoDocs, swapJobs, teleportJobs, charDocs] = await Promise.all([
    videosCol
      .find({ clerkUserId: user.clerkUserId }, { projection: VIDEO_LIST_PROJECTION })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100)
      .toArray(),
    listJutsuJobs(user.clerkUserId, 50),
    listTeleportJobs(user.clerkUserId, 50),
    charCol
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .limit(60)
      .toArray(),
  ]);

  const videos = (videoDocs as Project[]).map(toPublicVideoCard);
  const characters = charDocs.map((doc) => toPublicCharacter(doc));

  return (
    <AllVideosView
      initialVideos={videos}
      initialSwapJobs={swapJobs}
      initialTeleportJobs={teleportJobs}
      characters={characters}
    />
  );
}
