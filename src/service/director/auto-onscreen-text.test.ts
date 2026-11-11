import test from "node:test";
import assert from "node:assert/strict";
import {
  explainerClipHasVideo,
  groupSpokenSubtitleSentences,
  nextUndrawnOnScreenTargets,
  resolveExplainerAutoOnScreenTextTargets,
  resolveOnScreenDrawBase,
  sentenceTimeWindows,
} from "@/service/director/auto-onscreen-text";
import type { OnscreenTextItem, Project } from "@/model/project";

const CLIP_1_CUES = [
  "Ninety percent of people do not realize",
  "they are sitting on monetizable knowledge.",
  "Your daily experience is valuable.",
];

test("groupSpokenSubtitleSentences joins cues into the spoken sentences", () => {
  const sentences = groupSpokenSubtitleSentences(CLIP_1_CUES);
  assert.deepEqual(sentences, [
    "Ninety percent of people do not realize they are sitting on monetizable knowledge.",
    "Your daily experience is valuable.",
  ]);
});

test("resolveExplainerAutoOnScreenTextTargets paints Clip 1's spoken sentences when coverage is hook", () => {
  const project = {
    skillSlug: "paper-cutout-explainer-video-director",
    onScreenTextStyleId: "clean",
    onScreenTextCoverage: "hook",
    phaseA: {
      localizedTitle: "Turn Your Knowledge Into Income",
      clips: [
        {
          clipNumber: 1,
          durationSeconds: 6,
          startScene: "A kraft card labeled 「HIDDEN ASSET」",
          startVo: "Ninety percent of people do not realize they are sitting on monetizable knowledge.",
          subtitleCues: CLIP_1_CUES,
        },
        {
          clipNumber: 2,
          durationSeconds: 6,
          startVo: "Take your daily experience and turn it into an offer.",
        },
      ],
    },
    clips: [
      { clipNumber: 1, durationSeconds: 6, status: "completed" },
      { clipNumber: 2, durationSeconds: 6, status: "completed" },
    ],
  } as unknown as Project;

  const targets = resolveExplainerAutoOnScreenTextTargets(project);
  assert.equal(targets.length, 2);
  assert.equal(targets[0].clipIndex, 0);
  assert.equal(
    targets[0].text,
    "90% of people do not realize they are sitting on monetizable knowledge.",
  );
  assert.equal(targets[1].clipIndex, 0);
  assert.equal(targets[1].text, "Your daily experience is valuable.");
  assert.equal(targets[0].sectionStart, 0);
  assert.equal(targets[1].sectionStart, targets[0].sectionLength);
  assert.equal(
    Math.round((targets[0].sectionLength + targets[1].sectionLength) * 10) / 10,
    6,
  );
  assert.ok(targets[0].sectionLength > targets[1].sectionLength);
});

test("resolveExplainerAutoOnScreenTextTargets uses each clip's spoken line when coverage is all", () => {
  const project = {
    skillSlug: "explainer",
    onScreenTextStyleId: "neon",
    onScreenTextCoverage: "all",
    phaseA: {
      localizedTitle: "AI 革命",
      clips: [
        { clipNumber: 1, durationSeconds: 5, startScene: "「AI 改變一切」", startVo: "AI 已經改變工作方式" },
        { clipNumber: 2, durationSeconds: 6, startScene: "「自動化工具」", startVo: "自動化工具幫你省時間。" },
      ],
    },
    clips: [
      { clipNumber: 1, durationSeconds: 5 },
      { clipNumber: 2, durationSeconds: 6 },
    ],
  } as unknown as Project;

  const targets = resolveExplainerAutoOnScreenTextTargets(project);
  assert.deepEqual(
    targets.map((target) => target.text),
    ["AI 已經改變工作方式", "自動化工具幫你省時間。"],
  );
  assert.equal(targets[1].clipIndex, 1);
  assert.equal(targets[1].playheadSeconds, 5);
});

test("resolveExplainerAutoOnScreenTextTargets falls back to the scene quote when the clip has no spoken line", () => {
  const project = {
    skillSlug: "explainer",
    onScreenTextStyleId: "clean",
    onScreenTextCoverage: "hook",
    phaseA: {
      localizedTitle: "香港買樓 3 大陷阱",
      clips: [{ clipNumber: 1, durationSeconds: 5, startScene: "Hook: 「買樓避坑」" }],
    },
    clips: [{ clipNumber: 1, durationSeconds: 5 }],
  } as unknown as Project;

  const targets = resolveExplainerAutoOnScreenTextTargets(project);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].text, "買樓避坑");
});

