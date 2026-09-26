import { ObjectId } from "mongodb";
import * as z from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createFolderAction,
  createVideoAction,
  getVideoAction,
  reviseProjectAction,
} from "@/service/project/actions";
import { approveStoryboardAction } from "@/service/generation/actions";
import {
  generateClipFramesAction,
  generateClipVideoAction,
  generateRemainingAction,
} from "@/service/clip/production";
import {
  createCharacterAction,
  getCharacterAction,
} from "@/service/character/actions";
import {
  charactersCollection,
  projectsCollection,
  videosCollection,
} from "@/dao";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { STYLE_IDS, STYLES } from "@/service/style";
import { mcpToolCallsCollection } from "@/dao";
import type { AppUser } from "@/model/user";
import type { McpApiKey } from "@/model/mcp";
import type { OptionalId } from "mongodb";
import type { McpToolCall } from "@/model/mcp";

function textResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

async function logCall(input: {
  user: AppUser;
  apiKey: McpApiKey;
  tool: string;
  ok: boolean;
  error?: string;
  latencyMs: number;
  creditsCharged: number;
}) {
  const col = await mcpToolCallsCollection();
  const doc: OptionalId<McpToolCall> = {
    clerkUserId: input.user.clerkUserId,
    apiKeyId: input.apiKey._id,
    tool: input.tool,
    ok: input.ok,
    error: input.error,
    latencyMs: input.latencyMs,
    creditsCharged: input.creditsCharged,
    createdAt: new Date(),
  };
  await col.insertOne(doc).catch(() => {});
}

function wrapTool<TArgs>(
  user: AppUser,
  apiKey: McpApiKey,
  tool: string,
  creditsCharged: number,
  fn: (args: TArgs) => Promise<unknown>,
) {
  return async (args: TArgs) => {
    const started = Date.now();
    try {
      const result = await fn(args);
      await logCall({
        user,
        apiKey,
        tool,
        ok: true,
        latencyMs: Date.now() - started,
        creditsCharged,
      });
      return textResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool failed";
      await logCall({
        user,
        apiKey,
        tool,
        ok: false,
        error: message,
        latencyMs: Date.now() - started,
        creditsCharged: 0,
      });
      return errorResult(message);
    }
  };
}

