import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildExplainerExpansion, type ExplainerExpansionClip } from "@/service/canvas/directors/explainer-expand";
import {
  EXPLAINER_ESTIMATED_SIZE,
  explainerNodeRole,
  layoutExplainerGroup,
  shiftGroupClearOf,
  type LayoutBox,
  type LayoutSize,
} from "@/service/canvas/directors/explainer-layout";

function clips(n: number, silent: number[] = []): ExplainerExpansionClip[] {
  return Array.from({ length: n }, (_, i) => ({
    clipNumber: i + 1,
    framePrompt: `frame ${i + 1}`,
    videoPrompt: `video ${i + 1}`,
    durationSeconds: 6,
    spokenLine: silent.includes(i + 1) ? "(no dialogue)" : `line ${i + 1}`,
  }));
}

const expansion = (n: number, silent: number[] = []) =>
  buildExplainerExpansion({
    idPrefix: "exp-abc123",
    origin: { x: 100, y: 50 },
    aspectRatio: "9:16",
    language: "en",
    voicePreset: "bella",
    clips: clips(n, silent),
  });

const estimated = (id: string): LayoutSize =>
  EXPLAINER_ESTIMATED_SIZE[explainerNodeRole(id)!.role];

function boxes(positions: Map<string, { x: number; y: number }>, sizeOf: (id: string) => LayoutSize) {
  return [...positions].map(([id, p]) => ({ id, ...p, ...sizeOf(id) }));
}

function assertNoOverlap(list: (LayoutBox & { id: string })[]) {
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const b = list[j];
      const hit =
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      assert.ok(!hit, `${a.id} overlaps ${b.id}`);
    }
  }
}

describe("layoutExplainerGroup", () => {
  it("places every card without overlap, including silent clips and chained concats", () => {
    const out = expansion(10, [4]);
    const positions = new Map(out.nodes.map((n) => [n.id, n.position]));
    assertNoOverlap(boxes(positions, estimated));
    assert.deepEqual(positions.get("exp-abc123-frame-1"), { x: 100, y: 50 });
  });

  it("puts reference images in a left column beside the first frame they feed", () => {
    const out = buildExplainerExpansion({
      idPrefix: "exp-abc123",
      origin: { x: 100, y: 50 },
      aspectRatio: "9:16",
      language: "en",
      voicePreset: "bella",
      clips: clips(4).map((clip) => ({
        ...clip,
        refUrls: clip.clipNumber === 3 ? ["https://a.png", "https://z.png"] : ["https://a.png", "https://b.png"],
      })),
    });
    const positions = new Map(out.nodes.map((n) => [n.id, n.position]));
    assertNoOverlap(boxes(positions, estimated));
    const at = (id: string) => positions.get(`exp-abc123-${id}`)!;
    assert.deepEqual(at("ref-1"), { x: 100, y: 50 });
    assert.ok(at("frame-1").x >= 100 + EXPLAINER_ESTIMATED_SIZE.ref.width);
    // "z" is first used by clip 3, so it waits for that row.
    assert.ok(at("ref-3").y >= at("frame-3").y);
  });

  it("keeps the voice card below the video card so its wire never crosses it", () => {
    const out = expansion(2);
    const at = (id: string) => out.nodes.find((n) => n.id === `exp-abc123-${id}`)!.position;
    const videoBottom = at("video-1").y + EXPLAINER_ESTIMATED_SIZE.video.height;
    assert.ok(at("voice-1").y > videoBottom);
    assert.ok(at("frame-2").y > at("voice-1").y + EXPLAINER_ESTIMATED_SIZE.voice.height);
    assert.ok(at("mux-1").x > at("video-1").x + EXPLAINER_ESTIMATED_SIZE.video.width);
    assert.ok(at("concat-1").x > at("mux-1").x + EXPLAINER_ESTIMATED_SIZE.mux.width);
  });

  it("re-lays out with measured sizes so tall cards still do not overlap", () => {
    const out = expansion(3);
    const measured = (): LayoutSize => ({ width: 340, height: 900 });
    const positions = layoutExplainerGroup({
      nodeIds: out.nodes.map((n) => n.id),
      edges: out.edges,
      origin: { x: 0, y: 0 },
      sizeOf: measured,
    });
    assertNoOverlap(boxes(positions, measured));
  });
});

describe("shiftGroupClearOf", () => {
  it("moves the group below any card it would cover and leaves clear groups alone", () => {
    const out = expansion(2);
    const positions = new Map(out.nodes.map((n) => [n.id, n.position]));
    assert.equal(shiftGroupClearOf(positions, estimated, []), positions);

    const obstacle = { x: 300, y: 200, width: 312, height: 400 };
    const moved = shiftGroupClearOf(positions, estimated, [obstacle]);
    const top = Math.min(...[...moved.values()].map((p) => p.y));
    assert.ok(top >= obstacle.y + obstacle.height);
    const all = [...boxes(moved, estimated), { id: "obstacle", ...obstacle }];
    assertNoOverlap(all);
  });
});
