import { apiJson, withApiUser } from "@/service/api/respond";
import { listPoseCatalog } from "@/service/pose-edit/catalog";
import { getAppUrl } from "@/util/app-url";

// Pose library. Labels and preview URLs only; prompt text stays on the server.
export const GET = withApiUser(async () => {
  return apiJson(listPoseCatalog(getAppUrl()));
});
