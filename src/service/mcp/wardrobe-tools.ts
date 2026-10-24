import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { McpApiKey } from "@/model/mcp";
import type { AppUser } from "@/model/user";
import {
  CHARACTER_WARDROBE_PARTS,
  lookOptionCategory,
  optionsForLookPart,
  type CharacterLookCategory,
  type CharacterWardrobePart,
} from "@/service/character/character-look";
import {
  analyzeCustomWardrobeImageAction,
  createCustomWardrobeItemAction,
  deleteCustomWardrobeItemAction,
  listCustomWardrobeItemsAction,
} from "@/service/character/custom-wardrobe";
import { fetchPublicImageBytes } from "@/service/project/reference-image-import";
import { unwrap, wrapTool } from "@/service/mcp/wrap-tool";

type Ctx = { server: McpServer; user: AppUser; apiKey: McpApiKey };

const wardrobePartSchema = z.enum(CHARACTER_WARDROBE_PARTS);
const categorySchema = z.enum(["classic", "stylized", "extreme"]);

export type PublicWardrobeCatalogOption = {
  id: string;
  part: CharacterWardrobePart;
  category: Exclude<CharacterLookCategory, "all">;
  prompt: string;
};

// Built-in hair / cloth / shoe / accessory catalog for room, life, and character create.
export function listWardrobeCatalogOptions(input?: {
  part?: CharacterWardrobePart;
  category?: Exclude<CharacterLookCategory, "all">;
}): PublicWardrobeCatalogOption[] {
  const parts = input?.part ? [input.part] : [...CHARACTER_WARDROBE_PARTS];
  const rows: PublicWardrobeCatalogOption[] = [];
  for (const part of parts) {
    for (const option of optionsForLookPart(part)) {
      const category = lookOptionCategory(part, option.id);
      if (input?.category && category !== input.category) continue;
      rows.push({ id: option.id, part, category, prompt: option.prompt });
    }
  }
  return rows;
}

function imageExt(type: string, url: string) {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  const path = url.toLowerCase().split("?")[0];
  if (path.endsWith(".png")) return "png";
  if (path.endsWith(".webp")) return "webp";
  return "jpg";
}

// Built-in wardrobe catalog + custom wardrobe library (fitting-room cloth / hair picks).
export function registerWardrobeTools({ server, user, apiKey }: Ctx) {
  server.registerTool(
    "list_wardrobe_catalog",
    {
      title: "List wardrobe catalog",
      description:
        "List built-in hair, top, pants, shoes, and accessory options. Pass option ids to apply_character_wardrobe or generate_life_shot.wardrobe.",
      inputSchema: {
        part: wardrobePartSchema.optional().describe("Limit to one part. Omit for every part."),
        category: categorySchema.optional().describe("Limit to classic, stylized, or extreme."),
      },
    },
    wrapTool(user, apiKey, "list_wardrobe_catalog", 0, async (args) => {
      return listWardrobeCatalogOptions(args);
    }),
  );

  // Convenience alias for hair-only catalog discovery.
  server.registerTool(
    "list_hair_styles",
    {
      title: "List hair styles",
      description:
        "List built-in hairstyle option ids for apply_character_wardrobe.wardrobe.hair or generate_life_shot.wardrobe.hair.",
      inputSchema: {
        category: categorySchema.optional().describe("Limit to classic, stylized, or extreme."),
      },
    },
    wrapTool(user, apiKey, "list_hair_styles", 0, async (args) => {
      return listWardrobeCatalogOptions({ part: "hair", category: args.category });
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

  server.registerTool(
    "analyze_custom_wardrobe",
    {
      title: "Analyze custom wardrobe image",
      description:
        "Download a public image URL and extract part, names, and prompt for create_custom_wardrobe_item. Free.",
      inputSchema: {
        imageUrl: z.string().url().describe("Public https image URL (PNG, JPG, or WebP)."),
        part: wardrobePartSchema
          .optional()
          .describe("Force the wardrobe part when the photo is ambiguous."),
      },
    },
    wrapTool(user, apiKey, "analyze_custom_wardrobe", 0, async ({ imageUrl, part }) => {
      const downloaded = await fetchPublicImageBytes(imageUrl);
      const type = downloaded.type || "image/jpeg";
      const form = new FormData();
      form.set(
        "file",
        new File([downloaded.buffer], `wardrobe.${imageExt(type, imageUrl)}`, { type }),
      );
      if (part) form.set("part", part);
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
          .describe("https image URL, often from analyze_custom_wardrobe."),
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
