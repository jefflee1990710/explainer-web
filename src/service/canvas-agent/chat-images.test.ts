import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  acceptedCanvasAgentImageUrl,
  buildCanvasAgentModelMessages,
  chatImageAssets,
  parseCanvasAgentImageUrls,
} from "@/service/canvas-agent/chat-images";

const USER = "user_abc";
const PHOTO = "https://abc.public.blob.vercel-storage.com/canvas/uploads/user_abc/a.png";
const OLDER = "https://abc.public.blob.vercel-storage.com/canvas/uploads/user_abc/older.png";

describe("canvas agent chat images", () => {
  it("accepts only this user's canvas uploads", () => {
    assert.equal(acceptedCanvasAgentImageUrl(PHOTO, USER), true);
    assert.equal(
      acceptedCanvasAgentImageUrl("https://blob.vercel-storage.com/canvas/uploads/user_abc/a.png", USER),
      true,
    );
    assert.equal(
      acceptedCanvasAgentImageUrl(
        "https://abc.public.blob.vercel-storage.com/canvas/uploads/user_other/a.png",
        USER,
      ),
      false,
    );
    assert.equal(acceptedCanvasAgentImageUrl("http://abc.public.blob.vercel-storage.com/canvas/uploads/user_abc/a.png", USER), false);
    assert.equal(acceptedCanvasAgentImageUrl("https://evil.example/canvas/uploads/user_abc/a.png", USER), false);
    assert.equal(parseCanvasAgentImageUrls(undefined, USER).ok, true);
    const tooMany = parseCanvasAgentImageUrls([PHOTO, PHOTO, PHOTO, PHOTO, PHOTO], USER);
    assert.equal(tooMany.ok, false);
  });

  it("keeps a text-only turn as a string", () => {
    const built = buildCanvasAgentModelMessages({
      history: [
        { role: "user", text: "m0" },
        { role: "assistant", text: "m1" },
      ],
      message: "now",
      historyLimit: 20,
    });
    assert.deepEqual(built.imageUrls, []);
    assert.equal(built.messages.at(-1)?.content, "now");
    assert.equal(built.messages[0]?.content, "m0");
  });

  it("sends the attached photo as an image part and a list_assets id", () => {
    const built = buildCanvasAgentModelMessages({
      history: [],
      message: "use this",
      imageUrls: [PHOTO],
      historyLimit: 20,
    });
    assert.deepEqual(built.imageUrls, [PHOTO]);
    const content = built.messages.at(-1)?.content;
    assert.ok(Array.isArray(content));
    assert.equal(content[0]?.type, "text");
    if (content[0]?.type !== "text") return;
    assert.match(content[0].text, /use this/);
    assert.match(content[0].text, /chat-image-1/);
    assert.equal(content[1]?.type, "image");
    if (content[1]?.type !== "image") return;
    assert.equal(content[1].image.href, PHOTO);
    assert.equal(chatImageAssets(built.imageUrls)[0]?.id, "chat-image-1");
    assert.equal(chatImageAssets(built.imageUrls)[0]?.url, PHOTO);
  });

  it("still shows a photo when the user did not type a caption", () => {
    const built = buildCanvasAgentModelMessages({
      history: [],
      message: "  ",
      imageUrls: [PHOTO],
      historyLimit: 20,
    });
    const content = built.messages.at(-1)?.content;
    assert.ok(Array.isArray(content));
    assert.equal(content[0]?.type, "text");
    if (content[0]?.type !== "text") return;
    assert.match(content[0].text, /did not write a message/);
  });

  it("ignores a url that is not a canvas upload", () => {
    const built = buildCanvasAgentModelMessages({
      history: [],
      message: "hi",
      imageUrls: ["https://evil.example/a.png"],
      historyLimit: 20,
    });
    assert.equal(built.messages.at(-1)?.content, "hi");
    assert.deepEqual(built.imageUrls, []);
  });

  it("reuses the latest earlier photo when this message has none", () => {
    const built = buildCanvasAgentModelMessages({
      history: [
        { role: "user", text: "see this", imageUrls: [OLDER] },
        { role: "assistant", text: "ok" },
      ],
      message: "use it",
      historyLimit: 20,
    });
    assert.deepEqual(built.imageUrls, [OLDER]);
    const first = built.messages[0]?.content;
    assert.ok(Array.isArray(first));
    assert.equal(built.messages.at(-1)?.content, "use it");
  });

  it("prefers photos attached on this message over older ones", () => {
    const built = buildCanvasAgentModelMessages({
      history: [{ role: "user", text: "old", imageUrls: [OLDER] }],
      message: "new",
      imageUrls: [PHOTO],
      historyLimit: 20,
    });
    assert.deepEqual(built.imageUrls, [PHOTO]);
    assert.equal(typeof built.messages[0]?.content, "string");
    assert.match(String(built.messages[0]?.content), /older\.png/);
    assert.ok(Array.isArray(built.messages[1]?.content));
  });
});
