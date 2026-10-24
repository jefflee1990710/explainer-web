import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import {
  LIFE_POST_CATEGORIES,
  LIFE_POST_TEMPLATES,
  lifePostTemplatePreviewSrc,
  lifePostTemplateTags,
} from "@/model/life-post-template";
import {
  LIFE_POSE_GROUPS,
  LIFE_POSE_HANDS,
  LIFE_POSES,
  filterLifePoses,
  lifePosePreviewSrc,
  lifePoseTags,
  type LifePoseGroup,
} from "@/model/life-pose";
import {
  LIFE_CREATE_MODES,
  LIFE_SHOT_KINDS,
  LIFE_SHOT_SOURCES,
} from "@/model/life-shot-kind";
import type { McpApiKey } from "@/model/mcp";
import type { AppUser } from "@/model/user";
import {
  generateLifeCaptionAction,
  generateLifeShotAction,
  listLifePage,
  listLifeShotsAction,
  saveEditedLifeShotAction,
  searchLifeScenesAction,
} from "@/service/character/life";
import { FRAME_COST } from "@/service/production-plan";
import { unwrap, wrapTool } from "@/service/mcp/wrap-tool";

type Ctx = { server: McpServer; user: AppUser; apiKey: McpApiKey };

const wardrobePickFields = {
  hair: z.string().optional(),
  top: z.string().optional(),
  pants: z.string().optional(),
  shoes: z.string().optional(),
  accessory: z.string().optional(),
};

const lifeRemarkSchema = z.object({
  number: z.number().int().positive(),
  colorName: z.string().max(40),
  comment: z.string().min(1).max(240),
});

