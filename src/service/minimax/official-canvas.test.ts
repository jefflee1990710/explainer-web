import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchMinimaxCanvasVideo,
  minimaxCanvasImageRequest,
  minimaxCanvasVideoBody,
  submitMinimaxCanvasVideo,
} from "@/service/minimax/official-canvas";

test("minimax canvas H3 uses the official v2 content array and drops refs when frames are set", () => {
  const framed = minimaxCanvasVideoBody({
    model: "MiniMax-H3",
    prompt: "paper boat",
    aspectRatio: "9:16",
    durationSeconds: 5,
    startImageUrl: "https://cdn.example/start.jpg",
    endImageUrl: "https://cdn.example/end.jpg",
    referenceImageUrls: ["https://cdn.example/ref.jpg"],
  });
  assert.equal(framed.model, "MiniMax-H3");
  assert.equal(framed.resolution, "2K");
  assert.equal(framed.duration, 5);
  assert.equal(framed.ratio, "adaptive");
  const roles = (framed.content as Array<{ type: string; role?: string }>).map((item) => item.role ?? item.type);
  assert.deepEqual(roles, ["text", "first_frame", "last_frame"]);
});

test("minimax canvas H3 text-only requires a concrete ratio, and references stay out of frame mode", () => {
  const textOnly = minimaxCanvasVideoBody({
    model: "MiniMax-H3",
    prompt: "a quiet street",
    aspectRatio: "16:9",
    durationSeconds: 3,
  });
  assert.equal(textOnly.duration, 4);
  assert.equal(textOnly.ratio, "16:9");

  const refs = minimaxCanvasVideoBody({
    model: "MiniMax-H3",
    prompt: "match the character",
    aspectRatio: "9:16",
    referenceImageUrls: ["https://cdn.example/face.jpg"],
    audioUrl: "https://cdn.example/line.mp3",
  });
  const roles = (refs.content as Array<{ type: string; role?: string }>).map((item) => item.role ?? item.type);
  assert.deepEqual(roles, ["text", "reference_image", "reference_audio"]);
  assert.equal(refs.ratio, "9:16");
});

test("minimax canvas H3 Max stays on 768P and Hailuo 2.3 uses the v1 first-frame body", () => {
  const max = minimaxCanvasVideoBody({
    model: "MiniMax-H3-Max",
    prompt: "fast cut",
    durationSeconds: 4,
    resolution: "2k",
  });
  assert.equal(max.resolution, "768P");
  assert.equal(max.duration, 5);

  const hailuo = minimaxCanvasVideoBody({
    model: "MiniMax-Hailuo-2.3",
    prompt: "read the book",
    durationSeconds: 8,
    startImageUrl: "https://cdn.example/start.jpg",
  });
  assert.equal(hailuo.model, "MiniMax-Hailuo-2.3");
  assert.equal(hailuo.duration, 10);
  assert.equal(hailuo.resolution, "768P");
  assert.equal(hailuo.first_frame_image, "https://cdn.example/start.jpg");
  assert.equal("content" in hailuo, false);
});

test("minimax canvas images use generations, and reference stills use edits", () => {
  const generated = minimaxCanvasImageRequest({
    model: "MiniMax-H3-Image",
    prompt: "orange cat",
    aspectRatio: "16:9",
    resolution: "1k",
  });
  assert.equal(generated.url, "https://api.minimax.io/v1/images/generations");
  assert.equal(generated.body.area, "1K");
  assert.equal(generated.body.aspect_ratio, "16:9");

  const edited = minimaxCanvasImageRequest({
    model: "MiniMax-H3-Image-Highspeed",
    prompt: "change the coat",
    referenceImageUrls: ["https://cdn.example/coat.jpg"],
  });
  assert.equal(edited.url, "https://api.minimax.io/v1/images/edits");
  assert.deepEqual(edited.body.images, [{ image_url: "https://cdn.example/coat.jpg" }]);
});

test("submit and poll MiniMax H3 against the official host", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/v2/video_generation")) {
      return new Response(JSON.stringify({ task_id: "task-1" }), { status: 200 });
    }
    return new Response(
      JSON.stringify({ task: { id: "task-1", status: "succeeded", content: { url: "https://cdn.example/out.mp4" } } }),
      { status: 200 },
    );
  };

  const submitted = await submitMinimaxCanvasVideo(
    { model: "MiniMax-H3", prompt: "waves", aspectRatio: "16:9", durationSeconds: 5 },
    { fetch: fetchImpl, apiKey: "test-key" },
  );
  assert.equal(submitted.status_url, "https://api.minimax.io/v2/query/video_generation/task-1");
  const polled = await fetchMinimaxCanvasVideo(submitted.status_url || "", { fetch: fetchImpl, apiKey: "test-key" });
  assert.equal(polled.status, "completed");
  assert.equal(polled.video?.url, "https://cdn.example/out.mp4");
  assert.deepEqual(calls, [
    "https://api.minimax.io/v2/video_generation",
    "https://api.minimax.io/v2/query/video_generation/task-1",
  ]);
});

test("MiniMax H3 poll keeps failed status and stores task.error.message", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        task: {
          id: "task-sensitive",
          status: "failed",
          error: { code: 1026, message: "input new_sensitive, input image sensitive" },
        },
      }),
      { status: 200 },
    );
  const polled = await fetchMinimaxCanvasVideo(
    "https://api.minimax.io/v2/query/video_generation/task-sensitive",
    { fetch: fetchImpl, apiKey: "test-key" },
  );
  assert.equal(polled.status, "failed");
  assert.equal(polled.error, "input new_sensitive, input image sensitive");
});

test("a running MiniMax task is not failed just because task.error is present", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        task: {
          status: "running",
          error: { code: 1026, message: "input new_sensitive, input image sensitive" },
        },
      }),
      { status: 200 },
    );
  const polled = await fetchMinimaxCanvasVideo(
    "https://api.minimax.io/v2/query/video_generation/task-running",
    { fetch: fetchImpl, apiKey: "test-key" },
  );
  assert.equal(polled.status, "in_progress");
  assert.equal(polled.error, undefined);
});

test("Hailuo 2.3 poll reads the v1 file download url", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/v1/query/video_generation")) {
      return new Response(JSON.stringify({ task_id: "v1", status: "Success", file_id: "file-9" }), { status: 200 });
    }
    return new Response(
      JSON.stringify({ file: { download_url: "https://cdn.example/v1.mp4" } }),
      { status: 200 },
    );
  };
  const polled = await fetchMinimaxCanvasVideo(
    "https://api.minimax.io/v1/query/video_generation?task_id=v1",
    { fetch: fetchImpl, apiKey: "test-key" },
  );
  assert.equal(polled.video?.url, "https://cdn.example/v1.mp4");
});
