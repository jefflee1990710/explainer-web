import { lifePoseById } from "@/model/life-pose";
import type { PoseEdit } from "@/model/pose-edit";
import { isFullBodyTop, wardrobePickPrompts } from "@/service/character/character-look";
import { poseEditPrompt, poseEditReferenceUrls } from "@/service/pose-edit/prompt";

// Prompt, aspect, and reference order sent to the still generator.
export function poseEditSubmitInput(
  edit: Pick<PoseEdit, "sourceUrl" | "poseId" | "wardrobe" | "aspect">,
  poseReferenceUrl?: string,
) {
  const prompts = wardrobePickPrompts(edit.wardrobe);
  return {
    prompt: poseEditPrompt({
      posePrompt: lifePoseById(edit.poseId)?.promptText,
      wardrobePrompts: {
        top: prompts.top,
        pants: prompts.pants,
        shoes: prompts.shoes,
        accessory: prompts.accessory,
      },
      coversLegs: isFullBodyTop(edit.wardrobe.top),
    }),
    aspectRatio: edit.aspect,
    referenceImageUrls: poseEditReferenceUrls({
      sourceUrl: edit.sourceUrl,
      poseReferenceUrl,
    }),
  };
}
