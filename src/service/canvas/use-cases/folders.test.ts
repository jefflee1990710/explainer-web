import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasProjectSummaryDto } from "@/model/canvas-dto";
import { canvasesInFolder, normalizeCanvasFolderName } from "@/service/canvas/core/folder-library";

function project(id: string, folderId?: string): CanvasProjectSummaryDto {
  return {
    id,
    title: id,
    nodeCount: 0,
    ...(folderId ? { folderId } : {}),
    createdAt: "2026-11-24T00:00:00.000Z",
    updatedAt: "2026-11-24T00:00:00.000Z",
  };
}

describe("canvas folders", () => {
  it("trims folder names and caps the length", () => {
    assert.equal(normalizeCanvasFolderName("  Ads  "), "Ads");
    assert.equal(normalizeCanvasFolderName("   "), "");
    assert.equal(normalizeCanvasFolderName("x".repeat(100)).length, 80);
  });

  it("filters all, unfiled, and one folder", () => {
    const projects = [project("a", "f1"), project("b"), project("c", "f1")];
    assert.deepEqual(canvasesInFolder(projects, "all").map((p) => p.id), ["a", "b", "c"]);
    assert.deepEqual(canvasesInFolder(projects, "unfiled").map((p) => p.id), ["b"]);
    assert.deepEqual(canvasesInFolder(projects, "f1").map((p) => p.id), ["a", "c"]);
  });
});
