import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { loadFolderOptions, loadOwnedFolder, loadStudioPickers } from "@/service/project/load-folder-studio";
import { VideoEditorWorkspace } from "@/presentation/components/app/projects/[id]/video-editor-workspace";

// Gemini 4 Argon can think for several minutes before the storyboard returns.
export const maxDuration = 800;

export default async function NewLooseVideoPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const query = searchParams ? await searchParams : undefined;
  const user = await requireAppUser();
  const requestedId = query?.projectId?.trim() || "";
  const folder = requestedId && ObjectId.isValid(requestedId)
    ? await loadOwnedFolder(requestedId, user.clerkUserId)
    : null;
  const [pickers, folders] = await Promise.all([
    loadStudioPickers(user),
    loadFolderOptions(user.clerkUserId),
  ]);

  return (
    <VideoEditorWorkspace
      folderId={folder?._id?.toHexString() || ""}
      folderName={folder?.name || ""}
      folders={folders}
      initialVideo={null}
      credits={user.credits}
      {...pickers}
    />
  );
}
