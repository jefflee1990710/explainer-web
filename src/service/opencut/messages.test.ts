import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createScroOpenCutHost } from "@/service/opencut/host-channel";
import { isEditorToHostMessage } from "@/service/opencut/messages";

describe("opencut bridge messages", () => {
  it("recognizes valid editor-to-host message objects and rejects invalid payloads", () => {
    assert.equal(isEditorToHostMessage({ type: "scro-editor-ready" }), true);
    assert.equal(
      isEditorToHostMessage({
        type: "scro-load-progress",
        videoId: "vid-1",
        current: 1,
        total: 4,
      }),
      true,
    );
    assert.equal(isEditorToHostMessage(null), false);
    assert.equal(isEditorToHostMessage("scro-editor-ready"), false);
    assert.equal(isEditorToHostMessage({ videoId: "vid-1" }), false);
  });

  it("delivers typed messages across host and editor subscribers", () => {
    const host = createScroOpenCutHost();
    const receivedByEditor: unknown[] = [];
    const receivedByScro: unknown[] = [];

    const unsubEditor = host.subscribeEditor((msg) => receivedByEditor.push(msg));
    const unsubScro = host.subscribeScro((msg) => receivedByScro.push(msg));

    host.postToEditor({
      type: "scro-clear-checked",
      videoId: "vid-123",
    });
    host.postToScro({
      type: "scro-editor-ready",
    });

    assert.equal(receivedByEditor.length, 1);
    assert.deepEqual(receivedByEditor[0], {
      type: "scro-clear-checked",
      videoId: "vid-123",
    });
    assert.equal(receivedByScro.length, 1);
    assert.deepEqual(receivedByScro[0], {
      type: "scro-editor-ready",
    });

    unsubEditor();
    unsubScro();
  });
});
