import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { McpApiKey } from "@/model/mcp";
import type { AppUser } from "@/model/user";
import {
  generateAllClipsAction,
  generateAllSceneImagesAction,
  generateSelectedClipsAction,
} from "@/service/clip/production";
import { VIDEO_QUALITY_TIERS, type ClipStoryboardInput } from "@/model/project";
import {
  refreshGenerationAction,
  regenerateFrameAction,
  updateClipStoryboardAction,
} from "@/service/generation/actions";
import { advanceOwnedJobs } from "@/service/generation/task-advance";
import { listTasks } from "@/service/generation/task-list";
import { requireVideoApproval } from "@/service/mcp/video-approval";
import {
  applyClipExtend,
  applyClipScroSwap,
  applyClipTeleport,
} from "@/service/opencut/clip-jutsu";
import {
  applyClipStyle,
  setClipVideoQualityTier,
} from "@/service/opencut/clip-style";
import {
  FRAME_COST,
  FRAMES_COST,
  VIDEO_CREDITS_PER_SECOND,
  scroSwapCost,
  teleportCost,
} from "@/service/production-plan";
import { getVideoAction, createSimpleVideoAction } from "@/service/project/actions";
import { videoPreview } from "@/service/mcp/video-preview";
import { unwrap, wrapTool } from "@/service/mcp/wrap-tool";

type Ctx = { server: McpServer; user: AppUser; apiKey: McpApiKey };

const clipStoryboardFields = {
  explainerScene: z.string().optional().describe("Scene guideline. What the frame and video must show."),
  motionCamera: z.string().optional().describe("Camera and motion guideline."),
  englishVo: z.string().optional().describe("Spoken line for this clip."),
  startScene: z.string().optional().describe("Dual-beat start still. Omit unless this clip uses two beats."),
  endScene: z.string().optional().describe("Dual-beat end still."),
  startVo: z.string().optional().describe("Dual-beat first spoken line."),
  endVo: z.string().optional().describe("Dual-beat second spoken line."),
};

const guidelineKeys = [
  "explainerScene",
  "motionCamera",
  "englishVo",
  "startScene",
  "endScene",
  "startVo",
  "endVo",
] as const;

type GuidelinePatch = { clipNumber: number } & Partial<ClipStoryboardInput>;

// Omitted fields keep the saved line. An empty string clears that line.
function mergedGuideline(current: ClipStoryboardInput, patch: GuidelinePatch): ClipStoryboardInput {
  return {
    explainerScene: patch.explainerScene ?? current.explainerScene ?? "",
    motionCamera: patch.motionCamera ?? current.motionCamera ?? "",
    englishVo: patch.englishVo ?? current.englishVo ?? "",
    startScene: patch.startScene ?? current.startScene,
    endScene: patch.endScene ?? current.endScene,
    startVo: patch.startVo ?? current.startVo,
    endVo: patch.endVo ?? current.endVo,
  };
}

