import { apiError, apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import {
  deleteDirectorAction,
  loadDirectorForUser,
  saveDirectorAction,
  sendDirectorChatAction,
  toPublicDirectorWithPreview,
} from "@/service/director/director-actions";
import { generateDirectorPreviewAction } from "@/service/director/director-preview";
import type { DirectorDraft } from "@/service/director/director-edits";
import { emptyProfile } from "@/service/director/profile";

type Params = { id: string };

type DirectorActionBody = {
  action?: string;
  message?: string;
  imageUrl?: string;
  draft?: Partial<DirectorDraft>;
  chatCreatedAt?: string;
};

function draftFrom(raw?: Partial<DirectorDraft>): DirectorDraft {
  return {
    customProfile: { ...emptyProfile(), ...(raw?.customProfile ?? {}) },
    extraInstructions: String(raw?.extraInstructions ?? ""),
  };
}

// Director workspace payload (profile, preview, chat). Never the system prompt.
export const GET = withApiUser<Params>(async ({ auth, params }) => {
  const [skill, sub] = await Promise.all([
    loadDirectorForUser(auth.user.clerkUserId, params.id),
    getActiveSubscription(auth.user.clerkUserId),
  ]);
  if (!skill) return apiError("找不到 Director", 404);
  return apiJson({
    director: await toPublicDirectorWithPreview(skill),
    subscribed: isSubscriptionActive(sub),
  });
});

// Save title, description, profile, and extra instructions of a custom director.
export const PUT = withApiUser<Params>(async ({ request, params }) => {
  const body = await readJson<{
    title?: string;
    description?: string;
    customProfile?: DirectorDraft["customProfile"];
    extraInstructions?: string;
  }>(request);
  const draft = draftFrom(body);
  return fromResult(
    await saveDirectorAction({
      id: params.id,
      title: String(body.title ?? ""),
      description: String(body.description ?? ""),
      customProfile: draft.customProfile,
      extraInstructions: draft.extraInstructions,
    }),
  );
});

// Director actions. `action` picks one:
//   chat    – AI edit of the draft ({ message, imageUrl?, draft })
//   preview – generate the preview still ({ chatCreatedAt? })
export const POST = withApiUser<Params>(async ({ request, params }) => {
  const body = await readJson<DirectorActionBody>(request);
  switch (body.action) {
    case "chat":
      return fromResult(
        await sendDirectorChatAction({
          id: params.id,
          message: String(body.message ?? ""),
          imageUrl: body.imageUrl,
          draft: draftFrom(body.draft),
        }),
      );
    case "preview":
      return fromResult(
        await generateDirectorPreviewAction({ id: params.id, chatCreatedAt: body.chatCreatedAt }),
      );
    default:
      return apiError(`未知的 action: ${String(body.action ?? "")}`);
  }
});

export const DELETE = withApiUser<Params>(async ({ params }) => {
  return fromResult(await deleteDirectorAction(params.id));
});
