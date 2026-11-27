import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  flowDeltaFromScreen,
  isModifierSelectionGesture,
  nodeFullyInsideRect,
  nodeSelectionBox,
  nodesInsideSelection,
  selectionPassedThreshold,
  selectionPlatformOf,
  selectionRectFromPoints,
  selectedMoveOrigins,
  translatePositions,
  withSelectedIds,
} from "@/app/app/canvas/canvas-modifier-selection";

describe("modifier selection gesture", () => {
  it("uses Command on Mac and ignores a plain or Control drag", () => {
    assert.equal(selectionPlatformOf({ platform: "MacIntel" }), "mac");
    assert.equal(
      isModifierSelectionGesture({ platform: "mac", button: 0, metaKey: true, ctrlKey: false }),
      true,
    );
    assert.equal(
      isModifierSelectionGesture({ platform: "mac", button: 0, metaKey: false, ctrlKey: true }),
      false,
    );
    assert.equal(
      isModifierSelectionGesture({ platform: "mac", button: 0, metaKey: false, ctrlKey: false }),
      false,
    );
    assert.equal(
      isModifierSelectionGesture({ platform: "mac", button: 2, metaKey: true, ctrlKey: false }),
      false,
    );
  });

  it("uses Control on Windows and ignores a plain or Command drag", () => {
    assert.equal(selectionPlatformOf({ platform: "Win32", userAgent: "Windows" }), "other");
    assert.equal(selectionPlatformOf({ platform: "Linux x86_64" }), "other");
    assert.equal(
      isModifierSelectionGesture({ platform: "other", button: 0, metaKey: false, ctrlKey: true }),
      true,
    );
    assert.equal(
      isModifierSelectionGesture({ platform: "other", button: 0, metaKey: true, ctrlKey: false }),
      false,
    );
    assert.equal(
      isModifierSelectionGesture({ platform: "other", button: 0, metaKey: false, ctrlKey: false }),
      false,
    );
    assert.equal(
      isModifierSelectionGesture({ platform: "other", button: 1, metaKey: false, ctrlKey: true }),
      false,
    );
  });
});

describe("nodes inside the selection box", () => {
  const nodes = [
    { id: "in", x: 10, y: 10, width: 40, height: 20 },
    { id: "partial", x: 90, y: 10, width: 40, height: 20 },
    { id: "out", x: 200, y: 10, width: 40, height: 20 },
    { id: "hidden", x: 12, y: 12, width: 10, height: 10, hidden: true },
    { id: "frame", x: 12, y: 12, width: 10, height: 10, selectable: false },
  ];

  it("selects only nodes fully inside, including a drag that starts at the bottom-right", () => {
    const rect = selectionRectFromPoints({ x: 100, y: 80 }, { x: 0, y: 0 });
    assert.deepEqual(nodesInsideSelection(nodes, rect), ["in"]);
    assert.equal(nodeFullyInsideRect(nodes[1]!, rect), false);
  });

  it("waits until the pointer has actually moved", () => {
    assert.equal(selectionPassedThreshold(2, 2), false);
    assert.equal(selectionPassedThreshold(5, 0), true);
  });

  it("prefers the measured card size", () => {
    const box = nodeSelectionBox({
      id: "a",
      position: { x: 1, y: 2 },
      width: 10,
      height: 10,
      measured: { width: 160, height: 64 },
    });
    assert.deepEqual(box, { id: "a", x: 1, y: 2, width: 160, height: 64, hidden: undefined, selectable: undefined });
  });
});

describe("move the selection together", () => {
  const nodes = [
    { id: "a", position: { x: 10, y: 20 }, selected: true },
    { id: "b", position: { x: 30, y: 40 }, selected: true, draggable: false },
    { id: "c", position: { x: 50, y: 60 }, selected: true },
    { id: "d", position: { x: 70, y: 80 }, selected: false },
  ];

  it("drags every selected unlocked node by the same flow delta", () => {
    const origins = selectedMoveOrigins(nodes, new Set(["c"]));
    assert.deepEqual([...origins.keys()], ["a"]);
    const moved = translatePositions(nodes, origins, flowDeltaFromScreen(20, -10, 2));
    assert.deepEqual(moved[0]!.position, { x: 20, y: 15 });
    assert.equal(moved[1], nodes[1]);
    assert.equal(moved[2], nodes[2]);
    assert.equal(moved[3], nodes[3]);
  });

  it("replaces the selection with the ids inside the box", () => {
    const next = withSelectedIds(
      [
        { id: "a", selected: true },
        { id: "b", selected: false },
      ],
      new Set(["b"]),
    );
    assert.deepEqual(
      next.map((node) => node.selected),
      [false, true],
    );
    const same = withSelectedIds(next, new Set(["b"]));
    assert.equal(same, next);
  });
});
