import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildCastSlotItems,
  computeSkillSwitchState,
  cycleOption,
  getAspectRatioIconSizeClass,
  getDirectorHeroCopy,
  isFullBleedStudioPath,
  LIFE_REMARK_STAGE_CLASS,
  resolveCastSlotCount,
  resolveModeSwitchSkillSlug,
} from "./director-dock-config";

test("getDirectorHeroCopy returns left/right images and center video for all 8 feature creation studios", () => {
  const kinds = [
    "simple",
    "explainer",
    "talking-head",
    "story",
    "scroswap",
    "teleport",
    "posts",
    "life",
  ] as const;
  for (const kind of kinds) {
    const copy = getDirectorHeroCopy(kind, "zh-Hant");
    assert.equal(copy.cards.length, 3);
    assert.ok(copy.headline.length > 0);
    const [leftCard, centerCard, rightCard] = copy.cards;
    assert.equal(leftCard.imageUrl, `/hero/tools/${kind}/left.webp`);
    assert.equal(leftCard.videoUrl, undefined);
    assert.equal(centerCard.imageUrl, `/hero/tools/${kind}/center.webp`);
    assert.equal(centerCard.videoUrl, `/hero/tools/${kind}/center.mp4`);
    assert.equal(rightCard.imageUrl, `/hero/tools/${kind}/right.webp`);
    assert.equal(rightCard.videoUrl, undefined);

    assert.ok(
      fs.existsSync(path.join(process.cwd(), "public", leftCard.imageUrl)),
      `Missing left image for ${kind}`,
    );
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "public", centerCard.imageUrl)),
      `Missing center image for ${kind}`,
    );
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "public", centerCard.videoUrl!)),
      `Missing center video for ${kind}`,
    );
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "public", rightCard.imageUrl)),
      `Missing right image for ${kind}`,
    );
  }
});

test("DirectorDockHero renders center video and all 8 feature forms include DirectorDockHero", () => {
  const heroSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/presentation/components/app/director-dock/director-dock-hero.tsx",
    ),
    "utf8",
  );
  assert.match(heroSource, /centerCard\.videoUrl/);
  assert.match(heroSource, /<video\b/);

  const simpleSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/presentation/components/app/simple/simple-video-studio.tsx",
    ),
    "utf8",
  );
  assert.match(simpleSource, /<DirectorDockHero[\s\S]*?kind="simple"/);

  const lifeSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/presentation/components/app/life/life-desk.tsx",
    ),
    "utf8",
  );
  assert.match(lifeSource, /<DirectorDockHero[\s\S]*?kind="life"/);
});

test("cycleOption wraps forward and backward safely", () => {
  const items = ["auto", "15s", "30s", "60s"] as const;
  assert.equal(cycleOption(items, "auto", 1), "15s");
  assert.equal(cycleOption(items, "auto", -1), "60s");
  assert.equal(cycleOption(items, "60s", 1), "auto");
});

test("buildCastSlotItems pads empty slots up to slotCount", () => {
  const chars = [
    { id: "c1", name: "Ada", previewUrl: "/a.png" },
    { id: "c2", name: "Ben", previewUrl: "/b.png" },
  ];
  const slots = buildCastSlotItems(["c2"], chars, 3);
  assert.equal(slots.length, 3);
  assert.equal(slots[0]?.character?.id, "c2");
  assert.equal(slots[1]?.character, null);
  assert.equal(slots[2]?.character, null);
});

test("resolveCastSlotCount returns 1 for life/scroswap and matches castNeed (min 1) for video studios", () => {
  assert.equal(resolveCastSlotCount("life", 0), 1);
  assert.equal(resolveCastSlotCount("scroswap", 0), 1);
  assert.equal(resolveCastSlotCount("explainer", 0), 1);
  assert.equal(resolveCastSlotCount("explainer", 1), 1);
  assert.equal(resolveCastSlotCount("explainer", 2), 2);
  assert.equal(resolveCastSlotCount("talking-head", 1), 1);
});

test("computeSkillSwitchState updates styleId and filters/fills characterIds against the new styleId and castNeed", () => {
  const characters = [
    { id: "wb-1", name: "Doodle Bob", styleId: "whiteboard", styleIds: ["whiteboard"], previewUrl: "/wb.png" },
    { id: "real-1", name: "Aera", styleId: "realistic", styleIds: ["realistic"], previewUrl: "/real1.png" },
    { id: "real-2", name: "Ken", styleId: "realistic", styleIds: ["realistic"], previewUrl: "/real2.png" },
  ];
  const next = computeSkillSwitchState({
    currentStyleId: "whiteboard",
    preferredStyleId: "realistic",
    nextCastNeed: 1,
    characters,
    currentCharacterIds: ["wb-1"],
  });
  assert.equal(next.styleId, "realistic");
  assert.deepEqual(next.characterIds, ["real-1"]);

  const optionalExplainerKept = computeSkillSwitchState({
    currentStyleId: "realistic",
    preferredStyleId: "realistic",
    nextCastNeed: 0,
    characters,
    currentCharacterIds: ["real-2"],
  });
  assert.equal(optionalExplainerKept.styleId, "realistic");
  assert.deepEqual(optionalExplainerKept.characterIds, ["real-2"]);

  const optionalExplainerSwitchedStyle = computeSkillSwitchState({
    currentStyleId: "whiteboard",
    preferredStyleId: "realistic",
    nextCastNeed: 0,
    characters,
    currentCharacterIds: ["wb-1"],
  });
  assert.equal(optionalExplainerSwitchedStyle.styleId, "realistic");
  assert.deepEqual(optionalExplainerSwitchedStyle.characterIds, ["real-1"]);

  const zeroCast = computeSkillSwitchState({
    currentStyleId: "realistic",
    preferredStyleId: "papercraft-diorama",
    nextCastNeed: 0,
    characters,
    currentCharacterIds: ["real-1"],
  });
  assert.equal(zeroCast.styleId, "papercraft-diorama");
  assert.deepEqual(zeroCast.characterIds, []);
});

