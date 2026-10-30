import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { getVideoAction } from "@/service/project/actions";
import { loadFolderOptions, loadStudioPickers } from "@/service/project/load-folder-studio";
import { VideoEditorWorkspace } from "@/presentation/components/app/projects/[id]/video-editor-workspace";

// Gemini 4 Argon can think for several minutes before a director call returns.
export const maxDuration = 800;

export default async function LooseVideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  const user = await requireAppUser();
  if (!ObjectId.isValid(videoId)) notFound();

  const [loaded, pickers, folders] = await Promise.all([
    getVideoAction(videoId),
    loadStudioPickers(user),
    loadFolderOptions(user.clerkUserId),
  ]);
  if (!loaded.ok) notFound();

  const folder = folders.find((item) => item.id === loaded.project.projectId);

  return (
    <VideoEditorWorkspace
      folderId={loaded.project.projectId}
      folderName={folder?.name || ""}
      folders={folders}
      initialVideo={loaded.project}
      credits={user.credits}
      {...pickers}
    />
  );
}
