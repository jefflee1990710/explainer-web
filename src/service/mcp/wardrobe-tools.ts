import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { PublicCustomWardrobeItem } from "@/model/custom-wardrobe-item";
import type { McpApiKey } from "@/model/mcp";
import type { AppUser } from "@/model/user";
import { CHARACTER_WARDROBE_PARTS } from "@/service/character/character-look";
import {
  analyzeCustomWardrobeImageAction,
  createCustomWardrobeItemAction,
  deleteCustomWardrobeItemAction,
  listCustomWardrobeItemsAction,
} from "@/service/character/custom-wardrobe";
import { listPublicStyles } from "@/service/style/list";
import { applyWardrobeToCharacter } from "@/service/mcp/apply-wardrobe";
import {
  imageToFormFile,
  loadAgentImage,
  persistAgentImage,
} from "@/service/mcp/image-input";
import { searchLooks, searchStyles } from "@/service/mcp/look-search";
import { listWardrobeCatalogOptions } from "@/service/mcp/wardrobe-catalog";
import { BLUEPRINT_COST, FRAME_COST } from "@/service/production-plan";
import { unwrap, wrapTool } from "@/service/mcp/wrap-tool";

type Ctx = { server: McpServer; user: AppUser; apiKey: McpApiKey };

const wardrobePartSchema = z.enum(CHARACTER_WARDROBE_PARTS);
const categorySchema = z.enum(["classic", "stylized", "extreme"]);

const imageInputFields = {
  imageUrl: z
    .string()
    .optional()
    .describe("Public https image URL, or a data:image/...;base64,... URL."),
  imageBase64: z
    .string()
    .optional()
    .describe("Raw base64 image bytes, or a full data URL. Prefer this when the agent holds the file."),
  mimeType: z
    .string()
    .optional()
    .describe("Mime type for raw base64 (image/jpeg, image/png, image/webp). Optional for data URLs."),
};

type ChargedResult = { creditsCharged: number };

function chargedCredits(result: unknown) {
  if (result && typeof result === "object" && "creditsCharged" in result) {
    const value = (result as ChargedResult).creditsCharged;
    return typeof value === "number" ? value : 0;
  }
  return 0;
}

