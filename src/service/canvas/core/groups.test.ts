import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import {
  canvasGroupsForProject,
  groupFrameBounds,
  inferLegacyGroups,
  normalizeCanvasGroups,
  withGroup,
} from "@/service/canvas/core/groups";

function node(id: string, data: CanvasNode["data"] = {}): CanvasNode {
  return { id, type: "model", position: { x: 0, y: 0 }, data };
}

function group(id: string, memberIds: string[]): CanvasGroup {
  return { id, title: id, color: "slate", kind: "custom", memberIds };
}

describe("normalizeCanvasGroups", () => {
  it("drops missing members, empty groups, and second memberships", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const out = normalizeCanvasGroups(
      [group("g1", ["a", "gone"]), group("g2", ["a", "b"]), group("g3", ["gone"]), group("g1", ["c"])],
      nodes,
    );
    assert.deepEqual(
      out.map((g) => [g.id, g.memberIds]),
      [
        ["g1", ["a"]],
        ["g2", ["b"]],
      ],
    );
  });
});

describe("inferLegacyGroups", () => {
  it("groups expanded Explainer, Talking Head, and agent swap nodes by prefix", () => {
    const nodes = [
      node("media-5c839307"),
      node("exp-020dc4-ref-1", { aspectRatio: "9:16" }),
      node("exp-020dc4-frame-1"),
      node("exp-020dc4-voice-1", { toolParams: { characterId: "6afaa18cbdd00015c634043e", language: "yue" } }),
      node("th-abc123-frame-1"),
      node("th-abc123-video-1"),
      node("grp-n1-trim"),
      node("grp-n1-render", { modelId: "scro:swap-render" }),
      node("life-zzzzzz-image"),
    ];
    const groups = inferLegacyGroups(nodes);
    assert.deepEqual(
      groups.map((g) => [g.id, g.kind, g.memberIds.length]),
      [
        ["exp-020dc4", "explainer", 3],
        ["th-abc123", "talking-head", 2],
        ["grp-n1", "swap", 2],
      ],
    );
    assert.deepEqual(groups[0]!.params, {
      characterId: "6afaa18cbdd00015c634043e",
      language: "yue",
      aspectRatio: "9:16",
    });
  });

  it("skips nodes that already belong to a group", () => {
    const nodes = [node("exp-020dc4-a"), node("exp-020dc4-b")];
    const groups = inferLegacyGroups(nodes, [group("mine", ["exp-020dc4-a", "exp-020dc4-b"])]);
    assert.deepEqual(groups.map((g) => g.id), ["mine"]);
  });
});

describe("canvasGroupsForProject", () => {
  it("infers only when the groups field is missing", () => {
    const nodes = [node("exp-020dc4-a"), node("exp-020dc4-b")];
    assert.equal(canvasGroupsForProject(nodes, undefined).length, 1);
    assert.equal(canvasGroupsForProject(nodes, []).length, 0);
  });
});

describe("withGroup", () => {
  it("moves members out of their old group and replaces a group with the same id", () => {
    const out = withGroup([group("g1", ["a", "b"]), group("g2", ["c"])], group("g3", ["b", "c"]));
    assert.deepEqual(
      out.map((g) => [g.id, g.memberIds]),
      [
        ["g1", ["a"]],
        ["g3", ["b", "c"]],
      ],
    );
  });
});

describe("groupFrameBounds", () => {
  it("pads member rectangles and leaves room for the title bar", () => {
    assert.deepEqual(
      groupFrameBounds([
        { x: 0, y: 100, width: 100, height: 50 },
        { x: 200, y: 0, width: 50, height: 60 },
      ]),
      { x: -28, y: -72, width: 306, height: 250 },
    );
    assert.equal(groupFrameBounds([]), null);
  });
});
