import { usesSimpleRef2Va, usesStoryRef2Va } from "@/service/comfy/simple-ref2va";
import { isStandaloneEngineSkillSlug } from "@/service/opencut/standalone-engine-slugs";

// Storyboard clips are either Vast ref2va or cloud Hailuo.
// Scro Swap and Teleport are a third route: the OpenJutsu graph on that same GPU.
export type StoryboardClipVideoEngine = "vast-ref2va" | "openrouter-hailuo" | "standalone-engine";

export function storyboardClipVideoEngine(input: {
  skillSlug?: string;
  videoEngine?: string;
  hookStrategy?: string;
}): StoryboardClipVideoEngine {
  if (isStandaloneEngineSkillSlug(input.skillSlug)) return "standalone-engine";
  if (
    usesStoryRef2Va(input.skillSlug) ||
    usesSimpleRef2Va({
      videoEngine: input.videoEngine,
      phaseA: input.hookStrategy ? { hookStrategy: input.hookStrategy } : undefined,
    })
  ) {
    return "vast-ref2va";
  }
  return "openrouter-hailuo";
}

// A cloud status URL is the wrong engine for a swap. Keep polling only a live Comfy prompt.
export function standaloneEngineResumeAction(input: {
  status?: string;
  providerUrl?: string;
  outputVideoUrl?: string;
}): "done" | "poll" | "submit" {
  if (input.status === "completed" && input.outputVideoUrl?.trim()) return "done";
  if (input.providerUrl?.startsWith("comfy://prompt/")) return "poll";
  return "submit";
}
