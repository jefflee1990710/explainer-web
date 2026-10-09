import { loadStyleForUser } from "@/app/app/styles/load-style-for-user";
import { apiError, apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import {
  deleteUserStyleAction,
  generateUserStylePreviewAction,
  saveUserStyleAction,
  sendUserStyleChatAction,
} from "@/service/style/user-style-actions";

type Params = { id: string };

type StyleActionBody = {
  action?: string;
  // chat
  message?: string;
  imageUrl?: string;
  draft?: unknown;
  // preview
  chatCreatedAt?: string;
};

// Style workspace payload: every editable prompt field, preview, and chat history.
export const GET = withApiUser<Params>(async ({ auth, params }) => {
  const [style, sub] = await Promise.all([
    loadStyleForUser(auth.user.clerkUserId, params.id),
    getActiveSubscription(auth.user.clerkUserId),
  ]);
  if (!style) return apiError("找不到 Style", 404);
  return apiJson({ style, subscribed: isSubscriptionActive(sub) });
});

// Save name, description, and prompt fields of an owned style.
export const PUT = withApiUser<Params>(async ({ request, params }) => {
  const body = await readJson<{ name?: string; description?: string; fields?: unknown }>(request);
  return fromResult(
    await saveUserStyleAction({
      id: params.id,
      name: String(body.name ?? ""),
      description: String(body.description ?? ""),
      fields: body.fields ?? {},
    }),
  );
});

// Style actions. `action` picks one:
//   chat    – AI edit of the draft ({ message, imageUrl?, draft })
//   preview – generate the preview still ({ chatCreatedAt? })
export const POST = withApiUser<Params>(async ({ request, params }) => {
  const body = await readJson<StyleActionBody>(request);
  switch (body.action) {
    case "chat":
      return fromResult(
        await sendUserStyleChatAction({
          id: params.id,
          message: String(body.message ?? ""),
          imageUrl: body.imageUrl,
          draft: body.draft ?? {},
        }),
      );
    case "preview":
      return fromResult(
        await generateUserStylePreviewAction({ id: params.id, chatCreatedAt: body.chatCreatedAt }),
      );
    default:
      return apiError(`未知的 action: ${String(body.action ?? "")}`);
  }
});

export const DELETE = withApiUser<Params>(async ({ params }) => {
  return fromResult(await deleteUserStyleAction({ id: params.id }));
});
