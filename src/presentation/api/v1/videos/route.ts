import { readFormData } from "@/service/api/form";
import { fromResult, withApiUser } from "@/service/api/respond";
import { createVideoAction } from "@/service/project/actions";

// Create a video from a brief and schedule Phase A (storyboard).
// Body: JSON or multipart with the same keys as the web form
// (projectId, skillSlug, styleId, source, aspectRatio, durationPreset, language,
//  voiceGender, speechPace, sceneTextLanguage, textStyleId, characterIds[], productIds[],
//  spokenScript?, logoUrl?, referenceImages?).
export const POST = withApiUser(async ({ request }) => {
  const form = await readFormData(request);
  return fromResult(await createVideoAction(form), 201);
});
