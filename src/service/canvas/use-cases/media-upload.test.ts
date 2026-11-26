import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANVAS_MAX_UPLOAD_BYTES,
  uploadCanvasMediaFromFormData,
} from "@/service/canvas/use-cases/media-upload";

describe("service/canvas/media-upload", () => {
  it("rejects missing or empty files", async () => {
    const emptyForm = new FormData();
    const missing = await uploadCanvasMediaFromFormData("user-1", emptyForm);
    assert.deepEqual(missing, { ok: false, error: "請選擇要上傳的媒體檔案" });

    const zeroForm = new FormData();
    zeroForm.set("file", new File([], "empty.png", { type: "image/png" }));
    const empty = await uploadCanvasMediaFromFormData("user-1", zeroForm);
    assert.deepEqual(empty, { ok: false, error: "檔案內容不可為空" });
  });

  it("rejects unsupported MIME types and oversized files", async () => {
    const pdfForm = new FormData();
    pdfForm.set("file", new File([Buffer.from("pdf")], "doc.pdf", { type: "application/pdf" }));
    const badMime = await uploadCanvasMediaFromFormData("user-1", pdfForm);
    assert.equal(badMime.ok, false);
    if (!badMime.ok) assert.match(badMime.error, /application\/pdf/);

    const hugeFile = {
      size: CANVAS_MAX_UPLOAD_BYTES + 1,
      type: "video/mp4",
      name: "huge.mp4",
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as File;
    const hugeForm = {
      get: (key: string) => (key === "file" ? hugeFile : null),
    } as unknown as FormData;
    const hugeRes = await uploadCanvasMediaFromFormData("user-1", hugeForm);
    assert.deepEqual(hugeRes, { ok: false, error: "檔案大小超過 15 MB 上限" });
  });

  it("normalizes MIME parameters and uploads valid media to deterministic user folder", async () => {
    const calls: Array<{ size: number; pathname: string; contentType: string }> = [];
    const form = new FormData();
    form.set(
      "file",
      new File([Buffer.from("webm-bytes")], "clip.webm", {
        type: "video/webm; codecs=vp9",
      }),
    );

    const res = await uploadCanvasMediaFromFormData("user-42", form, {
      randomId: () => "fixed-uuid",
      persistBuffer: async (buf, pathname, contentType) => {
        calls.push({ size: buf.byteLength, pathname, contentType });
        return `https://blob.example/${pathname}`;
      },
    });

    assert.deepEqual(res, {
      ok: true,
      url: "https://blob.example/canvas/uploads/user-42/fixed-uuid.webm",
      mediaKind: "video",
      fileName: "clip.webm",
      contentType: "video/webm",
      sizeBytes: 10,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.pathname, "canvas/uploads/user-42/fixed-uuid.webm");
  });

  it("returns probed length, size, and sound for uploaded video", async () => {
    const form = new FormData();
    form.set("file", new File([Buffer.from("mp4-bytes")], "talk.mp4", { type: "video/mp4" }));
    const res = await uploadCanvasMediaFromFormData("user-42", form, {
      randomId: () => "id",
      persistBuffer: async (_buf, pathname) => `https://blob.example/${pathname}`,
      probeBuffer: async () =>
        "  Duration: 00:00:07.50, start: 0.0\n  Stream #0:0: Video: h264, yuv420p, 720x1280, 30 fps\n  Stream #0:1: Audio: aac, 48000 Hz",
    });
    assert.ok(res.ok);
    if (res.ok) {
      assert.deepEqual(res.meta, {
        url: "https://blob.example/canvas/uploads/user-42/id.mp4",
        durationSec: 7.5,
        hasAudio: true,
        width: 720,
        height: 1280,
      });
    }
  });
});
