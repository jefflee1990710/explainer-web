import { apiError, apiJson, fromResult, withApiUser } from "@/service/api/respond";
import {
  deleteTextStyleAction,
  generateTextStylePreviewAction,
  replaceTextStyleImageAction,
  saveTextStyleAction,
  sendTextStyleChatAction,
} from "@/service/text-style/actions";
import { loadTextStyleForUser } from "@/service/text-style/load";

type Params = { id: string };

export const GET = withApiUser<Params>(async ({ auth, params }) => {
  const style = await loadTextStyleForUser(auth.user.clerkUserId, params.id);
  if (!style) return apiError("找不到文字樣式", 404);
  return apiJson({ style });
});

// Replace image (multipart) or save name/lookLine (JSON).
export const PUT = withApiUser<Params>(async ({ request, params }) => {
  const type = request.headers.get("content-type") || "";
  if (type.includes("multipart/form-data")) {
    return fromResult(await replaceTextStyleImageAction(params.id, await request.formData()));
  }
  if (type.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { name?: string; lookLine?: string }
      | null;
    if (!body) return apiError("請提供 JSON");
    return fromResult(
      await saveTextStyleAction({
        id: params.id,
        name: String(body.name || ""),
        lookLine: String(body.lookLine || ""),
      }),
    );
  }
  return apiError("請用 multipart/form-data 或 application/json");
});

// POST action: chat | preview
export const POST = withApiUser<Params>(async ({ request, params }) => {
  const body = (await request.json().catch(() => null)) as
    | { action?: string; message?: string; imageUrl?: string; lookLine?: string; chatCreatedAt?: string }
    | null;
  if (!body?.action) return apiError("請提供 action");
  if (body.action === "chat") {
    return fromResult(
      await sendTextStyleChatAction({
        id: params.id,
        message: String(body.message || ""),
        imageUrl: body.imageUrl,
        lookLine: String(body.lookLine || ""),
      }),
    );
  }
  if (body.action === "preview") {
    return fromResult(
      await generateTextStylePreviewAction({
        id: params.id,
        chatCreatedAt: body.chatCreatedAt,
      }),
    );
  }
  return apiError("未知的 action");
});

export const DELETE = withApiUser<Params>(async ({ params }) => {
  return fromResult(await deleteTextStyleAction(params.id));
});