// Built-in wardrobe catalog + custom wardrobe library (fitting-room cloth / hair picks).
export function registerWardrobeTools({ server, user, apiKey }: Ctx) {
  server.registerTool(
    "list_wardrobe_catalog",
    {
      title: "List wardrobe catalog",
      description:
        "List built-in hair, top, pants, shoes, and accessory options (includes description + tags). Prefer search_looks when the agent has a text query.",
      inputSchema: {
        part: wardrobePartSchema.optional().describe("Limit to one part. Omit for every part."),
        category: categorySchema.optional().describe("Limit to classic, stylized, or extreme."),
        tags: z
          .array(z.string().min(1).max(40))
          .max(8)
          .optional()
          .describe(
            'Require all of these tags, e.g. ["pickleball"], ["yoga","casual"], ["korea","street"].',
          ),
      },
    },
    wrapTool(user, apiKey, "list_wardrobe_catalog", 0, async (args) => {
      return listWardrobeCatalogOptions(args);
    }),
  );

  server.registerTool(
    "list_hair_styles",
    {
      title: "List hair styles",
      description:
        "List built-in hairstyle option ids. Prefer search_looks with part=hair when searching by text.",
      inputSchema: {
        category: categorySchema.optional().describe("Limit to classic, stylized, or extreme."),
      },
    },
    wrapTool(user, apiKey, "list_hair_styles", 0, async (args) => {
      return listWardrobeCatalogOptions({ part: "hair", category: args.category });
    }),
  );

  // Free-text search across hair / cloth / custom wardrobe / visual styles.
  server.registerTool(
    "search_looks",
    {
      title: "Search looks",
      description:
        "Search styles, hairstyles, clothes, shoes, and accessories by free text or tags (English or Chinese). Matches names, descriptions, prompts, and tags. Returns ranked option ids for apply_character_wardrobe, create_character.styleId, or generate_life_shot.wardrobe.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .max(80)
          .describe('Search text, e.g. "bob", "皮衣", "tennis", "pickleball", "chalkboard".'),
        part: wardrobePartSchema
          .optional()
          .describe("Limit wardrobe hits to hair / top / pants / shoes / accessory."),
        category: categorySchema.optional(),
        tags: z
          .array(z.string().min(1).max(40))
          .max(8)
          .optional()
          .describe('Require catalog tags such as "casual", "yoga", "pickleball", "heritage".'),
        includeStyles: z
          .boolean()
          .optional()
          .describe("Also search visual styles from list_styles (default true when part omitted)."),
        includeCustom: z
          .boolean()
          .optional()
          .describe("Also search this account's custom wardrobe (default true)."),
        limit: z.number().int().positive().max(50).optional().describe("Max hits (default 20)."),
      },
    },
    wrapTool(user, apiKey, "search_looks", 0, async (args) => {
      const includeStyles = args.includeStyles ?? !args.part;
      const includeCustom = args.includeCustom ?? true;
      const [styles, custom] = await Promise.all([
        includeStyles ? listPublicStyles() : Promise.resolve([]),
        includeCustom
          ? listCustomWardrobeItemsAction().then((result) => (result.ok ? result.items : []))
          : Promise.resolve([]),
      ]);
      return searchLooks({
        query: args.query,
        part: args.part,
        category: args.category,
        tags: args.tags,
        includeStyles,
        styles,
        customItems: custom,
        limit: args.limit,
      });
    }),
  );

  server.registerTool(
    "search_styles",
    {
      title: "Search styles",
      description:
        "Search visual styles by free text (name, id, or description). Use the id with create_character.styleId or add_character_style.",
      inputSchema: {
        query: z.string().min(1).max(80),
        limit: z.number().int().positive().max(50).optional(),
      },
    },
    wrapTool(user, apiKey, "search_styles", 0, async (args) => {
      const styles = await listPublicStyles();
      return searchStyles(styles, { query: args.query, limit: args.limit });
    }),
  );

  server.registerTool(
    "list_custom_wardrobe",
    {
      title: "List custom wardrobe",
      description:
        "List this account's custom cloth, hair, and accessory items (option ids start with cw_).",
      inputSchema: {
        part: wardrobePartSchema.optional(),
      },
    },
    wrapTool(user, apiKey, "list_custom_wardrobe", 0, async ({ part }) => {
      const result = await listCustomWardrobeItemsAction();
      if (!result.ok) throw new Error("讀取自訂造型庫失敗");
      return part ? result.items.filter((item) => item.part === part) : result.items;
    }),
  );

  // Host an agent-held image so later tools can pass a stable https URL.
  server.registerTool(
    "upload_image",
    {
      title: "Upload image",
      description:
        "Upload an image from base64 or a public URL into this account's blob storage. Returns an https URL for analyze_custom_wardrobe, extract_cloth_for_character, or create_character.referenceImageUrl.",
      inputSchema: imageInputFields,
    },
    wrapTool(user, apiKey, "upload_image", 0, async (args) => {
      const image = await loadAgentImage(args);
      const stored = await persistAgentImage(user.clerkUserId, image);
      return { url: stored.url, contentType: stored.type, bytes: stored.buffer.length };
    }),
  );

  server.registerTool(
    "analyze_custom_wardrobe",
    {
      title: "Analyze custom wardrobe image",
      description:
        "Extract part, names, and prompt from an image (https URL or base64). Free. Follow with create_custom_wardrobe_item, or use extract_cloth_for_character for a one-shot save/apply.",
      inputSchema: {
        ...imageInputFields,
        part: wardrobePartSchema
          .optional()
          .describe("Force the wardrobe part when the photo is ambiguous."),
      },
    },
    wrapTool(user, apiKey, "analyze_custom_wardrobe", 0, async (args) => {
      const image = await loadAgentImage(args);
      const form = new FormData();
      form.set("file", imageToFormFile(image, "wardrobe"));
      if (args.part) form.set("part", args.part);
      return unwrap(await analyzeCustomWardrobeImageAction(form));
    }),
  );

  server.registerTool(
    "create_custom_wardrobe_item",
    {
      title: "Create custom wardrobe item",
      description:
        "Save a custom hair, cloth, shoe, or accessory look. Use analyze_custom_wardrobe first, or pass your own names and prompt. Free.",
      inputSchema: {
        part: wardrobePartSchema,
        name: z.string().min(1).max(60),
        prompt: z.string().min(1).max(420),
        referenceImageUrl: z
          .string()
          .url()
          .describe("https image URL, often from upload_image or analyze_custom_wardrobe."),
        nameZh: z.string().max(60).optional(),
        category: categorySchema.optional(),
        generateStudioPreview: z
          .boolean()
          .optional()
          .describe("Generate a 1:1 studio preview (default true)."),
      },
    },
    wrapTool(user, apiKey, "create_custom_wardrobe_item", 0, async (args) => {
      return unwrap(await createCustomWardrobeItemAction(args)).item;
    }),
  );

  // One-shot: image → extract cloth/hair → save to wardrobe → optional character apply.
  server.registerTool(
    "extract_cloth_for_character",
    {
      title: "Extract cloth for character",
      description: `Upload/analyze an outfit photo, save it as a custom wardrobe item, and optionally apply it onto a character version (My Room). Analyze/save is free; applying costs ${BLUEPRINT_COST} credits for board versions or ${FRAME_COST} for legacy sheets.`,
      inputSchema: {
        ...imageInputFields,
        part: wardrobePartSchema
          .optional()
          .describe("Force hair / top / pants / shoes / accessory when the photo is ambiguous."),
        name: z.string().max(60).optional().describe("Override the analyzed English name."),
        nameZh: z.string().max(60).optional(),
        saveToWardrobe: z
          .boolean()
          .optional()
          .describe("Save as a cw_ custom item (default true)."),
        generateStudioPreview: z.boolean().optional().describe("Default true when saving."),
        characterId: z
          .string()
          .optional()
          .describe("If set with versionId, apply the extracted item onto that character."),
        versionId: z
          .string()
          .optional()
          .describe("Completed version to branch from when applying."),
        note: z.string().max(400).optional().describe("Optional styling note when applying."),
      },
    },
    wrapTool(user, apiKey, "extract_cloth_for_character", chargedCredits, async (args) => {
      const image = await loadAgentImage(args);
      const form = new FormData();
      form.set("file", imageToFormFile(image, "wardrobe"));
      if (args.part) form.set("part", args.part);
      const analyzed = unwrap(await analyzeCustomWardrobeImageAction(form));

      const saveToWardrobe = args.saveToWardrobe !== false;
      let item: PublicCustomWardrobeItem | null = null;
      if (saveToWardrobe) {
        item = unwrap(
          await createCustomWardrobeItemAction({
            part: analyzed.part,
            category: analyzed.category,
            name: (args.name || analyzed.nameEn).trim() || analyzed.nameEn,
            nameZh: args.nameZh || analyzed.nameZh,
            prompt: analyzed.prompt,
            referenceImageUrl: analyzed.referenceImageUrl,
            generateStudioPreview: args.generateStudioPreview,
          }),
        ).item;
      }

      let applied = null as null | Awaited<ReturnType<typeof applyWardrobeToCharacter>>;
      if (args.characterId && args.versionId) {
        if (!item) {
          throw new Error("套用到角色前需要先存進造型庫（saveToWardrobe 不可為 false）");
        }
        applied = await applyWardrobeToCharacter({
          clerkUserId: user.clerkUserId,
          characterId: args.characterId,
          versionId: args.versionId,
          wardrobe: { [item.part]: item.optionId },
          note: args.note,
        });
      } else if (args.characterId || args.versionId) {
        throw new Error("套用到角色時請同時提供 characterId 與 versionId");
      }

      return {
        analyzed: {
          part: analyzed.part,
          category: analyzed.category,
          nameEn: analyzed.nameEn,
          nameZh: analyzed.nameZh,
          prompt: analyzed.prompt,
          referenceImageUrl: analyzed.referenceImageUrl,
        },
        item,
        character: applied?.character ?? null,
        editInstruction: applied?.editInstruction ?? null,
        creditsCharged: applied?.creditsCharged ?? 0,
      };
    }),
  );

  server.registerTool(
    "delete_custom_wardrobe_item",
    {
      title: "Delete custom wardrobe item",
      description: "Delete a custom wardrobe item by id or cw_ option id.",
      inputSchema: {
        id: z.string().min(1).describe("Item id or cw_<hex> option id from list_custom_wardrobe."),
      },
      annotations: { destructiveHint: true },
    },
    wrapTool(user, apiKey, "delete_custom_wardrobe_item", 0, async ({ id }) => {
      unwrap(await deleteCustomWardrobeItemAction(id));
      return { ok: true, id };
    }),
  );
}

export { listWardrobeCatalogOptions } from "@/service/mcp/wardrobe-catalog";
