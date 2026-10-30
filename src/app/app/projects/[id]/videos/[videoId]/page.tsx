import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { getVideoAction } from "@/service/project/actions";
import { loadOwnedFolder, loadStudioPickers, loadFolderOptions } from "@/service/project/load-folder-studio";
import { VideoEditorWorkspace } from "@/presentation/components/app/projects/[id]/video-editor-workspace";

// Gemini 4 Argon can think for several minutes before a director call returns.
export const maxDuration = 800;

export default async function FolderVideoPage({
  params,
}: {
  params: Promise<{ id: string; videoId: string }>;
}) {
  const { id, videoId } = await params;
  const user = await requireAppUser();
  if (!ObjectId.isValid(videoId)) notFound();

  const [folder, loaded, pickers] = await Promise.all([
    loadOwnedFolder(id, user.clerkUserId),
    getVideoAction(videoId),
    loadStudioPickers(user),
  ]);
  if (!folder || !loaded.ok || loaded.project.projectId !== folder._id.toHexString()) {
    notFound();
  }

  return (
    <VideoEditorWorkspace
      folderId={folder._id.toHexString()}
      folderName={folder.name}
      folders={await loadFolderOptions(user.clerkUserId)}
      initialVideo={loaded.project}
      credits={user.credits}
      {...pickers}
    />
  );
}
