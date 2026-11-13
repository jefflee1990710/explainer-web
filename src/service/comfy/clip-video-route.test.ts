import assert from "node:assert/strict";
import { test } from "node:test";
import {
  standaloneEngineResumeAction,
  storyboardClipVideoEngine,
} from "@/service/comfy/clip-video-route";

test("story and simple clips use Vast ref2va, and other directors stay on Hailuo", () => {
  assert.equal(storyboardClipVideoEngine({ skillSlug: "story-short-director" }), "vast-ref2va");
  assert.equal(
    storyboardClipVideoEngine({ hookStrategy: "Direct simple video clip" }),
    "vast-ref2va",
  );
  assert.equal(storyboardClipVideoEngine({ skillSlug: "one-take-director" }), "openrouter-hailuo");
  assert.equal(
    storyboardClipVideoEngine({ skillSlug: "cartoon-explainer-video-director" }),
    "openrouter-hailuo",
  );
});

test("Scro Swap and Teleport are not storyboard Hailuo clips", () => {
  assert.equal(
    storyboardClipVideoEngine({ skillSlug: "scro-swap-director" }),
    "standalone-engine",
  );
  assert.equal(
    storyboardClipVideoEngine({ skillSlug: "teleport-director" }),
    "standalone-engine",
  );
});

test("a cloud provider URL is resubmitted, and a Comfy prompt keeps polling", () => {
  assert.equal(
    standaloneEngineResumeAction({
      status: "rendering",
      providerUrl: "https://openrouter.ai/api/v1/videos/abc",
    }),
    "submit",
  );
  assert.equal(
    standaloneEngineResumeAction({
      status: "failed",
      providerUrl: "comfy://prompt/prompt-1",
    }),
    "poll",
  );
  assert.equal(
    standaloneEngineResumeAction({
      status: "completed",
      outputVideoUrl: "https://blob.example/out.mp4",
      providerUrl: "comfy://prompt/prompt-1",
    }),
    "done",
  );
});
