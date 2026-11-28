import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANVAS_MAX_UPLOAD_BYTES,
  CANVAS_UPLOAD_NON_RSC_MESSAGE,
  explainCanvasUploadFailure,
} from "@/service/canvas/core/media-upload-rules";

describe("canvas media upload errors", () => {
  it("replaces the generic Next.js message with the real size, type, or sign-in reason", () => {
    const unexpected = new Error(CANVAS_UPLOAD_NON_RSC_MESSAGE);
    assert.equal(
      explainCanvasUploadFailure(unexpected, { type: "video/mp4", size: CANVAS_MAX_UPLOAD_BYTES + 1 }),
      "檔案大小超過 15 MB 上限",
    );
    const typed = explainCanvasUploadFailure(unexpected, { type: "application/pdf", size: 20 });
    assert.match(typed, /application\/pdf/);
    assert.equal(
      explainCanvasUploadFailure(unexpected, { type: "image/png", size: 32 }),
      "請先登入",
    );
    assert.equal(
      explainCanvasUploadFailure(new Error("Blob 拒絕這個檔案"), { type: "image/png", size: 32 }),
      "Blob 拒絕這個檔案",
    );
  });
});