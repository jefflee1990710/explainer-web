import { requireAppUser } from "@/service/auth";
import { videosCollection } from "@/dao";
import { toPublicVideoCard, VIDEO_LIST_PROJECTION } from "@/presentation/serialize";
import type { Project } from "@/model/project";
import {
  loadFolderOptions,
  loadStudioPickers,
} from "@/service/project/load-folder-studio";
import { VideoEditorWorkspace } from "@/presentation/components/app/projects/[id]/video-editor-workspace";
import { videoMatchesUseCase, type VideoUseCase } from "@/service/video/use-case";

/** Shared RSC loader for Explainer / Talking Head creation workspace. */
export async function UseCaseVideoListPage({
  useCase,
}: {
  useCase: VideoUseCase;
  searchParams?: Promise<{ stay?: string; project?: string; projectId?: string }>;
}) {
  const user = await requireAppUser();
  const videos = await videosCollection();
  const [pickers, folderOptions, videoDocs] = await Promise.all([
    loadStudioPickers(user),
    loadFolderOptions(user.clerkUserId),
    videos
      .find({ clerkUserId: user.clerkUserId }, { projection: VIDEO_LIST_PROJECTION })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray(),
  ]);

  const cards = (videoDocs as Project[]).map(toPublicVideoCard);
  const matching = cards.filter((video) => videoMatchesUseCase(video.skillSlug, useCase));

  return (
    <VideoEditorWorkspace
      folderId=""
      folderName=""
      folders={folderOptions}
      initialVideo={null}
      credits={user.credits}
      useCase={useCase}
      historyVideos={matching}
      {...pickers}
    />
  );
}
