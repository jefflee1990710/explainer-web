import { apiJson, withApiUser } from "@/service/api/respond";
import { listOutfitCatalog } from "@/service/pose-edit/catalog";
import { getAppUrl } from "@/util/app-url";

// Tops, pants, shoes, and accessories. Hair and pants "none" are omitted.
export const GET = withApiUser(async () => {
  return apiJson(listOutfitCatalog(getAppUrl()));
});
