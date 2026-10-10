import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Director runs on Google AI Studio (Gemini) instead of the Vercel AI Gateway,
// because gateway free tier blocks the paid third-party models.
const DEFAULT_MODEL = "gemini-3.8-flash";
// End stills are one constrained rewrite. Pro follows the landed camera better than Flash.
const END_SCENE_MODEL = "gemini-3.1-pro-preview";

function googleClient() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY");
  }
  return createGoogleGenerativeAI({ apiKey });
}

export function directorModel() {
  return googleClient()(process.env.DIRECTOR_MODEL || DEFAULT_MODEL);
}

export function endSceneModel() {
  return googleClient()(process.env.END_SCENE_MODEL || END_SCENE_MODEL);
}
