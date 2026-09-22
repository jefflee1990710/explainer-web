import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Director runs on Google AI Studio (Gemini) instead of the Vercel AI Gateway,
// because gateway free tier blocks the paid third-party models.
const DEFAULT_MODEL = "gemini-3.8-flash";

export function directorModel() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY");
  }
  const google = createGoogleGenerativeAI({ apiKey });
  return google(process.env.DIRECTOR_MODEL || DEFAULT_MODEL);
}
