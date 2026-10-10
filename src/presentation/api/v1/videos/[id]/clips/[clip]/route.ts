import { apiError, fromResult, readJson, withApiUser } from "@/service/api/respond";
import {
  cancelPendingClipVideoAction,
  generateClipFramesAction,
  generateClipVideoAction,
} from "@/service/clip/production";
import {
  regenerateClipSceneMediaAction,
  sendClipSceneChatAction,
} from "@/service/clip/scene-chat-actions";
import { regenerateFrameAction, updateClipStoryboardAction } from "@/service/generation/actions";
import type { ClipStoryboardInput, FramePosition } from "@/model/project";

type Params = { id: string; clip: string };

type ClipActionBody = {
  action?: string;
  // regenerateFrame
  position?: FramePosition;
  remark?: string;
  sketchDataUrl?: string;
  // chat
  message?: string;
};

function clipNumber(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Per-clip production actions. `action` picks one:
//   frames          – draw (or redraw) both stills of this clip
//   video           – render this clip's video (frames must be ready)
//   cancelVideo     – pull a video request that is still in our queue
//   regenerateFrame – redraw one still ({ position, remark?, sketchDataUrl? })
//   chat            – AI scene chat that rewrites start/end scene + camera ({ message })
//   regenerateScene – redraw stills after a scene chat edit; does not render video
export const POST = withApiUser<Params>(async ({ request, params }) => {
  const n = clipNumber(params.clip);
  if (!n) return apiError("找不到這段分鏡", 404);
  const body = await readJson<ClipActionBody>(request);
  switch (body.action) {
    case "frames":
      return fromResult(await generateClipFramesAction(params.id, n));
    case "video":
      return fromResult(await generateClipVideoAction(params.id, n));
    case "cancelVideo":
      return fromResult(await cancelPendingClipVideoAction(params.id, n));
    case "regenerateFrame": {
      const position: FramePosition = body.position === "end" ? "end" : "start";
      const revision =
        body.remark || body.sketchDataUrl
          ? { remark: body.remark, sketchDataUrl: body.sketchDataUrl }
          : undefined;
      return fromResult(await regenerateFrameAction(params.id, n, position, revision));
    }
    case "chat":
      return fromResult(
        await sendClipSceneChatAction({
          videoId: params.id,
          clipNumber: n,
          message: String(body.message ?? ""),
        }),
      );
    case "regenerateScene":
      return fromResult(await regenerateClipSceneMediaAction(params.id, n));
    default:
      return apiError(`未知的 action: ${String(body.action ?? "")}`);
  }
});

// Save the storyboard row for this clip; `regenerate: true` also redraws its stills.
export const PUT = withApiUser<Params>(async ({ request, params }) => {
  const n = clipNumber(params.clip);
  if (!n) return apiError("找不到這段分鏡", 404);
  const body = await readJson<{ input?: ClipStoryboardInput; regenerate?: boolean }>(request);
  if (!body.input) return apiError("缺少 input");
  return fromResult(
    await updateClipStoryboardAction(params.id, n, body.input, {
      regenerate: Boolean(body.regenerate),
    }),
  );
});
