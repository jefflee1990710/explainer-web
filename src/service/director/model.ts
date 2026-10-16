import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Director runs on Google AI Studio (Gemini) instead of the Vercel AI Gateway,
// because gateway free tier blocks the paid third-party models.
const DEFAULT_MODEL = "gemini-3.8-flash";
// Gemini 4 Argon is called through the Interactions API. Thinking defaults to medium.
const ARGON_MODEL = "gemini-4-argon";
// End-still rewrite uses the same fast model as the storyboard.
const END_SCENE_MODEL = "gemini-3.8-flash";

function googleClient() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY");
  }
  return createGoogleGenerativeAI({ apiKey });
}

export function directorModel() {
  const modelId = process.env.DIRECTOR_MODEL || DEFAULT_MODEL;
  const client = googleClient();
  if (modelId === ARGON_MODEL) {
    return client.interactions(modelId);
  }
  return client(modelId);
}

export function endSceneModel() {
  return googleClient()(process.env.END_SCENE_MODEL || END_SCENE_MODEL);
}
