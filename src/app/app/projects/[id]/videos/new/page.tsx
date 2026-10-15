import { notFound } from "next/navigation";
import { requireAppUser } from "@/service/auth";
import { loadOwnedFolder, loadStudioPickers } from "@/service/project/load-folder-studio";
import { VideoEditorWorkspace } from "@/presentation/components/app/projects/[id]/video-editor-workspace";

// Gemini 4 Argon can think for several minutes before the storyboard returns.
export const maxDuration = 800;

export default async function NewFolderVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  const folder = await loadOwnedFolder(id, user.clerkUserId);
  if (!folder) notFound();
  const pickers = await loadStudioPickers(user);

  return (
    <VideoEditorWorkspace
      folderId={folder._id.toHexString()}
      folderName={folder.name}
      initialVideo={null}
      credits={user.credits}
      {...pickers}
    />
  );
}
