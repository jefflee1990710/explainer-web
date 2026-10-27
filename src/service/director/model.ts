import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Director runs on Google AI Studio (Gemini) instead of the Vercel AI Gateway,
// because gateway free tier blocks the paid third-party models.
const DEFAULT_MODEL = "gemini-3.8-flash";
// Gemini 4 Argon is called through the Interactions API. Thinking defaults to medium.
const ARGON_MODEL = "gemini-4-argon";
// Storyboard planning. Argon rejects thinking off and `minimal` (HTTP 400).
// `low` is the fastest level the API accepts.
export const STORYBOARD_MODEL = ARGON_MODEL;
export const STORYBOARD_THINKING_LEVEL = "low" as const;
// End-still rewrite stays on the fast model. It only rewrites a scene line.
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

// Phase A, added clips, and the draft chat. Smarter than Flash, thinking at low.
export function storyboardModel() {
  return googleClient().interactions(STORYBOARD_MODEL);
}

export function storyboardProviderOptions() {
  return {
    google: {
      thinkingLevel: STORYBOARD_THINKING_LEVEL,
      // Skip thought summaries so the call does not wait on extra reasoning text.
      thinkingSummaries: "none" as const,
    },
  };
}

export function endSceneModel() {
  return googleClient()(process.env.END_SCENE_MODEL || END_SCENE_MODEL);
}
