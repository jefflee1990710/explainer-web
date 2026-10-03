import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { getVideoAction } from "@/service/project/actions";
import { loadOwnedFolder, loadStudioPickers } from "@/service/project/load-folder-studio";
import { VideoEditorWorkspace } from "@/presentation/components/app/projects/[id]/video-editor-workspace";

export const maxDuration = 300;

export default async function FolderVideoPage({
  params,
}: {
  params: Promise<{ id: string; videoId: string }>;
}) {
  const { id, videoId } = await params;
  const user = await requireAppUser();
  const folder = await loadOwnedFolder(id, user.clerkUserId);
  if (!folder || !ObjectId.isValid(videoId)) notFound();

  const loaded = await getVideoAction(videoId);
  if (!loaded.ok || loaded.project.projectId !== folder._id.toHexString()) notFound();

  const pickers = await loadStudioPickers(user);

  return (
    <VideoEditorWorkspace
      folderId={folder._id.toHexString()}
      initialVideo={loaded.project}
      credits={user.credits}
      creditLimit={user.creditLimit || 0}
      {...pickers}
    />
  );
}
