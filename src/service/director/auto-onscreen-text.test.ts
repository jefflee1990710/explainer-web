import test from "node:test";
import assert from "node:assert/strict";
import { resolveExplainerAutoOnScreenTextTargets } from "@/service/director/auto-onscreen-text";
import type { Project } from "@/model/project";

test("resolveExplainerAutoOnScreenTextTargets returns only Clip 1 when coverage is 'hook'", () => {
  const project = {
    skillSlug: "explainer",
    onScreenTextStyleId: "clean",
    onScreenTextCoverage: "hook",
    phaseA: {
      localizedTitle: "香港買樓 3 大陷阱",
      storyboard: [
        { clipNumber: 1, startScene: "Hook: 「買樓避坑」", startVo: "買樓千祈咪踩呢個陷阱" },
        { clipNumber: 2, startScene: "Point 1", startVo: "第一點係印花稅" },
      ],
    },
    clips: [
      { clipNumber: 1, durationSeconds: 5 },
      { clipNumber: 2, durationSeconds: 6 },
    ],
  } as unknown as Project;

  const targets = resolveExplainerAutoOnScreenTextTargets(project);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].clipIndex, 0);
  assert.equal(targets[0].text, "買樓避坑");
  assert.equal(targets[0].playheadSeconds, 0);
});

test("resolveExplainerAutoOnScreenTextTargets returns all clips when coverage is 'all'", () => {
  const project = {
    skillSlug: "explainer",
    onScreenTextStyleId: "neon",
    onScreenTextCoverage: "all",
    phaseA: {
      localizedTitle: "AI 革命",
      storyboard: [
        { clipNumber: 1, startScene: "「AI 改變一切」", startVo: "AI 已經改變工作方式" },
        { clipNumber: 2, startScene: "「自動化工具」", startVo: "自動化工具幫你省時間" },
      ],
    },
    clips: [
      { clipNumber: 1, durationSeconds: 5 },
      { clipNumber: 2, durationSeconds: 6 },
    ],
  } as unknown as Project;

  const targets = resolveExplainerAutoOnScreenTextTargets(project);
  assert.equal(targets.length, 2);
  assert.equal(targets[0].text, "AI 改變一切");
  assert.equal(targets[1].text, "自動化工具");
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
