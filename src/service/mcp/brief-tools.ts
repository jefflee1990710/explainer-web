import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { productsCollection } from "@/dao";
import type { McpApiKey } from "@/model/mcp";
import type { AppUser } from "@/model/user";
import { behaviorSlug, isCustomSkill } from "@/service/director/behavior-slug";
import { listSelectableSkills } from "@/service/director/selectable-skills";
import {
  deleteVideoAction,
  renameFolderAction,
  restartVideoAction,
  retryProjectAction,
  updatePhaseAProposalAction,
  updateVideoBriefAction,
} from "@/service/project/actions";
import { fillVideoBrief, videoBriefUpdateFields } from "@/service/mcp/video-brief";
import { unwrap, wrapTool } from "@/service/mcp/wrap-tool";

type Ctx = { server: McpServer; user: AppUser; apiKey: McpApiKey };

const phaseAClipFields = {
  clipNumber: z.number().int().positive(),
  explainerScene: z.string(),
  motionCamera: z.string(),
  englishVo: z.string(),
  startScene: z.string().optional(),
  endScene: z.string().optional(),
  startVo: z.string().optional(),
  endVo: z.string().optional(),
};

// Directors, products, brief edits, and video lifecycle.
export function registerBriefTools({ server, user, apiKey }: Ctx) {
  server.registerTool(
    "list_skills",
    {
      title: "List skills",
      description: "List director skills this account can pass as create_video.skillSlug.",
      inputSchema: {},
    },
    wrapTool(user, apiKey, "list_skills", 0, async () => {
      const skills = await listSelectableSkills(user.clerkUserId);
      return skills.map((skill) => ({
        slug: skill.slug,
        title: skill.title,
        description: skill.description,
        behaviorSlug: behaviorSlug(skill),
        isCustom: isCustomSkill(skill),
        previewUrl: skill.previewUrl || null,
      }));
    }),
  );

  server.registerTool(
    "list_products",
    {
      title: "List products",
      description: "List products that can be attached with create_video.productIds.",
      inputSchema: {},
    },
    wrapTool(user, apiKey, "list_products", 0, async () => {
      const products = await productsCollection();
      const docs = await products
        .find({ clerkUserId: user.clerkUserId })
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();
      return docs.map((product) => ({
        id: product._id.toHexString(),
        name: product.name,
        status: product.status,
        blueprintUrl: product.blueprintUrl || null,
        updatedAt: product.updatedAt,
      }));
    }),
  );

  server.registerTool(
    "rename_folder",
    {
      title: "Rename folder",
      description: "Rename a project folder.",
      inputSchema: {
        folderId: z.string(),
        name: z.string().min(1).max(80),
      },
    },
    wrapTool(user, apiKey, "rename_folder", 0, async ({ folderId, name }) => {
      unwrap(await renameFolderAction(folderId, name));
      return { folderId, name };
    }),
  );

  // Rewrite the brief and re-run the storyboard without wiping finished clips.
  server.registerTool(
    "update_video_brief",
    {
      title: "Update video brief",
      description:
        "Replace a video's director brief and re-run storyboard generation. Send the full brief from get_video. Omitted characterIds, productIds, referenceImages, and logoUrl are cleared.",
      inputSchema: { videoId: z.string(), ...videoBriefUpdateFields },
    },
    wrapTool(user, apiKey, "update_video_brief", 0, async (args) => {
      const form = new FormData();
      form.set("videoId", args.videoId);
      await fillVideoBrief(form, args, user.clerkUserId);
      return unwrap(await updateVideoBriefAction(form)).project;
    }),
  );

  // Wipe storyboard, stills, clips, and exports, then plan again. Spent credits stay spent.
  server.registerTool(
    "restart_video",
    {
      title: "Restart video",
      description:
        "Start the video over from the brief. Clears the storyboard, stills, clip videos, reel, and export. Spent credits are not refunded. Send the full brief; omitted characterIds, productIds, referenceImages, and logoUrl are cleared.",
      inputSchema: { videoId: z.string(), ...videoBriefUpdateFields },
    },
    wrapTool(user, apiKey, "restart_video", 0, async (args) => {
      const form = new FormData();
      form.set("videoId", args.videoId);
      await fillVideoBrief(form, args, user.clerkUserId);
      return unwrap(await restartVideoAction(form)).project;
    }),
  );

  server.registerTool(
    "update_phase_a",
    {
      title: "Update storyboard proposal",
      description: "Save edits to the storyboard proposal before or during review. Does not redraw frames.",
      inputSchema: {
        videoId: z.string(),
        localizedTitle: z.string(),
        englishTitle: z.string(),
        coreMessage: z.string(),
        hookStrategy: z.string(),
        narrator: z.string(),
        visualWorld: z.string(),
        clips: z.array(z.object(phaseAClipFields)),
      },
    },
    wrapTool(user, apiKey, "update_phase_a", 0, async (args) => {
      const { videoId, ...input } = args;
      return unwrap(await updatePhaseAProposalAction(videoId, input)).project;
    }),
  );

  server.registerTool(
    "retry_video",
    {
      title: "Retry video",
      description: "Retry a failed video. Re-runs the storyboard if it never landed; otherwise reopens production.",
      inputSchema: { videoId: z.string() },
    },
    wrapTool(user, apiKey, "retry_video", 0, async ({ videoId }) => {
      return unwrap(await retryProjectAction(videoId)).project;
    }),
  );

  server.registerTool(
    "delete_video",
    {
      title: "Delete video",
      description: "Delete a video, its generation jobs, and stored frame, clip, and reel files.",
      inputSchema: { videoId: z.string() },
    },
    wrapTool(user, apiKey, "delete_video", 0, async ({ videoId }) => {
      unwrap(await deleteVideoAction(videoId));
      return { deleted: true, videoId };
    }),
  );
}
