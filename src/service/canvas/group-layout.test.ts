import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GROUP_ESTIMATED_SIZE, layoutGroupByDepth } from "@/service/canvas/group-layout";

const size = () => GROUP_ESTIMATED_SIZE.model;

function overlaps(
  a: { x: number; y: number },
  b: { x: number; y: number },
  s = GROUP_ESTIMATED_SIZE.model,
) {
  return a.x < b.x + s.width && b.x < a.x + s.width && a.y < b.y + s.height && b.y < a.y + s.height;
}

describe("layoutGroupByDepth", () => {
  it("places a chain left to right", () => {
    const pos = layoutGroupByDepth({
      nodeIds: ["a", "b", "c"],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
      origin: { x: 100, y: 50 },
      sizeOf: size,
    });
    assert.deepEqual(pos.get("a"), { x: 100, y: 50 });
    assert.ok(pos.get("b")!.x > pos.get("a")!.x);
    assert.ok(pos.get("c")!.x > pos.get("b")!.x);
  });

  it("uses the longest path for depth", () => {
    const pos = layoutGroupByDepth({
      nodeIds: ["a", "b", "c"],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "a", target: "c" },
      ],
      origin: { x: 0, y: 0 },
      sizeOf: size,
    });
    assert.ok(pos.get("c")!.x > pos.get("b")!.x);
  });

  it("ignores edges from nodes outside the group", () => {
    const pos = layoutGroupByDepth({
      nodeIds: ["a"],
      edges: [{ source: "outside", target: "a" }],
      origin: { x: 10, y: 20 },
      sizeOf: size,
    });
    assert.deepEqual(pos.get("a"), { x: 10, y: 20 });
  });

  it("never overlaps in a wide fan-in", () => {
    const sources = Array.from({ length: 9 }, (_, i) => `s${i}`);
    const pos = layoutGroupByDepth({
      nodeIds: [...sources, "sink"],
      edges: sources.map((s) => ({ source: s, target: "sink" })),
      origin: { x: 0, y: 0 },
      sizeOf: size,
    });
    const all = [...pos.values()];
    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        assert.ok(!overlaps(all[i]!, all[j]!), `nodes ${i} and ${j} overlap`);
      }
    }
  });

  it("orders a column by its parents' rows", () => {
    const pos = layoutGroupByDepth({
      nodeIds: ["a", "b", "y", "x"],
      edges: [
        { source: "a", target: "x" },
        { source: "b", target: "y" },
      ],
      origin: { x: 0, y: 0 },
      sizeOf: size,
    });
    assert.ok(pos.get("x")!.y < pos.get("y")!.y);
  });
});
