import { apiError, apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import { renameFolderAction } from "@/service/project/actions";
import { loadFolderVideoCards, loadOwnedFolder } from "@/service/project/load-folder-studio";

type Params = { id: string };

// One folder with its video cards (folder studio list).
export const GET = withApiUser<Params>(async ({ auth, params }) => {
  const folder = await loadOwnedFolder(params.id, auth.user.clerkUserId);
  if (!folder) return apiError("專案不存在", 404);
  return apiJson({ folder: await loadFolderVideoCards(folder) });
});

// Rename a folder.
export const PATCH = withApiUser<Params>(async ({ request, params }) => {
  const body = await readJson<{ name?: string }>(request);
  return fromResult(await renameFolderAction(params.id, String(body.name ?? "")));
});