export function createExplainerMcpServer(user: AppUser, apiKey: McpApiKey) {
  const server = new McpServer({
    name: "explainer",
    version: "1.0.0",
  });

  server.registerTool(
    "get_account",
    {
      title: "Get account",
      description: "Return the authenticated Explainer account credits and subscription.",
      inputSchema: {},
    },
    wrapTool(user, apiKey, "get_account", 0, async () => {
      const sub = await getActiveSubscription(user.clerkUserId);
      return {
        email: user.email,
        name: user.name,
        credits: user.credits,
        bonusCredits: user.bonusCredits || 0,
        subscribed: isSubscriptionActive(sub),
        planId: sub?.planId || null,
      };
    }),
  );

  server.registerTool(
    "list_folders",
    {
      title: "List folders",
      description: "List project folders (campaigns) for the account.",
      inputSchema: {},
    },
    wrapTool(user, apiKey, "list_folders", 0, async () => {
      const folders = await projectsCollection();
      const docs = await folders
        .find({ clerkUserId: user.clerkUserId })
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();
      return docs.map((f) => ({
        id: f._id.toHexString(),
        name: f.name,
        updatedAt: f.updatedAt,
      }));
    }),
  );

  server.registerTool(
    "list_videos",
    {
      title: "List videos",
      description: "List videos in a folder, or all recent videos if folderId omitted.",
      inputSchema: {
        folderId: z.string().optional().describe("Folder id"),
      },
    },
    wrapTool(user, apiKey, "list_videos", 0, async ({ folderId }) => {
      const videos = await videosCollection();
      const filter: Record<string, unknown> = { clerkUserId: user.clerkUserId };
      if (folderId && ObjectId.isValid(folderId)) {
        filter.projectId = new ObjectId(folderId);
      }
      const docs = await videos
        .find(filter)
        .sort({ updatedAt: -1 })
        .limit(50)
        .toArray();
      return docs.map((v) => ({
        id: v._id.toHexString(),
        folderId: v.projectId.toHexString(),
        status: v.status,
        topic: v.phaseA?.englishTitle || v.source?.slice(0, 80) || null,
        updatedAt: v.updatedAt,
      }));
    }),
  );

  server.registerTool(
    "get_video",
    {
      title: "Get video",
      description: "Fetch one video by id including storyboard status.",
      inputSchema: { videoId: z.string() },
    },
    wrapTool(user, apiKey, "get_video", 0, async ({ videoId }) => {
      const result = await getVideoAction(videoId);
      if (!result.ok) throw new Error(result.error);
      return result.project;
    }),
  );

  server.registerTool(
    "list_characters",
    {
      title: "List characters",
      description: "List character blueprints for the account.",
      inputSchema: {},
    },
    wrapTool(user, apiKey, "list_characters", 0, async () => {
      const characters = await charactersCollection();
      const docs = await characters
        .find({ clerkUserId: user.clerkUserId })
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();
      return docs.map((c) => ({
        id: c._id.toHexString(),
        name: c.name,
        styleId: c.styleId,
        versionCount: c.versions.length,
        updatedAt: c.updatedAt,
      }));
    }),
  );

  server.registerTool(
    "get_character",
    {
      title: "Get character",
      description: "Fetch one character blueprint by id.",
      inputSchema: { characterId: z.string() },
    },
    wrapTool(user, apiKey, "get_character", 0, async ({ characterId }) => {
      const result = await getCharacterAction(characterId);
      if (!result.ok) throw new Error(result.error);
      return result.character;
    }),
  );

  server.registerTool(
    "list_styles",
    {
      title: "List styles",
      description: "List available visual styles.",
      inputSchema: {},
    },
    wrapTool(user, apiKey, "list_styles", 0, async () => {
      return STYLE_IDS.map((id) => ({
        id,
        name: STYLES[id].name,
        nameZh: STYLES[id].nameZh,
      }));
    }),
  );

  server.registerTool(
    "create_folder",
    {
      title: "Create folder",
      description: "Create a named project folder (campaign).",
      inputSchema: { name: z.string().min(1).max(80) },
    },
    wrapTool(user, apiKey, "create_folder", 0, async ({ name }) => {
      const result = await createFolderAction(name);
      if (!result.ok) throw new Error(result.error);
      return result.folder;
    }),
  );

  server.registerTool(
    "create_video",
    {
      title: "Create video",
      description:
        "Create a video inside a folder and start storyboard generation. skillSlug is the director skill.",
      inputSchema: {
        folderId: z.string(),
        source: z.string().min(1).describe("Topic or script"),
        skillSlug: z.string().default("cartoon-explainer"),
        styleId: z.string(),
        aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
        durationPreset: z.enum(["micro", "short", "punchy", "full"]),
        language: z.string().default("en"),
        voiceGender: z.enum(["male", "female"]).default("male"),
        sceneTextLanguage: z
          .enum(["en", "zh-Hant", "zh-Hans"])
          .default("en")
          .describe("On-canvas text is always on; this picks its script"),
        characterIds: z.array(z.string()).optional(),
      },
    },
    wrapTool(user, apiKey, "create_video", 0, async (args) => {
      const form = new FormData();
      form.set("projectId", args.folderId);
      form.set("source", args.source);
      form.set("skillSlug", args.skillSlug);
      form.set("styleId", args.styleId);
      form.set("aspectRatio", args.aspectRatio);
      form.set("durationPreset", args.durationPreset);
      form.set("language", args.language);
      form.set("voiceGender", args.voiceGender);
      form.set("sceneTextLanguage", args.sceneTextLanguage);
      for (const id of args.characterIds || []) form.append("characterIds", id);
      const result = await createVideoAction(form);
      if (!result.ok) throw new Error(result.error);
      return result.project;
    }),
  );

  server.registerTool(
    "revise_storyboard",
    {
      title: "Revise storyboard",
      description: "Re-run Phase A with revision notes while awaiting approval.",
      inputSchema: {
        videoId: z.string(),
        note: z.string().min(1),
        clipsOnly: z.boolean().optional(),
      },
    },
    wrapTool(user, apiKey, "revise_storyboard", 0, async (args) => {
      const form = new FormData();
      form.set("projectId", args.videoId);
      form.set("note", args.note);
      if (args.clipsOnly) form.set("clipsOnly", "1");
      const result = await reviseProjectAction(form);
      if (!result.ok) throw new Error(result.error);
      return result.project;
    }),
  );

  server.registerTool(
    "approve_storyboard",
    {
      title: "Approve storyboard",
      description: "Approve the storyboard and open per-clip production (free).",
      inputSchema: { videoId: z.string() },
    },
    wrapTool(user, apiKey, "approve_storyboard", 0, async ({ videoId }) => {
      const result = await approveStoryboardAction(videoId);
      if (!result.ok) throw new Error(result.error);
      return result.project;
    }),
  );

  server.registerTool(
    "generate_clip_frames",
    {
      title: "Generate clip frames",
      description: "Generate start/end frames for one clip (costs 2 credits).",
      inputSchema: {
        videoId: z.string(),
        clipNumber: z.number().int().positive(),
      },
    },
    wrapTool(user, apiKey, "generate_clip_frames", 2, async (args) => {
      const result = await generateClipFramesAction(args.videoId, args.clipNumber);
      if (!result.ok) throw new Error(result.error);
      return result.project;
    }),
  );

  server.registerTool(
    "generate_clip_video",
    {
      title: "Generate clip video",
      description: "Generate the rendered video for one clip (costs 1 credit).",
      inputSchema: {
        videoId: z.string(),
        clipNumber: z.number().int().positive(),
      },
    },
    wrapTool(user, apiKey, "generate_clip_video", 1, async (args) => {
      const result = await generateClipVideoAction(args.videoId, args.clipNumber);
      if (!result.ok) throw new Error(result.error);
      return result.project;
    }),
  );

  server.registerTool(
    "generate_remaining",
    {
      title: "Generate remaining",
      description: "Generate all remaining frames and videos for a project.",
      inputSchema: { videoId: z.string() },
    },
    wrapTool(user, apiKey, "generate_remaining", 0, async ({ videoId }) => {
      const result = await generateRemainingAction(videoId);
      if (!result.ok) throw new Error(result.error);
      return { project: result.project, skipped: result.skipped };
    }),
  );

  server.registerTool(
    "create_character",
    {
      title: "Create character",
      description: "Create a character blueprint (costs 1 credit).",
      inputSchema: {
        name: z.string().min(1).max(40),
        styleId: z.string(),
        prompt: z.string().min(1).max(1200),
        referenceImageUrl: z.string().url().optional(),
      },
    },
    wrapTool(user, apiKey, "create_character", 1, async (args) => {
      const form = new FormData();
      form.set("name", args.name);
      form.set("styleId", args.styleId);
      form.set("prompt", args.prompt);
      if (args.referenceImageUrl) {
        form.set("referenceImageUrl", args.referenceImageUrl);
      }
      const result = await createCharacterAction(form);
      if (!result.ok) throw new Error(result.error);
      return result.character;
    }),
  );

  return server;
}
