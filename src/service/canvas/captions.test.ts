import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { applyCaptionScript } from "@/service/canvas/caption-traditional";
import {
  autoCaptionsCostUsd,
  cuesFromScribeWords,
  cuesFromSubtitleText,
  cuesToSrt,
  parseSrt,
} from "@/service/canvas/captions";
import { resolveNodeInputs } from "@/service/canvas/graph";

describe("auto captions", () => {
  it("writes Cantonese captions in Hong Kong Traditional and leaves other languages unchanged", () => {
    const simplified = "这段是香港广东话测试。今天天气很好，我们现在试一下自动字幕，看下识不识得写回口语。";
    const traditional = applyCaptionScript(simplified, "yue");
    assert.equal(
      traditional,
      "這段是香港廣東話測試。今天天氣很好，我們現在試一下自動字幕，看下識不識得寫回口語。",
    );
    assert.equal(applyCaptionScript("這段係繁體。", "yue"), "這段係繁體。");
    assert.equal(applyCaptionScript(simplified, "zh"), simplified);
    assert.equal(applyCaptionScript("Hello 123", "en"), "Hello 123");
    assert.equal(applyCaptionScript(simplified, "auto"), simplified);
  });

  it("bills Scribe at $0.20 per hour", () => {
    assert.equal(autoCaptionsCostUsd(3600), 0.2);
    assert.equal(autoCaptionsCostUsd(18), 0.001);
    assert.equal(autoCaptionsCostUsd(0), 0);
  });

  it("groups word times into short cues and round-trips SRT", () => {
    const cues = cuesFromScribeWords([
      { text: "你好世界", start: 0.1, end: 0.8, type: "word" },
      { text: "。", start: 0.8, end: 0.9, type: "word" },
      { text: " ", start: 0.9, end: 0.9, type: "spacing" },
      { text: "字幕", start: 1, end: 1.4, type: "word" },
      { text: "測試", start: 1.4, end: 1.8, type: "word" },
      { text: "。", start: 1.8, end: 2, type: "word" },
      { text: "(laughter)", start: 2, end: 2.4, type: "audio_event" },
    ]);
    assert.equal(cues.length, 2);
    assert.equal(cues[0]?.text, "你好世界。");
    assert.equal(cues[1]?.text, "字幕測試。");
    const parsed = parseSrt(cuesToSrt(cues));
    assert.equal(parsed[1]?.text, "字幕測試。");
    assert.ok(parsed[1]!.start >= 0.8);
  });

  it("treats plain text as one cue and reads a caption node's SRT into the burn node", () => {
    const plain = cuesFromSubtitleText("你好", 3);
    assert.equal(plain.length, 1);
    assert.equal(plain[0]?.end, 3);

    const captions: CanvasNode = {
      id: "cap",
      type: "model",
      position: { x: 0, y: 0 },
      data: {
        modelId: "scro:auto-captions",
        text: cuesToSrt([{ start: 0, end: 1.5, text: "你好" }]),
        outputUrl: "https://blob.example/a.srt",
        outputKind: "text",
        status: "completed",
      },
    };
    const video: CanvasNode = {
      id: "vid",
      type: "media",
      position: { x: 0, y: 0 },
      data: { mediaKind: "video", mediaUrl: "https://blob.example/v.mp4" },
    };
    const burn: CanvasNode = {
      id: "burn",
      type: "model",
      position: { x: 0, y: 0 },
      data: { modelId: "ffmpeg:burn-subtitles", prompt: "ignored" },
    };
    const edges: CanvasEdge[] = [
      { id: "e1", source: "cap", sourceHandle: "output", target: "burn", targetHandle: "prompt" },
      { id: "e2", source: "vid", sourceHandle: "output", target: "burn", targetHandle: "video" },
    ];
    const resolved = resolveNodeInputs("burn", [captions, video, burn], edges);
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.match(resolved.inputs.prompt ?? "", /你好/);
      assert.equal(resolved.inputs.video, "https://blob.example/v.mp4");
    }
  });
});
