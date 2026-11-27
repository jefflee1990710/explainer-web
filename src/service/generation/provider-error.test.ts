import assert from "node:assert/strict";
import test from "node:test";
import { providerErrorMessage, providerFailureText } from "@/service/generation/provider-error";

const MINIMAX_SENSITIVE = "input new_sensitive, input image sensitive";

test("MiniMax task.error.message is kept and a zero base_resp is not an error", () => {
  assert.equal(
    providerErrorMessage({
      task: { status: "failed", error: { code: 1026, message: MINIMAX_SENSITIVE } },
    }),
    MINIMAX_SENSITIVE,
  );
  assert.equal(
    providerErrorMessage({ base_resp: { status_code: 0, status_msg: "success" }, task_id: "ok" }),
    undefined,
  );
  assert.equal(
    providerErrorMessage({ base_resp: { status_code: 1026, status_msg: "input image sensitive" } }),
    "input image sensitive",
  );
});

test("OpenRouter metadata.raw and HeyGen data.error beat a wrapper message", () => {
  assert.equal(
    providerErrorMessage({
      status: "failed",
      error: {
        message: "Provider returned error",
        metadata: {
          provider_name: "heygen",
          raw: JSON.stringify({ error: { code: "invalid_image", message: "No face detected" } }),
        },
      },
    }),
    "No face detected",
  );
  assert.equal(
    providerErrorMessage({
      data: { error: { code: "invalid_parameter", message: "audio too short" } },
    }),
    "audio too short",
  );
});

test("Google details, ArgoLink message, and FFmpeg JSON are readable", () => {
  assert.equal(
    providerErrorMessage({
      status: "failed",
      error: {
        message: "Provider returned error",
        details: [{ message: "aspect ratio is not supported" }],
      },
    }),
    "aspect ratio is not supported",
  );
  assert.equal(providerErrorMessage({ error: { message: "invalid_input" } }), "invalid_input");
  assert.equal(
    providerFailureText(JSON.stringify({ error: { message: "filter failed" } }), "FFmpeg 處理失敗"),
    "filter failed",
  );
  assert.equal(providerFailureText("failed", "FFmpeg 處理失敗"), "FFmpeg 處理失敗");
  assert.equal(providerFailureText("無法下載輸入媒體（HTTP 404）", "FFmpeg 處理失敗"), "無法下載輸入媒體（HTTP 404）");
});

test("a completed payload is not treated as a failure", () => {
  assert.equal(
    providerErrorMessage({ status: "completed", message: "ok", urls: ["https://cdn.example/out.mp4"] }),
    undefined,
  );
});
