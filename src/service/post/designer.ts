import { generateText, Output } from "ai";
import { z } from "zod";
import type { PosterLayout } from "@/model/post";
import { SLOT_CHAR_LIMITS } from "@/model/post";
import { directorModel } from "@/service/director/model";

export const POST_DESIGNER_PROMPT = `You write the wording for one Swiss modernist poster.
The geometry is already fixed. Return text only for the slots you are given.
Write in the same language as the user's instruction.
Keep each slot inside its character limit.
Do not add slots, hashtags, or quotation marks around the words.`;

const copySchema = z.object({
  slots: z.array(z.object({ id: z.string(), text: z.string() })).max(8),
});

// Ask Post Designer for this layout's slot text.
export async function designPosterCopy(layout: PosterLayout, instruction: string) {
  const slots = layout.layers.flatMap((layer) =>
    layer.type === "text"
      ? [`- id: ${layer.id}; role: ${layer.role}; max ${SLOT_CHAR_LIMITS[layer.role]} characters`]
      : [],
  );
  const { output } = await generateText({
    model: directorModel(),
    output: Output.object({ schema: copySchema }),
    system: POST_DESIGNER_PROMPT,
    prompt: `Layout: ${layout.id}
Slots:
${slots.join("\n")}

User instruction:
${instruction}`,
  });
  if (!output) throw new Error("海報文案沒有回傳");
  return Object.fromEntries(output.slots.map((slot) => [slot.id, slot.text]));
}
