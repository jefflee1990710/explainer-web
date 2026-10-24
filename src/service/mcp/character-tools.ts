import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import {
  CHARACTER_VOICE_AGES,
  CHARACTER_VOICE_PITCHES,
  CHARACTER_VOICE_RESONANCES,
  CHARACTER_VOICE_TEXTURES,
  CHARACTER_VOICE_WEIGHTS,
  characterVoiceSchema,
} from "@/model/character-voice";
import { characterPersonaSchema } from "@/model/character-persona";
import type { McpApiKey } from "@/model/mcp";
import type { AppUser } from "@/model/user";
import {
  addCharacterStyleAction,
  deleteCharacterAction,
  deleteCharacterPresetAction,
  editCharacterVersionAction,
  getCharacterAction,
  refreshCharacterAction,
  renameCharacterAction,
  retryCharacterVersionAction,
  saveCharacterPersonaAction,
  saveCharacterPresetAction,
  saveCharacterVoiceAction,
  setDefaultVersionAction,
  suggestCharacterVoiceAction,
} from "@/service/character/actions";
import { applyWardrobeToCharacter } from "@/service/mcp/apply-wardrobe";
import { BLUEPRINT_COST, FRAME_COST } from "@/service/production-plan";
import { unwrap, wrapTool } from "@/service/mcp/wrap-tool";

type Ctx = { server: McpServer; user: AppUser; apiKey: McpApiKey };

const wardrobePickFields = {
  hair: z.string().optional().describe("Hair option id from list_hair_styles or list_custom_wardrobe."),
  top: z.string().optional().describe("Top / dress option id from list_wardrobe_catalog."),
  pants: z.string().optional(),
  shoes: z.string().optional(),
  accessory: z.string().optional(),
};

type ChargedCharacter = { character: unknown; creditsCharged: number };

function chargedCredits(result: unknown) {
  if (result && typeof result === "object" && "creditsCharged" in result) {
    const value = (result as ChargedCharacter).creditsCharged;
    return typeof value === "number" ? value : 0;
  }
  return 0;
}