test("resolveModeSwitchSkillSlug picks talking-head-director, story-short-director, and paper-cutout/explainer across all modes", () => {
  const skills = [
    { slug: "dialogue-qa-director", behaviorSlug: "dialogue-qa-director", isCustom: false },
    { slug: "paper-cutout-explainer-video-director", behaviorSlug: "paper-cutout-explainer-video-director", isCustom: false },
    { slug: "talking-head-director", behaviorSlug: "talking-head-director", isCustom: false },
    { slug: "story-short-director", behaviorSlug: "story-short-director", isCustom: false },
  ];
  assert.equal(resolveModeSwitchSkillSlug("talking-head", skills), "talking-head-director");
  assert.equal(resolveModeSwitchSkillSlug("story", skills), "story-short-director");
  assert.equal(
    resolveModeSwitchSkillSlug("story", [
      { slug: "one-take-director", behaviorSlug: "one-take-director", isCustom: false },
    ]),
    "one-take-director",
  );
  assert.equal(resolveModeSwitchSkillSlug("explainer", skills), "paper-cutout-explainer-video-director");
});

test("OpenCut dark mode preserves white scaling anchors and uses white selection border on clip assets", () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), "src/presentation/studio/tokens.css"),
    "utf8",
  );
  assert.match(css, /\[class\*="bg-white"\]:not\(\.opencut-direct-host \*\)/);

  const selectableItemSource = fs.readFileSync(
    path.join(process.cwd(), "src/opencut/selection/selectable-item.tsx"),
    "utf8",
  );
  assert.match(selectableItemSource, /ring-white/);
});

test("StudioNav renders tools in 2-column grid across create/remix/social sections and platform slogan is updated", async () => {
  const navSource = fs.readFileSync(
    path.join(process.cwd(), "src/presentation/studio/studio-nav.tsx"),
    "utf8",
  );
  assert.match(navSource, /grid-cols-2/);
  assert.match(navSource, /CREATE VIDEO/);
  assert.match(navSource, /REMIX VIDEO/);
  assert.match(navSource, /SOCIAL IMAGE/);

  const appShellSource = fs.readFileSync(
    path.join(process.cwd(), "src/presentation/components/app-shell.tsx"),
    "utf8",
  );
  assert.match(appShellSource, /section:\s*"remix"/);
  assert.match(appShellSource, /section:\s*"social"/);

  const { en } = await import("@/util/i18n/messages/en");
  const { zhHant } = await import("@/util/i18n/messages/zh-Hant");
  assert.equal(
    en.landing.hero.title,
    "Build Your AI Creator IP, Then Put Them Everywhere.",
  );
  assert.equal(
    zhHant.landing.hero.title,
    "Build Your AI Creator IP, Then Put Them Everywhere.",
  );
});

test("LIFE_REMARK_STAGE_CLASS includes w-fit and tokens.css preserves rounded-full on director-dock-cell pills", () => {
  assert.ok(LIFE_REMARK_STAGE_CLASS.split(/\s+/).includes("w-fit"));
  const css = fs.readFileSync(
    path.join(process.cwd(), "src/presentation/studio/tokens.css"),
    "utf8",
  );
  assert.match(css, /\.director-dock-cell:not\(\[class\*="rounded-full"\]\)/);
});

test("isFullBleedStudioPath matches all 5 Director Dock studios, video editor routes, and fitting room", () => {
  assert.equal(isFullBleedStudioPath("/app/explainers"), true);
  assert.equal(isFullBleedStudioPath("/app/talking-heads"), true);
  assert.equal(isFullBleedStudioPath("/app/videos/new"), true);
  assert.equal(isFullBleedStudioPath("/app/projects/abc/videos/new"), true);
  assert.equal(isFullBleedStudioPath("/app/life"), true);
  assert.equal(isFullBleedStudioPath("/app/scroswap"), true);
  assert.equal(isFullBleedStudioPath("/app/teleport"), true);
  assert.equal(isFullBleedStudioPath("/app/simple"), true);
  assert.equal(isFullBleedStudioPath("/app/room"), true);
  assert.equal(isFullBleedStudioPath("/app/characters"), false);
  assert.equal(isFullBleedStudioPath("/app/billing"), false);
});

test("getAspectRatioIconSizeClass returns portrait, landscape, and square icon dimensions for aspect ratio pills", () => {
  assert.equal(getAspectRatioIconSizeClass("9:16"), "h-3 w-2");
  assert.equal(getAspectRatioIconSizeClass("2:3"), "h-3 w-2");
  assert.equal(getAspectRatioIconSizeClass("16:9"), "h-2 w-3");
  assert.equal(getAspectRatioIconSizeClass("1:1"), "h-2.5 w-2.5");
  assert.equal(getAspectRatioIconSizeClass(""), "h-3 w-2");
});



