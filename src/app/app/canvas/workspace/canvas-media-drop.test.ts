import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNodeData } from "@/model/canvas";
import { canvasNodeDataSchema } from "@/model/canvas";
import { getNodeOutputPortType } from "@/service/canvas/core/graph";
import type { UploadCanvasMediaResult } from "@/service/canvas/use-cases/media-upload";
import { toDomainNodes, type FlowNode } from "@/app/app/canvas/workspace/canvas-graph-state";
import {
  droppedImageOrVideoKind,
  forgetUploadPreview,
  placeDroppedCanvasFiles,
} from "@/app/app/canvas/workspace/canvas-media-drop";

function file(name: string, type: string): File {
  return new File(["bytes"], name, { type });
}

function ok(kind: "image" | "video" | "audio", name: string): UploadCanvasMediaResult {
  return {
    ok: true,
    url: `https://blob.example/${name}`,
    mediaKind: kind,
    fileName: name,
    contentType: kind === "image" ? "image/png" : kind === "video" ? "video/mp4" : "audio/mpeg",
    sizeBytes: 5,
  };
}

function apply(nodes: FlowNode[], update: (prev: FlowNode[]) => FlowNode[]) {
  const next = update(nodes);
  nodes.splice(0, nodes.length, ...next);
}

describe("dropped image and video files", () => {
  it("classifies only image and video MIME types", () => {
    assert.equal(droppedImageOrVideoKind(file("a.png", "image/png")), "image");
    assert.equal(droppedImageOrVideoKind(file("a.jpg", "image/jpeg; charset=binary")), "image");
    assert.equal(droppedImageOrVideoKind(file("a.mp4", "video/mp4")), "video");
    assert.equal(droppedImageOrVideoKind(file("a.mov", "video/quicktime")), "video");
    assert.equal(droppedImageOrVideoKind(file("a.mp3", "audio/mpeg")), null);
    assert.equal(droppedImageOrVideoKind(file("a.pdf", "application/pdf")), null);
    assert.equal(droppedImageOrVideoKind(file("a.png", "")), null);
  });

  it("shows an image placeholder before the upload finishes, then the real node", async () => {
    const nodes: FlowNode[] = [];
    let settled = 0;
    let during = false;
    await placeDroppedCanvasFiles({
      files: [file("shot.png", "image/png")],
      position: { x: 10, y: 20 },
      createId: () => "media-shot",
      upload: async (_file, reportProgress) => {
        during = nodes[0]?.data.mediaUpload?.phase === "uploading" && !nodes[0]?.data.mediaUrl;
        reportProgress(40);
        assert.equal(nodes[0]?.data.mediaUpload?.progress, 40);
        return ok("image", "shot.png");
      },
      onNodes: (update) => apply(nodes, update),
      onError: () => assert.fail("image upload should not toast"),
      onSettled: () => {
        settled += 1;
      },
    });

    assert.equal(during, true);
    assert.equal(settled, 1);
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0]?.id, "media-shot");
    assert.equal(nodes[0]?.connectable, true);
    assert.equal(nodes[0]?.position.x, 10);
    assert.deepEqual(nodes[0]?.data, {
      label: "shot.png",
      fileName: "shot.png",
      mediaKind: "image",
      mediaUrl: "https://blob.example/shot.png",
    });
  });

  it("places every image and video placeholder before the first upload", async () => {
    const nodes: FlowNode[] = [];
    let uploads = 0;
    await placeDroppedCanvasFiles({
      files: [file("a.png", "image/png"), file("b.mp4", "video/mp4")],
      position: { x: 0, y: 0 },
      createId: (() => {
        let n = 0;
        return () => `m-${++n}`;
      })(),
      upload: async (dropped) => {
        uploads += 1;
        if (uploads === 1) {
          assert.deepEqual(
            nodes.map((node) => [node.id, node.position.x, node.data.mediaKind, node.data.mediaUpload?.phase]),
            [
              ["m-1", 0, "image", "uploading"],
              ["m-2", 44, "video", "uploading"],
            ],
          );
        }
        return ok(dropped.type.startsWith("video/") ? "video" : "image", dropped.name);
      },
      onNodes: (update) => apply(nodes, update),
      onError: () => assert.fail("unexpected error"),
      onSettled: () => {},
    });
    assert.equal(nodes[1]?.data.mediaUrl, "https://blob.example/b.mp4");
    assert.equal(nodes[1]?.data.mediaUpload, undefined);
  });

  it("keeps a failed image on the canvas and does not restore one the user dismissed", async () => {
    const failedNodes: FlowNode[] = [];
    await placeDroppedCanvasFiles({
      files: [file("huge.png", "image/png")],
      position: { x: 0, y: 0 },
      createId: () => "m-fail",
      upload: async () => ({ ok: false, error: "檔案大小超過 15 MB 上限" }),
      onNodes: (update) => apply(failedNodes, update),
      onError: () => assert.fail("visual failures stay on the card"),
      onSettled: () => assert.fail("a failed upload should not save"),
    });
    assert.equal(failedNodes[0]?.data.mediaUpload?.phase, "failed");
    assert.equal(failedNodes[0]?.data.mediaUpload?.error, "檔案大小超過 15 MB 上限");
    assert.equal(failedNodes[0]?.data.mediaUrl, undefined);
    forgetUploadPreview("m-fail");

    const nodes: FlowNode[] = [];
    let release: (result: UploadCanvasMediaResult) => void = () => {};
    const pending = placeDroppedCanvasFiles({
      files: [file("gone.png", "image/png")],
      position: { x: 4, y: 4 },
      createId: () => "m-gone",
      upload: () =>
        new Promise<UploadCanvasMediaResult>((resolve) => {
          release = resolve;
        }),
      onNodes: (update) => apply(nodes, update),
      onError: () => assert.fail("dismissed upload should not toast"),
      onSettled: () => assert.fail("a dismissed upload should not save"),
    });
    assert.equal(nodes[0]?.data.mediaUpload?.phase, "uploading");
    nodes.splice(0, nodes.length);
    release(ok("image", "gone.png"));
    await pending;
    assert.deepEqual(nodes, []);
  });

  it("leaves audio and other files on the old upload-then-place path", async () => {
    const nodes: FlowNode[] = [];
    const errors: string[] = [];
    let seenNodeDuringAudio = false;
    await placeDroppedCanvasFiles({
      files: [file("nope.pdf", "application/pdf"), file("voice.mp3", "audio/mpeg")],
      position: { x: 8, y: 8 },
      createId: () => "audio-1",
      upload: async (dropped) => {
        seenNodeDuringAudio = nodes.length > 0;
        if (dropped.name.endsWith(".pdf")) return { ok: false, error: "不支援的檔案格式（application/pdf）" };
        return ok("audio", "voice.mp3");
      },
      onNodes: (update) => apply(nodes, update),
      onError: (message) => errors.push(message),
      onSettled: () => {},
    });

    assert.equal(seenNodeDuringAudio, false);
    assert.deepEqual(errors, ["不支援的檔案格式（application/pdf）"]);
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0]?.position.x, 8);
    assert.equal(nodes[0]?.data.mediaKind, "audio");
    assert.equal(nodes[0]?.data.mediaUpload, undefined);
  });

  it("omits unsettled placeholders from the saved graph and blocks their output port", () => {
    const uploading: FlowNode = {
      id: "up",
      type: "media",
      position: { x: 1.2, y: 2.8 },
      data: { mediaKind: "image", fileName: "a.png", mediaUpload: { phase: "uploading", progress: 10 } },
    };
    const failed: FlowNode = {
      id: "bad",
      type: "media",
      position: { x: 3, y: 4 },
      data: { mediaKind: "video", mediaUpload: { phase: "failed", error: "nope" } },
    };
    const ready: FlowNode = {
      id: "ok",
      type: "media",
      position: { x: 5, y: 6 },
      data: {
        mediaKind: "image",
        mediaUrl: "https://blob.example/ok.png",
        mediaUpload: { phase: "uploading" },
      },
    };
    const saved = toDomainNodes([uploading, failed, { ...ready, data: { ...ready.data, mediaUpload: undefined } }]);
    assert.deepEqual(saved.map((node) => node.id), ["ok"]);
    assert.equal(saved[0]?.data.mediaUpload, undefined);

    const stillThere = toDomainNodes([
      {
        ...ready,
        data: { mediaKind: "image", mediaUrl: "https://blob.example/ok.png", mediaUpload: { phase: "uploading" } },
      },
    ]);
    assert.deepEqual(stillThere, []);

    assert.equal(
      getNodeOutputPortType({
        id: "up",
        type: "media",
        position: { x: 0, y: 0 },
        data: uploading.data,
      }),
      null,
    );
    assert.equal(
      getNodeOutputPortType({
        id: "ok",
        type: "media",
        position: { x: 0, y: 0 },
        data: { mediaKind: "image", mediaUrl: "https://blob.example/ok.png" },
      }),
      "image",
    );

    const parsed = canvasNodeDataSchema.parse({
      mediaKind: "image",
      mediaUpload: { phase: "failed", error: "x", progress: 3 },
    } satisfies CanvasNodeData);
    assert.equal(parsed.mediaUpload?.phase, "failed");
  });
});