// Per-clip edits, generation triggers, progress, and the playback preview.
export function registerGenerationTools({ server, user, apiKey }: Ctx) {
  server.registerTool(
    "update_clip_storyboard",
    {
      title: "Update clip storyboard",
      description:
        "Replace one clip's full storyboard text. Omitted fields are cleared. Does not redraw the scene or render video. To change only some lines, use update_clip_guideline.",
      inputSchema: {
        videoId: z.string(),
        clipNumber: z.number().int().positive(),
        ...clipStoryboardFields,
      },
    },
    wrapTool(user, apiKey, "update_clip_storyboard", 0, async (args) => {
      const { videoId, clipNumber, ...input } = args;
      return unwrap(
        await updateClipStoryboardAction(videoId, clipNumber, {
          explainerScene: input.explainerScene || "",
          motionCamera: input.motionCamera || "",
          englishVo: input.englishVo || "",
          startScene: input.startScene,
          endScene: input.endScene,
          startVo: input.startVo,
          endVo: input.endVo,
        }),
      ).project;
    }),
  );

  // Text only. Scene images and clip videos stay until a separate tool is called.
  server.registerTool(
    "update_clip_guideline",
    {
      title: "Update clip guideline",
      description:
        "Save scene, camera, and voiceover text for one or more clips. Omitted fields stay as they are. Does not redraw scenes or render video, and spends no credits.",
      inputSchema: {
        videoId: z.string(),
        clips: z
          .array(
            z.object({
              clipNumber: z.number().int().positive(),
              ...clipStoryboardFields,
            }),
          )
          .min(1)
          .max(40),
      },
    },
    wrapTool(user, apiKey, "update_clip_guideline", 0, async ({ videoId, clips }) => {
      let project = unwrap(await getVideoAction(videoId)).project;
      for (const patch of clips) {
        if (!guidelineKeys.some((key) => patch[key] !== undefined)) {
          throw new Error(`Clip ${patch.clipNumber} 沒有要更新的指引`);
        }
        const current = project.phaseA?.clips.find((clip) => clip.clipNumber === patch.clipNumber);
        if (!current) throw new Error(`找不到 Clip ${patch.clipNumber}`);
        project = unwrap(
          await updateClipStoryboardAction(videoId, patch.clipNumber, mergedGuideline(current, patch)),
        ).project;
      }
      return project;
    }),
  );

  server.registerTool(
    "regenerate_scene",
    {
      title: "Regenerate scene",
      description: `Redraw the start and end scene images for the given clips from the saved guideline (up to ${FRAMES_COST} credits per clip). Does not render video.`,
      inputSchema: {
        videoId: z.string(),
        clipNumbers: z.array(z.number().int().positive()).min(1).max(40),
      },
    },
    wrapTool(user, apiKey, "regenerate_scene", 0, async (args) => {
      const result = unwrap(
        await generateSelectedClipsAction(args.videoId, args.clipNumbers, "frames"),
      );
      return { project: result.project, skipped: result.skipped };
    }),
  );

  server.registerTool(
    "regenerate_frame",
    {
      title: "Regenerate frame",
      description: `Redraw one start or end frame (costs ${FRAME_COST} credits). Optional remark steers the redo.`,
      inputSchema: {
        videoId: z.string(),
        clipNumber: z.number().int().positive(),
        position: z.enum(["start", "end"]),
        remark: z.string().max(600).optional(),
        sketchDataUrl: z
          .string()
          .optional()
          .describe("PNG data URL of markings drawn over the current frame"),
      },
    },
    wrapTool(user, apiKey, "regenerate_frame", FRAME_COST, async (args) => {
      const revision =
        args.remark || args.sketchDataUrl
          ? { remark: args.remark, sketchDataUrl: args.sketchDataUrl }
          : undefined;
      return unwrap(
        await regenerateFrameAction(args.videoId, args.clipNumber, args.position, revision),
      ).project;
    }),
  );

  server.registerTool(
    "generate_selected_clips",
    {
      title: "Generate selected clips",
      description:
        "Generate frames or videos for the given clip numbers. Each clip is charged on its own. Ineligible clips come back in skipped. kind videos asks the user to approve before anything is queued.",
      inputSchema: {
        videoId: z.string(),
        clipNumbers: z.array(z.number().int().positive()).min(1),
        kind: z.enum(["frames", "videos"]),
      },
      annotations: { destructiveHint: true },
    },
    wrapTool(user, apiKey, "generate_selected_clips", 0, async (args) => {
      if (args.kind === "videos") {
        await requireVideoApproval(
          server,
          `要產生 Clip ${args.clipNumbers.join("、")} 的影片嗎？這會扣除 credits。`,
        );
      }
      const result = unwrap(
        await generateSelectedClipsAction(args.videoId, args.clipNumbers, args.kind),
      );
      return { project: result.project, skipped: result.skipped };
    }),
  );

  server.registerTool(
    "generate_all_scene_images",
    {
      title: "Generate all scene images",
      description: `Draw start and end frames for every clip that is not already drawing (${FRAMES_COST} credits per clip, less when a start frame is inherited).`,
      inputSchema: { videoId: z.string() },
    },
    wrapTool(user, apiKey, "generate_all_scene_images", 0, async ({ videoId }) => {
      return unwrap(await generateAllSceneImagesAction(videoId)).project;
    }),
  );

  server.registerTool(
    "generate_all_clips",
    {
      title: "Generate all clips",
      description:
        "Render every clip that still needs a video. Frames must already be ready. Each clip is charged per second. Asks the user to approve before anything is queued.",
      inputSchema: { videoId: z.string() },
      annotations: { destructiveHint: true },
    },
    wrapTool(user, apiKey, "generate_all_clips", 0, async ({ videoId }) => {
      await requireVideoApproval(server, "要產生這支影片裡尚未完成的各段影片嗎？這會扣除 credits。");
      return unwrap(await generateAllClipsAction(videoId)).project;
    }),
  );

  // Same poll the editor uses while frames, clips, the reel, or the cover are in flight.
  server.registerTool(
    "refresh_video",
    {
      title: "Refresh video",
      description: "Refresh in-flight provider jobs and return the latest video, including preview URLs.",
      inputSchema: { videoId: z.string() },
    },
    wrapTool(user, apiKey, "refresh_video", 0, async ({ videoId }) => {
      const project = unwrap(await refreshGenerationAction(videoId)).project;
      return { project, preview: videoPreview(project) };
    }),
  );

  server.registerTool(
    "preview_video",
    {
      title: "Preview video",
      description:
        "Return stills, clip files, the concatenated reel, the cover, and the branded export for playback.",
      inputSchema: { videoId: z.string() },
    },
    wrapTool(user, apiKey, "preview_video", 0, async ({ videoId }) => {
      return videoPreview(unwrap(await getVideoAction(videoId)).project);
    }),
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List generation tasks",
      description: "List recent generation tasks. Pass videoId to limit the list to one video. Advances in-flight jobs first.",
      inputSchema: { videoId: z.string().optional() },
    },
    wrapTool(user, apiKey, "list_tasks", 0, async ({ videoId }) => {
      await advanceOwnedJobs(user.clerkUserId).catch(() => {});
      return listTasks(user.clerkUserId, { videoId });
    }),
  );

  server.registerTool(
    "set_clip_video_quality_tier",
    {
      title: "Set clip video quality tier",
      description: `Switch one clip's video quality tier ('2k_cinema' at ${VIDEO_CREDITS_PER_SECOND} credits/s).`,
      inputSchema: {
        videoId: z.string(),
        clipNumber: z.number().int().positive(),
        videoQualityTier: z.enum(VIDEO_QUALITY_TIERS),
      },
    },
    wrapTool(user, apiKey, "set_clip_video_quality_tier", 0, async (args) => {
      return unwrap(await setClipVideoQualityTier(args)).project;
    }),
  );

  server.registerTool(
    "create_simple_video",
    {
      title: "Create simple single-clip video",
      description: `Directly generate a single-clip video from a prompt, optional first/last frames, and optional character/scene references (${VIDEO_CREDITS_PER_SECOND} credits/s).`,
      inputSchema: {
        prompt: z.string().min(1).max(2000).describe("Action, scene, and camera motion description"),
        aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional().default("9:16"),
        durationSeconds: z.number().int().min(5).max(12).optional().default(6),
        styleId: z.string().optional().default("realistic"),
        videoQualityTier: z.enum(VIDEO_QUALITY_TIERS).optional().default("2k_cinema"),
        firstFrameUrl: z.string().url().optional().describe("Optional starting keyframe image URL"),
        lastFrameUrl: z.string().url().optional().describe("Optional ending keyframe image URL"),
        characterId: z.string().optional().describe("Optional character id from list_characters"),
        referenceImageUrls: z.array(z.string().url()).max(4).optional().describe("Optional reference image URLs"),
      },
      annotations: { destructiveHint: true },
    },
    wrapTool(user, apiKey, "create_simple_video", 0, async (args) => {
      await requireVideoApproval(
        server,
        `要建立並生成呢段 ${args.durationSeconds ?? 6} 秒影片嗎？這會扣除 credits。`,
      );
      return unwrap(await createSimpleVideoAction(args)).project;
    }),
  );

  server.registerTool(
    "apply_clip_style",
    {
      title: "Apply clip visual style",
      description: "Change one clip's visual styleId, redraw its frames in the new style, and queue auto-video generation.",
      inputSchema: {
        videoId: z.string(),
        clipNumber: z.number().int().positive(),
        styleId: z.string().min(1),
      },
    },
    wrapTool(user, apiKey, "apply_clip_style", FRAME_COST, async (args) => {
      return unwrap(await applyClipStyle(args)).project;
    }),
  );

  server.registerTool(
    "extend_clip_video",
    {
      title: "Extend clip video (+6s)",
      description:
        "Seamlessly extend a completed clip by +6 seconds using a 39-frame protected latent prefix and character/scene/prop references, inserting a new Clip N+1 right after it.",
      inputSchema: {
        videoId: z.string(),
        clipNumber: z.number().int().positive(),
        extensionPrompt: z.string().min(1).max(1200).describe("What happens in the next 6 seconds"),
      },
      annotations: { destructiveHint: true },
    },
    wrapTool(user, apiKey, "extend_clip_video", VIDEO_CREDITS_PER_SECOND * 6, async (args) => {
      await requireVideoApproval(
        server,
        `要將 Clip ${args.clipNumber} 無縫延展 +6 秒嗎？這會扣除 credits。`,
      );
      const res = unwrap(
        await applyClipExtend({
          videoId: args.videoId,
          clipNumber: args.clipNumber,
          prompt: args.extensionPrompt,
        }),
      );
      return { project: res.project, jobId: res.jobId, newClipNumber: res.newClipNumber };
    }),
  );

  server.registerTool(
    "apply_clip_scro_swap",
    {
      title: "Apply Scro Swap to clip",
      description:
        "Replace the character and/or outfit in a completed storyboard clip while preserving its motion and lip-sync.",
      inputSchema: {
        videoId: z.string(),
        clipNumber: z.number().int().positive(),
        characterId: z.string().optional().describe("Character id from list_characters"),
        referenceImageUrls: z.array(z.string().url()).max(6).optional().describe("1 to 6 custom character/outfit reference image URLs"),
      },
      annotations: { destructiveHint: true },
    },
    wrapTool(user, apiKey, "apply_clip_scro_swap", scroSwapCost({ mediaKind: "video", durationSeconds: 6 }), async (args) => {
      await requireVideoApproval(
        server,
        `要對 Clip ${args.clipNumber} 執行 Scro Swap 換角嗎？這會扣除 credits。`,
      );
      const res = unwrap(await applyClipScroSwap(args));
      return { project: res.project, jobId: res.jobId };
    }),
  );

  server.registerTool(
    "apply_clip_teleport",
    {
      title: "Apply Teleport to clip",
      description:
        "Relocate the character in a completed storyboard clip into a new scene while keeping their identity and motion.",
      inputSchema: {
        videoId: z.string(),
        clipNumber: z.number().int().positive(),
        sceneImageUrl: z.string().url().optional().describe("New background scene photo URL"),
        scenePrompt: z.string().max(600).optional().describe("Description of the new scene or lighting mood"),
      },
      annotations: { destructiveHint: true },
    },
    wrapTool(user, apiKey, "apply_clip_teleport", teleportCost({ durationSeconds: 6 }), async (args) => {
      await requireVideoApproval(
        server,
        `要對 Clip ${args.clipNumber} 執行 Teleport 換場嗎？這會扣除 credits。`,
      );
      const res = unwrap(await applyClipTeleport(args));
      return { project: res.project, jobId: res.jobId };
    }),
  );
}
