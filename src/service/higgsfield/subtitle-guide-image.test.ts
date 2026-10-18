import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  extractSubtitleForGuide,
  renderSubtitleGuideDataUrl,
  renderSubtitleGuideSvg,
  splitSubtitleGuideLines,
  subtitleGuidePromptLine,
} from "@/service/higgsfield/subtitle-guide-image";

test("splitSubtitleGuideLines splits 4+ English words and 6+ CJK characters into two balanced lines", () => {
  assert.deepEqual(splitSubtitleGuideLines("Try it now"), ["Try it now"]);
  assert.deepEqual(splitSubtitleGuideLines("That's why you use Scro.io."), [
    "That's why you",
    "use Scro.io.",
  ]);
  assert.deepEqual(splitSubtitleGuideLines("but who has time to script and edit every day?"), [
    "but who has time to",
    "script and edit every day?",
  ]);
  assert.deepEqual(splitSubtitleGuideLines("零預算做行銷，點樣日日出片？"), [
    "零預算做行銷，",
    "點樣日日出片？",
  ]);
});

test("splitSubtitleGuideLines never breaks an English word or number inside a Chinese line", () => {
  assert.deepEqual(splitSubtitleGuideLines("有無諗過你個Instagram都可以變成你的生財工具？"), [
    "有無諗過你個Instagram",
    "都可以變成你的生財工具？",
  ]);
  assert.deepEqual(splitSubtitleGuideLines("用Scro.io每日出片，粉絲由0去到10000"), [
    "用Scro.io每日出片，",
    "粉絲由0去到10000",
  ]);
  assert.deepEqual(splitSubtitleGuideLines("其實你部iPhone 17 Pro已經夠晒用"), [
    "其實你部iPhone 17 Pro",
    "已經夠晒用",
  ]);
});

test("extractSubtitleForGuide reads the quoted Subtitle sentence from the scene or falls back to spoken line", () => {
  assert.equal(
    extractSubtitleForGuide({
      scene: 'Character: seated. Subtitle: one LARGE line, exactly "What if you have zero budget?"',
      spoken: "Fallback line",
      enabled: true,
    }),
    "What if you have zero budget?",
  );
  assert.equal(
    extractSubtitleForGuide({
      scene: "角色：坐住。字幕：一個大字幕，逐字係「零預算做行銷」。",
      spoken: "Fallback",
      enabled: true,
    }),
    "零預算做行銷",
  );
  assert.equal(
    extractSubtitleForGuide({
      scene: "Character: seated.",
      spoken: "(no dialogue)",
      enabled: true,
    }),
    undefined,
  );
  assert.equal(
    extractSubtitleForGuide({
      scene: 'Subtitle: "Hello"',
      spoken: "Hello",
      enabled: false,
    }),
    undefined,
  );
});

test("renderSubtitleGuideSvg and renderSubtitleGuideDataUrl render a valid PNG data URL without AI calls", async () => {
  const svg = renderSubtitleGuideSvg({
    line: "but who has time to script and edit every day?",
    look: "clean",
  });
  assert.match(svg, /but who has time to/);
  assert.match(svg, /script and edit every day\?/);

  const dataUrl = await renderSubtitleGuideDataUrl({
    line: "but who has time to script and edit every day?",
    look: "clean",
  });
  assert.match(dataUrl, /^data:image\/png;base64,/);
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const meta = await sharp(Buffer.from(base64, "base64")).metadata();
  assert.equal(meta.format, "png");
  assert.equal(meta.width, 960);
  assert.equal(meta.height, 360);

  assert.match(
    subtitleGuidePromptLine(3, "but who has time to script and edit every day?"),
    /SUBTITLE SPELLING GUIDE: attached image 3/,
  );
});
