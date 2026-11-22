import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAgentReadme } from "@/app/app/canvas/agent/canvas-agent-readme";

describe("parseAgentReadme", () => {
  it("turns a README reply and older plain bullets into headings and lists", () => {
    const blocks = parseAgentReadme(
      "# What I built\n1. Jim still\n2. Hailuo clip\n\n## Why\n- Nano Banana keeps the face\n• cheaper than Pro\n",
    );
    assert.deepEqual(
      blocks.map((block) => block.kind),
      ["h", "ol", "h", "ul"],
    );
    assert.equal(blocks[1].kind === "ol" ? blocks[1].items[0] : "", "Jim still");
    assert.equal(blocks[3].kind === "ul" ? blocks[3].items.length : 0, 2);
  });
});
