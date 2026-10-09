import { textStylesCollection } from "@/dao";
import { apiError, apiJson, fromResult, withApiUser } from "@/service/api/respond";
import { SYSTEM_TEXT_STYLE_ORDER, systemTextStylePreview } from "@/service/director/subtitle-look";
import { createTextStyleAction } from "@/service/text-style/actions";
import { toPublicTextStyle } from "@/presentation/serialize";
import { getAppUrl } from "@/util/app-url";
import type { TextStyleDoc } from "@/model/text-style";

// Lettering library: the system looks and the user's uploaded samples.
export const GET = withApiUser(async ({ auth }) => {
  const styles = await textStylesCollection();
  const docs = (await styles
    .find({ clerkUserId: auth.user.clerkUserId })
    .sort({ updatedAt: -1 })
    .toArray()) as TextStyleDoc[];
  const appUrl = getAppUrl();
  return apiJson({
    system: SYSTEM_TEXT_STYLE_ORDER.map((id) => ({
      id,
      previewUrl: `${appUrl}${systemTextStylePreview(id)}`,
    })),
    mine: docs.map(toPublicTextStyle),
  });
});

// Upload a lettering sample. Multipart: name, file (PNG/JPG/WebP).
export const POST = withApiUser(async ({ request }) => {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("multipart/form-data")) return apiError("請用 multipart/form-data 上傳");
  return fromResult(await createTextStyleAction(await request.formData()), 201);
});
