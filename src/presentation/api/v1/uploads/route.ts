import { apiError, fromResult, withApiUser } from "@/service/api/respond";
import { uploadCharacterImageAction } from "@/service/character/upload";
import { uploadStyleChatImageAction } from "@/service/style/chat-image-upload";
import { uploadDirectorChatImageAction } from "@/service/director/chat-image-upload";

// Multipart image upload → public blob URL. `?kind=` picks the bucket:
//   reference (default) – character / product reference photos
//   styleChat           – style AI chat attachment
//   directorChat        – director AI chat attachment
export const POST = withApiUser(async ({ request }) => {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("multipart/form-data")) return apiError("請用 multipart/form-data 上傳");
  const form = await request.formData();
  const kind = new URL(request.url).searchParams.get("kind") || "reference";
  if (kind === "styleChat") return fromResult(await uploadStyleChatImageAction(form), 201);
  if (kind === "directorChat") return fromResult(await uploadDirectorChatImageAction(form), 201);
  return fromResult(await uploadCharacterImageAction(form), 201);
});
