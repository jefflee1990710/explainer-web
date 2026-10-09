import { apiError, fromResult, withApiUser } from "@/service/api/respond";
import { deleteTextStyleAction, replaceTextStyleImageAction } from "@/service/text-style/actions";

type Params = { id: string };

// Replace the lettering sample image. Multipart: file.
export const PUT = withApiUser<Params>(async ({ request, params }) => {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("multipart/form-data")) return apiError("請用 multipart/form-data 上傳");
  return fromResult(await replaceTextStyleImageAction(params.id, await request.formData()));
});

export const DELETE = withApiUser<Params>(async ({ params }) => {
  return fromResult(await deleteTextStyleAction(params.id));
});
