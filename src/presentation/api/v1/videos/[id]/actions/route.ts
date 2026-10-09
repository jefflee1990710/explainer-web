import { jsonToFormData, readFormData } from "@/service/api/form";
import { apiError, fromResult, readJson, withApiUser } from "@/service/api/respond";
import { composeReelAction } from "@/service/reel/actions";
import { approveStoryboardAction, refreshGenerationAction } from "@/service/generation/actions";
import {
  generateAllClipsAction,
  generateAllSceneImagesAction,
  generateRemainingAction,
  generateSelectedClipsAction,
} from "@/service/clip/production";
import {
  restartVideoAction,
  retryProjectAction,
  reviseProjectAction,
  updatePhaseAProposalAction,
  updateVideoTextStyleAction,
} from "@/service/project/actions";
import type { PhaseAEditInput } from "@/model/project";

type Params = { id: string };

type ActionBody = {
  action?: string;
  // revise
  note?: string;
  clipsOnly?: boolean;
  // storyboard
  proposal?: PhaseAEditInput;
  // textStyle
  textStyleId?: string;
  // generateSelected
  clipNumbers?: number[];
  kind?: "frames" | "videos";
};

// Video-level actions that do not fit a resource verb. `action` picks one:
//   refresh           – advance provider jobs and return the fresh video (poll)
//   retry             – retry a failed video
//   revise            – re-run Phase A with a note ({ note, clipsOnly })
//   restart           – wipe media and re-run Phase A from a new brief (form body)
//   approve           – legacy: approve storyboard
//   storyboard        – save edited Phase A proposal ({ proposal })
//   textStyle         – change lettering only ({ textStyleId })
//   generateScenes    – draw every missing scene image
//   generateVideos    – render every clip whose frames are ready
//   generateRemaining – frames + videos for whatever is missing
//   generateSelected  – { clipNumbers, kind }
//   reel              – concatenate finished clips into the reel
export const POST = withApiUser<Params>(async ({ request, params }) => {
  const id = params.id;
  const type = request.headers.get("content-type") || "";

  // Restart carries a full brief (multipart or JSON) rather than an action envelope.
  if (type.includes("multipart/form-data")) {
    const form = await readFormData(request, { videoId: id });
    return fromResult(await restartVideoAction(form));
  }

  const body = await readJson<ActionBody & Record<string, unknown>>(request);
  switch (body.action) {
    case "refresh":
      return fromResult(await refreshGenerationAction(id));
    case "retry":
      return fromResult(await retryProjectAction(id));
    case "revise": {
      const form = new FormData();
      form.set("projectId", id);
      form.set("note", String(body.note ?? ""));
      if (body.clipsOnly) form.set("clipsOnly", "1");
      return fromResult(await reviseProjectAction(form));
    }
    case "restart": {
      // The rest of the envelope is the new brief.
      const { action: _action, ...brief } = body;
      void _action;
      const form = jsonToFormData(brief);
      form.set("videoId", id);
      return fromResult(await restartVideoAction(form));
    }
    case "approve":
      return fromResult(await approveStoryboardAction(id));
    case "storyboard":
      if (!body.proposal) return apiError("缺少 proposal");
      return fromResult(await updatePhaseAProposalAction(id, body.proposal));
    case "textStyle":
      return fromResult(await updateVideoTextStyleAction(id, String(body.textStyleId ?? "")));
    case "generateScenes":
      return fromResult(await generateAllSceneImagesAction(id));
    case "generateVideos":
      return fromResult(await generateAllClipsAction(id));
    case "generateRemaining":
      return fromResult(await generateRemainingAction(id));
    case "generateSelected":
      return fromResult(
        await generateSelectedClipsAction(
          id,
          Array.isArray(body.clipNumbers) ? body.clipNumbers.map(Number) : [],
          body.kind === "videos" ? "videos" : "frames",
        ),
      );
    case "reel":
      return fromResult(await composeReelAction(id));
    default:
      return apiError(`未知的 action: ${String(body.action ?? "")}`);
  }
});