// Fitting room (My Room), presets, voice, persona, and character lifecycle beyond create/list/get.
export function registerCharacterTools({ server, user, apiKey }: Ctx) {
  server.registerTool(
    "refresh_character",
    {
      title: "Refresh character",
      description: "Advance in-flight blueprint jobs and return the latest character.",
      inputSchema: { characterId: z.string() },
    },
    wrapTool(user, apiKey, "refresh_character", 0, async ({ characterId }) => {
      return unwrap(await refreshCharacterAction(characterId)).character;
    }),
  );

  server.registerTool(
    "rename_character",
    {
      title: "Rename character",
      description: "Rename an AI Influencer character.",
      inputSchema: {
        characterId: z.string(),
        name: z.string().min(1).max(40),
      },
    },
    wrapTool(user, apiKey, "rename_character", 0, async ({ characterId, name }) => {
      return unwrap(await renameCharacterAction(characterId, name)).character;
    }),
  );

  server.registerTool(
    "delete_character",
    {
      title: "Delete character",
      description: "Delete a character and its life shots.",
      inputSchema: { characterId: z.string() },
      annotations: { destructiveHint: true },
    },
    wrapTool(user, apiKey, "delete_character", 0, async ({ characterId }) => {
      unwrap(await deleteCharacterAction(characterId));
      return { ok: true, characterId };
    }),
  );

  server.registerTool(
    "edit_character_version",
    {
      title: "Edit character version",
      description: `Branch a new blueprint from a completed version with a free-text edit (costs ${BLUEPRINT_COST} credits for board versions, ${FRAME_COST} for legacy sheets).`,
      inputSchema: {
        characterId: z.string(),
        versionId: z.string().describe("Completed version id from get_character."),
        editInstruction: z.string().min(1).max(1200),
      },
    },
    wrapTool(user, apiKey, "edit_character_version", chargedCredits, async (args) => {
      const current = unwrap(await getCharacterAction(args.characterId)).character;
      const version = current.versions.find((item) => item.id === args.versionId);
      if (!version) throw new Error("版本不存在");
      const creditsCharged =
        version.blueprintKind === "board" ? BLUEPRINT_COST : FRAME_COST;
      const character = unwrap(
        await editCharacterVersionAction(args.characterId, args.versionId, args.editInstruction),
      ).character;
      return { character, creditsCharged } satisfies ChargedCharacter;
    }),
  );

  // My Room / fitting room: swap hair and clothes via catalog option ids.
  server.registerTool(
    "apply_character_wardrobe",
    {
      title: "Apply character wardrobe",
      description: `Fitting-room edit: apply hair / top / pants / shoes / accessory picks from search_looks or list_custom_wardrobe onto a completed version (costs ${BLUEPRINT_COST} credits for board versions, ${FRAME_COST} for legacy sheets).`,
      inputSchema: {
        characterId: z.string(),
        versionId: z.string().describe("Completed version id to branch from."),
        wardrobe: z
          .object(wardrobePickFields)
          .describe("At least one part. Use built-in ids or cw_ custom ids."),
        note: z.string().max(400).optional().describe("Optional free-text styling note."),
      },
    },
    wrapTool(user, apiKey, "apply_character_wardrobe", chargedCredits, async (args) => {
      return applyWardrobeToCharacter({
        clerkUserId: user.clerkUserId,
        characterId: args.characterId,
        versionId: args.versionId,
        wardrobe: args.wardrobe,
        note: args.note,
      });
    }),
  );

  server.registerTool(
    "retry_character_version",
    {
      title: "Retry character version",
      description: `Re-queue a failed blueprint version (same cost as the original: ${BLUEPRINT_COST} for boards, ${FRAME_COST} for legacy sheets).`,
      inputSchema: {
        characterId: z.string(),
        versionId: z.string(),
      },
    },
    wrapTool(user, apiKey, "retry_character_version", chargedCredits, async (args) => {
      const current = unwrap(await getCharacterAction(args.characterId)).character;
      const version = current.versions.find((item) => item.id === args.versionId);
      if (!version) throw new Error("版本不存在");
      const creditsCharged =
        version.blueprintKind === "board" ? BLUEPRINT_COST : FRAME_COST;
      const character = unwrap(
        await retryCharacterVersionAction(args.characterId, args.versionId),
      ).character;
      return { character, creditsCharged } satisfies ChargedCharacter;
    }),
  );

  server.registerTool(
    "add_character_style",
    {
      title: "Add character style",
      description: `Generate this character in another visual style (costs ${BLUEPRINT_COST} credits). styleId comes from list_styles.`,
      inputSchema: {
        characterId: z.string(),
        styleId: z.string(),
      },
    },
    wrapTool(user, apiKey, "add_character_style", BLUEPRINT_COST, async (args) => {
      return unwrap(await addCharacterStyleAction(args.characterId, args.styleId)).character;
    }),
  );

  server.registerTool(
    "set_default_character_version",
    {
      title: "Set default character version",
      description: "Make a completed version the default sheet for its style.",
      inputSchema: {
        characterId: z.string(),
        versionId: z.string(),
      },
    },
    wrapTool(user, apiKey, "set_default_character_version", 0, async (args) => {
      return unwrap(await setDefaultVersionAction(args.characterId, args.versionId)).character;
    }),
  );

  server.registerTool(
    "save_character_preset",
    {
      title: "Save character preset",
      description: "Save a named hair/outfit look preset from a completed version (free).",
      inputSchema: {
        characterId: z.string(),
        versionId: z.string(),
        name: z.string().min(1).max(60),
      },
    },
    wrapTool(user, apiKey, "save_character_preset", 0, async (args) => {
      return unwrap(
        await saveCharacterPresetAction(args.characterId, args.versionId, args.name),
      ).character;
    }),
  );

  server.registerTool(
    "delete_character_preset",
    {
      title: "Delete character preset",
      description: "Delete a saved look preset.",
      inputSchema: {
        characterId: z.string(),
        presetId: z.string(),
      },
      annotations: { destructiveHint: true },
    },
    wrapTool(user, apiKey, "delete_character_preset", 0, async (args) => {
      return unwrap(await deleteCharacterPresetAction(args.characterId, args.presetId)).character;
    }),
  );

  server.registerTool(
    "save_character_persona",
    {
      title: "Save character persona",
      description: "Save or clear the character's city, tone, and interests used by Life posts.",
      inputSchema: {
        characterId: z.string(),
        persona: characterPersonaSchema
          .nullable()
          .describe("Persona object, or null to clear."),
      },
    },
    wrapTool(user, apiKey, "save_character_persona", 0, async (args) => {
      return unwrap(await saveCharacterPersonaAction(args.characterId, args.persona)).character;
    }),
  );

  server.registerTool(
    "save_character_voice",
    {
      title: "Save character voice",
      description: "Save or clear the acoustic voice lock for talking-head videos.",
      inputSchema: {
        characterId: z.string(),
        voice: characterVoiceSchema
          .nullable()
          .describe(
            `Voice lock: gender, age (${CHARACTER_VOICE_AGES.join("/")}), pitch (${CHARACTER_VOICE_PITCHES.join("/")}), resonance (${CHARACTER_VOICE_RESONANCES.join("/")}), texture (${CHARACTER_VOICE_TEXTURES.join("/")}), optional weight (${CHARACTER_VOICE_WEIGHTS.join("/")}), optional note. Null clears.`,
          ),
      },
    },
    wrapTool(user, apiKey, "save_character_voice", 0, async (args) => {
      return unwrap(await saveCharacterVoiceAction(args.characterId, args.voice)).character;
    }),
  );

  server.registerTool(
    "suggest_character_voice",
    {
      title: "Suggest character voice",
      description: "Infer a voice lock from the character blueprint (free, rate-limited).",
      inputSchema: { characterId: z.string() },
    },
    wrapTool(user, apiKey, "suggest_character_voice", 0, async ({ characterId }) => {
      return unwrap(await suggestCharacterVoiceAction(characterId)).character;
    }),
  );
}