// Life desk: post templates, poses, scene search, shot generation, captions.
export function registerLifeTools({ server, user, apiKey }: Ctx) {
  server.registerTool(
    "list_life_page",
    {
      title: "List life page",
      description:
        "Bootstrap the Life desk: ready characters (with presets) and recent life shots.",
      inputSchema: {},
    },
    wrapTool(user, apiKey, "list_life_page", 0, async () => {
      return listLifePage(user.clerkUserId);
    }),
  );

  server.registerTool(
    "list_life_shots",
    {
      title: "List life shots",
      description: "List recent life shots. Poll while status is generating.",
      inputSchema: {},
    },
    wrapTool(user, apiKey, "list_life_shots", 0, async () => {
      return unwrap(await listLifeShotsAction()).shots;
    }),
  );

  server.registerTool(
    "list_life_post_templates",
    {
      title: "List life post templates",
      description:
        "List Life post-type templates for generate_life_shot with createMode=post-template. Each row includes searchable tags (street, athletic, pickleball, casual, …).",
      inputSchema: {
        categoryId: z
          .enum(LIFE_POST_CATEGORIES)
          .optional()
          .describe("Limit to one category (branding, street, cafe, selfie, home, travel, social)."),
        tags: z
          .array(z.string().min(1).max(40))
          .max(8)
          .optional()
          .describe('Require tags such as "athletic", "pickleball", "casual", "cafe".'),
      },
    },
    wrapTool(user, apiKey, "list_life_post_templates", 0, async ({ categoryId, tags }) => {
      const required = (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
      const templates = (categoryId
        ? LIFE_POST_TEMPLATES.filter((item) => item.categoryId === categoryId)
        : LIFE_POST_TEMPLATES
      ).filter((template) => {
        if (!required.length) return true;
        const have = new Set(lifePostTemplateTags(template));
        return required.every((tag) => have.has(tag));
      });
      return templates.map((template) => ({
        id: template.id,
        categoryId: template.categoryId,
        kind: template.kind,
        promptGuide: template.promptGuide,
        tags: lifePostTemplateTags(template),
        previewPath: lifePostTemplatePreviewSrc(template.id),
      }));
    }),
  );

  server.registerTool(
    "list_life_poses",
    {
      title: "List life poses",
      description:
        "List body-pose references for generate_life_shot.poseId. Optionally filter by group, hand action, or tags.",
      inputSchema: {
        group: z.enum(LIFE_POSE_GROUPS).optional(),
        hand: z
          .enum(LIFE_POSE_HANDS)
          .optional()
          .describe("Hand / prop action filter (face, hair, hip, phone, …)."),
        tags: z
          .array(z.string().min(1).max(40))
          .max(8)
          .optional()
          .describe('Require tags such as "walk", "sit", "phone", "athletic".'),
        limit: z.number().int().positive().max(120).optional().describe("Max rows (default 40)."),
      },
    },
    wrapTool(user, apiKey, "list_life_poses", 0, async (args) => {
      const limit = args.limit ?? 40;
      const required = (args.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
      const poses = (args.group
        ? filterLifePoses(args.group as LifePoseGroup, args.hand)
        : LIFE_POSES.filter((pose) => !args.hand || pose.hands.includes(args.hand))
      ).filter((pose) => {
        if (!required.length) return true;
        const have = new Set(lifePoseTags(pose));
        return required.every((tag) => have.has(tag));
      });
      return poses.slice(0, limit).map((pose) => ({
        id: pose.id,
        group: pose.group,
        framing: pose.framing,
        hands: pose.hands,
        tags: lifePoseTags(pose),
        popularity: pose.popularity,
        promptText: pose.promptText,
        previewPath: lifePosePreviewSrc(pose.id),
      }));
    }),
  );

  server.registerTool(
    "search_life_scenes",
    {
      title: "Search life scenes",
      description:
        "Search Wikimedia Commons place photos for generate_life_shot with createMode=scene-place or replace-person.",
      inputSchema: {
        place: z.string().min(1).max(40),
        kind: z.enum(LIFE_SHOT_KINDS),
        interest: z.string().max(40).optional(),
      },
    },
    wrapTool(user, apiKey, "search_life_scenes", 0, async (args) => {
      return unwrap(await searchLifeScenesAction(args)).hits;
    }),
  );

  server.registerTool(
    "generate_life_shot",
    {
      title: "Generate life shot",
      description: `Generate a Life post image for a character (costs ${FRAME_COST} credits). Use createMode=post-template with templateId, or pass sceneImageUrl from search_life_scenes / a public https URL. Optional wardrobe ids come from list_wardrobe_catalog.`,
      inputSchema: {
        characterId: z.string(),
        source: z
          .enum(LIFE_SHOT_SOURCES)
          .describe("search when sceneImageUrl came from search_life_scenes; upload otherwise."),
        createMode: z
          .enum(LIFE_CREATE_MODES)
          .optional()
          .describe("replace-person | scene-place | post-template."),
        templateId: z
          .string()
          .optional()
          .describe("Required for createMode=post-template. From list_life_post_templates."),
        sceneImageUrl: z
          .string()
          .url()
          .optional()
          .describe("Required unless createMode=post-template."),
        place: z.string().max(60).optional(),
        kind: z.enum(LIFE_SHOT_KINDS).optional(),
        customInstruction: z.string().max(400).optional(),
        compositionRefUrl: z
          .string()
          .url()
          .optional()
          .describe("Optional pose/angle reference image (face/outfit/background are not copied)."),
        poseId: z.string().optional().describe("Pose id from list_life_poses."),
        versionId: z
          .string()
          .optional()
          .describe("Preset or history version. Defaults to newest completed blueprint."),
        wardrobe: z
          .object(wardrobePickFields)
          .optional()
          .describe("Optional hair/cloth overrides (built-in or cw_ ids)."),
        remarks: z.array(lifeRemarkSchema).max(10).optional(),
      },
    },
    wrapTool(user, apiKey, "generate_life_shot", FRAME_COST, async (args) => {
      return unwrap(
        await generateLifeShotAction({
          characterId: args.characterId,
          source: args.source,
          createMode: args.createMode,
          templateId: args.templateId,
          sceneImageUrl: args.sceneImageUrl,
          place: args.place,
          kind: args.kind,
          customInstruction: args.customInstruction,
          compositionRefUrl: args.compositionRefUrl,
          poseId: args.poseId,
          versionId: args.versionId,
          wardrobe: args.wardrobe,
          remarks: args.remarks,
        }),
      ).shot;
    }),
  );

  server.registerTool(
    "generate_life_caption",
    {
      title: "Generate life caption",
      description: "Draft a social caption for a completed life shot (free).",
      inputSchema: {
        shotId: z.string(),
        language: z.enum(["yue", "zh", "en"]).optional().describe("Default yue (Cantonese)."),
      },
    },
    wrapTool(user, apiKey, "generate_life_caption", 0, async (args) => {
      const { caption } = unwrap(await generateLifeCaptionAction(args));
      return { caption };
    }),
  );

  server.registerTool(
    "save_edited_life_shot",
    {
      title: "Save edited life shot",
      description:
        "Save a browser-filtered copy of a life shot as a new completed shot. imageUrl must already be hosted on https.",
      inputSchema: {
        sourceShotId: z.string(),
        imageUrl: z.string().url(),
        filterLabel: z.string().min(1).max(30),
      },
    },
    wrapTool(user, apiKey, "save_edited_life_shot", 0, async (args) => {
      return unwrap(await saveEditedLifeShotAction(args)).shot;
    }),
  );
}
