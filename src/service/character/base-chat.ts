import { generateText, Output } from "ai";
import type { ObjectId } from "mongodb";
import { z } from "zod";
import type { Character } from "@/model/character";
import {
  characterSpecBlock,
  characterSpecSchema,
  type CharacterSpec,
} from "@/model/character-spec";
import { directorModel } from "@/service/director/model";
import { foundationStyleId } from "@/service/character/character-styles";

const baseEditPlanSchema = z.object({
  reply: z.string(),
  updatedPrompt: z.string(),
  editInstruction: z.string(),
  updatedSpec: characterSpecSchema.optional(),
});

export type BaseEditPlan = {
  reply: string;
  updatedPrompt: string;
  editInstruction: string;
  updatedSpec?: CharacterSpec;
};

export function buildBaseChatSystemPrompt(input: {
  name: string;
  currentPrompt: string;
  currentSpec?: CharacterSpec;
}): string {
  const specText = input.currentSpec ? characterSpecBlock(input.currentSpec) : "(none)";
  return [
    `You are the Base Image Chat Agent for the AI character "${input.name}".`,
    "Your job is to help the user refine this character's foundational realistic Base Blueprint (facial details, hair, glasses/accessories, age, expression warmth, body build, or default base outfit).",
    "Keep the character's core identity consistent while applying the exact visual modification requested by the user.",
    `Current Base Prompt: ${input.currentPrompt || "(derived from base blueprint)"}`,
    `Current Appearance Spec:\n${specText}`,
    "Return structured JSON with:",
    "- `reply`: a concise, friendly 1–2 sentence reply in the same language as the user's message summarizing the base image update that is now generating.",
    "- `updatedPrompt`: the updated full character description incorporating the requested change (no history suffixes).",
    "- `editInstruction`: a clear, specific English visual instruction for the portrait and full-body image generator (e.g. 'Hair: shoulder-length layered bob; Accessory: thin gold-rimmed round glasses; keep face geometry and skin texture identical'). Always include any head/face/hair/eyewear/top changes clearly so both the 1:1 head-and-shoulders portrait and 9:16 full-body standing figure apply them.",
    "- `updatedSpec`: the updated CharacterSpec reflecting the change.",
  ].join("\n\n");
}

export function fallbackBaseEditPlan(input: {
  currentPrompt: string;
  message: string;
  currentSpec?: CharacterSpec;
}): BaseEditPlan {
  const cleanMsg = input.message.trim();
  const basePrompt = input.currentPrompt.replace(/(?:^|\n)變更：[\s\S]*$/, "").trim();
  const updatedPrompt = basePrompt ? `${basePrompt}. ${cleanMsg}` : cleanMsg;
  return {
    reply: `正在為你生成更新後的基底藍圖預覽：「${cleanMsg}」。完成後可點擊「套用為 Base Image」正式覆寫基底！`,
    updatedPrompt,
    editInstruction: cleanMsg,
    ...(input.currentSpec ? { updatedSpec: input.currentSpec } : {}),
  };
}

export async function planCharacterBaseEdit(input: {
  name: string;
  currentPrompt: string;
  currentSpec?: CharacterSpec;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
  imageUrl?: string;
}): Promise<BaseEditPlan> {
  try {
    const historyLines = input.history
      .slice(-6)
      .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
      .join("\n");
    const userPrompt = [
      historyLines ? `Recent chat:\n${historyLines}` : "",
      `User request: ${input.message.trim()}`,
      input.imageUrl ? "The user also attached a reference image for this base adjustment." : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const generated = await generateText({
      model: directorModel(),
      output: Output.object({ schema: baseEditPlanSchema }),
      system: buildBaseChatSystemPrompt({
        name: input.name,
        currentPrompt: input.currentPrompt,
        currentSpec: input.currentSpec,
      }),
      prompt: userPrompt,
    });
    const out = generated.output;
    if (!out || !out.editInstruction.trim()) {
      return fallbackBaseEditPlan(input);
    }
    return {
      reply: out.reply.trim() || fallbackBaseEditPlan(input).reply,
      updatedPrompt: out.updatedPrompt.trim() || fallbackBaseEditPlan(input).updatedPrompt,
      editInstruction: out.editInstruction.trim(),
      updatedSpec: out.updatedSpec ?? input.currentSpec,
    };
  } catch {
    return fallbackBaseEditPlan(input);
  }
}

// Pure state transition promoting a completed candidate version to become the character's new active Base Image.
export function promoteVersionToBase(
  character: Character,
  versionId: ObjectId,
): Character | null {
  const target = character.versions.find((v) => v.id.equals(versionId));
  if (!target || target.status !== "completed" || !target.blueprintUrl) {
    return null;
  }
  const fStyle = foundationStyleId(character);
  const nextVersions = character.versions.map((v) => {
    if (!v.id.equals(versionId)) return v;
    const copy = { ...v };
    delete copy.isBaseCandidate;
    delete copy.parentVersionId;
    delete copy.referenceImageUrl;
    delete copy.referenceImageUrls;
    return copy;
  });
  return {
    ...character,
    baseVersionId: target.id,
    defaultVersionId: target.id,
    styleDefaults: {
      ...(character.styleDefaults ?? {}),
      [fStyle]: target.id,
      realistic: target.id,
    },
    versions: nextVersions,
    updatedAt: new Date(),
  };
}
