import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { videosCollection } from "@/dao";
import { toPublicVideoCard, VIDEO_LIST_PROJECTION } from "@/presentation/serialize";
import type { Project } from "@/model/project";
import { loadFolderOptions, loadOwnedFolder, loadStudioPickers } from "@/service/project/load-folder-studio";
import { VideoEditorWorkspace } from "@/presentation/components/app/projects/[id]/video-editor-workspace";
import { parseUseCaseParam, videoMatchesUseCase } from "@/service/video/use-case";

// Gemini 4 Argon can think for several minutes before the storyboard returns.
export const maxDuration = 800;

export default async function NewLooseVideoPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; useCase?: string }>;
}) {
  const query = searchParams ? await searchParams : undefined;
  const user = await requireAppUser();
  const requestedId = query?.projectId?.trim() || "";
  const useCase = parseUseCaseParam(query?.useCase);
  const videos = await videosCollection();
  const [pickers, folders, folder, videoDocs] = await Promise.all([
    loadStudioPickers(user),
    loadFolderOptions(user.clerkUserId),
    requestedId && ObjectId.isValid(requestedId)
      ? loadOwnedFolder(requestedId, user.clerkUserId)
      : Promise.resolve(null),
    videos
      .find({ clerkUserId: user.clerkUserId }, { projection: VIDEO_LIST_PROJECTION })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray(),
  ]);

  const cards = (videoDocs as Project[]).map(toPublicVideoCard);
  const historyVideos = useCase
    ? cards.filter((v) => videoMatchesUseCase(v.skillSlug, useCase))
    : cards;

  return (
    <VideoEditorWorkspace
      folderId={folder?._id?.toHexString() || ""}
      folderName={folder?.name || ""}
      folders={folders}
      initialVideo={null}
      credits={user.credits}
      useCase={useCase}
      historyVideos={historyVideos}
      {...pickers}
    />
  );
}