test("resolveExplainerAutoOnScreenTextTargets returns empty when not explainer or style not set", () => {
  const noStyle = {
    skillSlug: "explainer",
    phaseA: { localizedTitle: "Title" },
  } as unknown as Project;
  assert.equal(resolveExplainerAutoOnScreenTextTargets(noStyle).length, 0);

  const talkingHead = {
    skillSlug: "talking-head",
    onScreenTextStyleId: "clean",
    phaseA: { localizedTitle: "Title" },
  } as unknown as Project;
  assert.equal(resolveExplainerAutoOnScreenTextTargets(talkingHead).length, 0);
});

test("sentenceTimeWindows keeps each sentence at least 2.5s when the clip can hold them", () => {
  const windows = sentenceTimeWindows(
    [
      "Ninety percent of people do not realize they are sitting on monetizable knowledge.",
      "Your daily experience is valuable.",
    ],
    6,
  );
  assert.ok(windows[0].length >= 2.5);
  assert.ok(windows[1].length >= 2.5);
  assert.equal(windows[0].start, 0);
  assert.equal(windows[1].start, windows[0].length);
});

test("explainerClipHasVideo waits until the clip file is completed", () => {
  const clips = [
    { clipNumber: 1, status: "in_progress", blobUrl: "https://blob/clip-1.mp4" },
    { clipNumber: 2, status: "completed", outputUrl: "https://blob/clip-2.mp4" },
    { clipNumber: 3, status: "completed" },
  ] as Project["clips"];
  assert.equal(explainerClipHasVideo(clips, 0), false);
  assert.equal(explainerClipHasVideo(clips, 1), true);
  assert.equal(explainerClipHasVideo(clips, 2), false);
});

test("nextUndrawnOnScreenTargets draws the first sentence, then the second, and skips a legacy paint", () => {
  const targets = [
    {
      clipIndex: 0,
      text: "Ninety percent of people do not realize they are sitting on monetizable knowledge.",
      playheadSeconds: 0,
      sectionStart: 0,
      sectionLength: 3.5,
    },
    {
      clipIndex: 0,
      text: "Your daily experience is valuable.",
      playheadSeconds: 3.5,
      sectionStart: 3.5,
      sectionLength: 2.5,
    },
  ];
  const clips = [
    { clipNumber: 1, status: "completed", blobUrl: "https://blob/raw.mp4" },
  ] as Project["clips"];

  const first = nextUndrawnOnScreenTargets({ targets, clips, items: [] });
  assert.equal(first.length, 1);
  assert.equal(first[0].text, targets[0].text);

  const afterFirst = nextUndrawnOnScreenTargets({
    targets,
    clips: [{ clipNumber: 1, status: "completed", blobUrl: "https://blob/sentence-1.mp4" }] as Project["clips"],
    items: [
      {
        id: "s1",
        text: targets[0].text,
        textStyleId: "clean",
        status: "completed",
        clipIndex: 0,
        baseVideoUrl: "https://blob/raw.mp4",
        inpaintedVideoUrl: "https://blob/sentence-1.mp4",
      },
    ] as OnscreenTextItem[],
  });
  assert.equal(afterFirst.length, 1);
  assert.equal(afterFirst[0].text, targets[1].text);

  const whilePainting = nextUndrawnOnScreenTargets({
    targets,
    clips,
    items: [
      {
        id: "s1",
        text: targets[0].text,
        textStyleId: "clean",
        status: "in_progress",
        clipIndex: 0,
        baseVideoUrl: "https://blob/raw.mp4",
      },
    ] as OnscreenTextItem[],
  });
  assert.equal(whilePainting.length, 0);

  assert.deepEqual(
    resolveOnScreenDrawBase(
      "https://blob/old-paint.mp4",
      [
        {
          id: "old",
          text: "Ninety percent of people don't realize…",
          textStyleId: "clean",
          status: "completed",
          clipIndex: 0,
          inpaintedVideoUrl: "https://blob/old-paint.mp4",
        },
      ] as OnscreenTextItem[],
      0,
    ),
    { baseVideoUrl: "https://blob/old-paint.mp4", legacy: true },
  );
  const legacy = nextUndrawnOnScreenTargets({
    targets,
    clips: [{ clipNumber: 1, status: "completed", blobUrl: "https://blob/old-paint.mp4" }] as Project["clips"],
    items: [
      {
        id: "old",
        text: "Ninety percent of people don't realize…",
        textStyleId: "clean",
        status: "completed",
        clipIndex: 0,
        inpaintedVideoUrl: "https://blob/old-paint.mp4",
      },
    ] as OnscreenTextItem[],
  });
  assert.equal(legacy.length, 0);

  const regenerated = nextUndrawnOnScreenTargets({
    targets,
    clips,
    items: [
      {
        id: "old",
        text: "Ninety percent of people don't realize…",
        textStyleId: "clean",
        status: "completed",
        clipIndex: 0,
        inpaintedVideoUrl: "https://blob/old-paint.mp4",
      },
    ] as OnscreenTextItem[],
  });
  assert.equal(regenerated.length, 1);
  assert.equal(regenerated[0].text, targets[0].text);
});
