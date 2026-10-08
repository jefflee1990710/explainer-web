import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { COVER_SAFE_AREA_IDS } from "@/model/project";
import type { McpApiKey } from "@/model/mcp";
import type { AppUser } from "@/model/user";
import { videoEditSchema } from "@/model/video-edit";
import { FRAME_COST } from "@/service/production-plan";
import { importBrandAsset } from "@/service/project/reference-image-import";
import { composeReelAction } from "@/service/reel/actions";
import {
  exportFinalVideoAction,
  listBookendVideosAction,
  updateVideoEditAction,
} from "@/service/video-edit/edit-actions";
import { generateReelCoverAction, saveCoverSafeAreasAction } from "@/service/video-edit/reel-cover";
import {
  applyTemplateAction,
  deleteTemplateAction,
  listTemplatesAction,
  overwriteTemplateAction,
  renameTemplateAction,
  saveTemplateAction,
} from "@/service/video-edit/template-actions";
import { unwrap, wrapTool } from "@/service/mcp/wrap-tool";

type Ctx = { server: McpServer; user: AppUser; apiKey: McpApiKey };

// Reel concat, cover, brand edit, and edit templates.
export function registerReelEditTools({ server, user, apiKey }: Ctx) {
  server.registerTool(
    "compose_reel",
    {
      title: "Compose reel",
      description: "Concatenate every finished clip into the reel. All clips must already be video-ready.",
      inputSchema: { videoId: z.string() },
    },
    wrapTool(user, apiKey, "compose_reel", 0, async ({ videoId }) => {
      return unwrap(await composeReelAction(videoId)).project;
    }),
  );

  server.registerTool(
    "generate_reel_cover",
    {
      title: "Generate reel cover",
      description: `Generate the reel cover still (costs ${FRAME_COST} credits). Safe areas keep the picture inside platform crops.`,
      inputSchema: {
        videoId: z.string(),
        extraPrompt: z.string().max(500).optional(),
        safeAreas: z.array(z.enum(COVER_SAFE_AREA_IDS)).optional(),
      },
    },
    wrapTool(user, apiKey, "generate_reel_cover", FRAME_COST, async (args) => {
      return unwrap(await generateReelCoverAction(args.videoId, args.extraPrompt, args.safeAreas)).project;
    }),
  );

  server.registerTool(
    "save_cover_safe_areas",
    {
      title: "Save cover safe areas",
      description: "Remember which platform crops the cover dialog should restore. Does not generate a cover.",
      inputSchema: {
        videoId: z.string(),
        safeAreas: z.array(z.enum(COVER_SAFE_AREA_IDS)),
      },
    },
    wrapTool(user, apiKey, "save_cover_safe_areas", 0, async (args) => {
      return unwrap(await saveCoverSafeAreasAction(args.videoId, args.safeAreas)).project;
    }),
  );

  server.registerTool(
    "import_brand_asset",
    {
      title: "Import brand asset",
      description:
        "Copy a public PNG, JPG, WebP, MP4, or MOV into this account's brand folder. Use the returned URL in update_video_edit or as a logo.",
      inputSchema: {
        url: z.string().url(),
      },
    },
    wrapTool(user, apiKey, "import_brand_asset", 0, async ({ url }) => {
      return importBrandAsset(url, user.clerkUserId);
    }),
  );

  // Replaces the saved edit, the same write the Video tab autosaves.
  server.registerTool(
    "update_video_edit",
    {
      title: "Update video edit",
      description:
        "Save brand layers, intro, outro, and transitions. Asset URLs must come from import_brand_asset or list_bookend_videos. This replaces the whole edit.",
      inputSchema: {
        videoId: z.string(),
        edit: videoEditSchema,
      },
    },
    wrapTool(user, apiKey, "update_video_edit", 0, async ({ videoId, edit }) => {
      return unwrap(await updateVideoEditAction(videoId, edit)).project;
    }),
  );

  server.registerTool(
    "list_bookend_videos",
    {
      title: "List bookend videos",
      description: "List finished opening or ending clips this account can attach as an intro or outro.",
      inputSchema: { slot: z.enum(["intro", "outro"]) },
    },
    wrapTool(user, apiKey, "list_bookend_videos", 0, async ({ slot }) => {
      return unwrap(await listBookendVideosAction(slot)).videos;
    }),
  );

  server.registerTool(
    "export_final_video",
    {
      title: "Export final video",
      description: "Render the branded cut (layers, intro, outro, transitions) once the reel is current.",
      inputSchema: { videoId: z.string() },
    },
    wrapTool(user, apiKey, "export_final_video", 0, async ({ videoId }) => {
      return unwrap(await exportFinalVideoAction(videoId)).project;
    }),
  );

  server.registerTool(
    "list_edit_templates",
    {
      title: "List edit templates",
      description: "List saved video-edit templates for this account.",
      inputSchema: {},
    },
    wrapTool(user, apiKey, "list_edit_templates", 0, async () => {
      return unwrap(await listTemplatesAction()).templates;
    }),
  );

  server.registerTool(
    "apply_edit_template",
    {
      title: "Apply edit template",
      description: "Copy a template onto a video. Later edits stay on that video.",
      inputSchema: { videoId: z.string(), templateId: z.string() },
    },
    wrapTool(user, apiKey, "apply_edit_template", 0, async (args) => {
      return unwrap(await applyTemplateAction(args.videoId, args.templateId)).project;
    }),
  );

  server.registerTool(
    "save_edit_template",
    {
      title: "Save edit template",
      description: "Save the video's current edit as a new named template.",
      inputSchema: { videoId: z.string(), name: z.string().min(1).max(60) },
    },
    wrapTool(user, apiKey, "save_edit_template", 0, async (args) => {
      const result = unwrap(await saveTemplateAction(args.videoId, args.name));
      return { project: result.project, template: result.template };
    }),
  );

  server.registerTool(
    "overwrite_edit_template",
    {
      title: "Overwrite edit template",
      description: "Overwrite the template this video was applied from. Other videos keep their copies.",
      inputSchema: { videoId: z.string(), templateId: z.string() },
    },
    wrapTool(user, apiKey, "overwrite_edit_template", 0, async (args) => {
      return unwrap(await overwriteTemplateAction(args.videoId, args.templateId)).template;
    }),
  );

  server.registerTool(
    "rename_edit_template",
    {
      title: "Rename edit template",
      description: "Rename a saved edit template.",
      inputSchema: { templateId: z.string(), name: z.string().min(1).max(60) },
    },
    wrapTool(user, apiKey, "rename_edit_template", 0, async (args) => {
      return unwrap(await renameTemplateAction(args.templateId, args.name)).template;
    }),
  );

  server.registerTool(
    "delete_edit_template",
    {
      title: "Delete edit template",
      description: "Delete a template. Videos that already copied it keep their edit.",
      inputSchema: { templateId: z.string() },
    },
    wrapTool(user, apiKey, "delete_edit_template", 0, async ({ templateId }) => {
      unwrap(await deleteTemplateAction(templateId));
      return { deleted: true, templateId };
    }),
  );
}
