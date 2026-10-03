import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { requireAppUser } from "@/service/auth";
import { folderVideoRedirectFromQuery } from "@/service/folder-video-path";
import { loadFolderVideoCards, loadOwnedFolder } from "@/service/project/load-folder-studio";
import { ProjectWorkspace } from "@/presentation/components/app/projects/[id]/project-workspace";

export const maxDuration = 300;

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ video?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const editorPath = folderVideoRedirectFromQuery(id, query.video);
  if (editorPath) redirect(editorPath);

  const user = await requireAppUser();
  const folder = await loadOwnedFolder(id, user.clerkUserId);
  if (!folder) notFound();
  const publicFolder = await loadFolderVideoCards(folder);

  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <ProjectWorkspace folder={publicFolder} />
    </Suspense>
  );
}

function WorkspaceFallback() {
  return (
    <div className="space-y-6">
      <div className="h-16 rounded-2xl bg-accent-ink/5" />
      <div className="h-80 rounded-[1.5rem] bg-accent-ink/5" />
    </div>
  );
}
