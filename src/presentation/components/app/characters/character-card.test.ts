import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { characterCardCheckboxClass } from "@/presentation/components/app/characters/character-card";
import {
  defaultSheetForStyle,
  foundationStyleForPublicCharacter,
  historyVersionsForCharacterStyle,
  presetsForCharacterStyle,
  toggleCharacterDialogSelection,
} from "@/presentation/components/app/projects/[id]/character-select-dialog";
import type { PublicCharacter } from "@/presentation/serialize";

test("characterCardCheckboxClass uses dark ink fill with lime checkmark when selected and white empty box when unselected", () => {
  const checked = characterCardCheckboxClass({ selected: true, showCheckbox: true });
  const unchecked = characterCardCheckboxClass({ selected: false, showCheckbox: true });

  assert.match(checked, /(?:^|\s)bg-\[#12141c\](?:\s|$)/);
  assert.match(checked, /(?:^|\s)text-\[#c6f24b\](?:\s|$)/);
  assert.doesNotMatch(checked, /bg-\[var\(--studio-ink\)\]/);

  assert.match(unchecked, /(?:^|\s)bg-white\/95(?:\s|$)/);
  assert.doesNotMatch(unchecked, /bg-\[#12141c\]/);
});

test("tokens.css dark-mode bg-white button rule excludes role=checkbox so unselected checkboxes do not invert", () => {
  const css = readFileSync(
    path.join(process.cwd(), "src/presentation/studio/tokens.css"),
    "utf8",
  );
  assert.match(
    css,
    /\.studio-app:not\(\[data-studio-theme="light"\]\)\s+:is\(button,\s*a\)\[class\*="bg-white"\][^{]*:not\(\[role="checkbox"\]\)/,
  );
});

test("defaultSheetForStyle, presetsForCharacterStyle, and historyVersionsForCharacterStyle always use realistic foundation regardless of video styleId and skip unapplied base candidates", () => {
  const char: PublicCharacter = {
    id: "c1",
    name: "Aria",
    styleId: "realistic",
    persona: null,
    styleIds: ["realistic", "doodle"],
    styleName: "realistic",
    voiceMode: "lock",
    voice: null,
    voiceSample: null,
    defaultVersionId: "v1",
    baseVersionId: "v1",
    defaultByStyle: { realistic: "v1", doodle: "v_doodle" },
    previewUrl: "https://blob/v1-board.png",
    previewIsProfile: false,
    profilePending: false,
    versions: [
      {
        id: "v_cand",
        styleId: "realistic",
        number: 2,
        isBaseCandidate: true,
        prompt: "candidate",
        blueprintKind: "board",
        blueprintUrl: "https://blob/cand-board.png",
        status: "completed",
        createdAt: "2026-11-07T02:00:00Z",
      },
      {
        id: "v_doodle",
        styleId: "doodle",
        number: 1,
        prompt: "doodle",
        blueprintKind: "board",
        blueprintUrl: "https://blob/doodle-board.png",
        status: "completed",
        createdAt: "2026-11-07T01:30:00Z",
      },
      {
        id: "v1",
        styleId: "realistic",
        number: 1,
        prompt: "realistic base",
        blueprintKind: "board",
        blueprintUrl: "https://blob/v1-board.png",
        status: "completed",
        createdAt: "2026-11-07T01:00:00Z",
      },
    ],
    presets: [
      {
        id: "p1",
        name: "Casual Tee",
        versionId: "v1",
        styleId: "realistic",
        versionNumber: 1,
        blueprintUrl: "https://blob/v1-board.png",
        createdAt: "2026-11-07T01:05:00Z",
      },
    ],
    pending: false,
    failed: false,
    createdAt: "2026-11-07T01:00:00Z",
    updatedAt: "2026-11-07T01:05:00Z",
  };

  assert.equal(foundationStyleForPublicCharacter(char), "realistic");
  // Even when video style is "2d-anime" or "doodle", UI pickers always select the realistic foundation
  assert.equal(defaultSheetForStyle(char, "2d-anime")?.id, "v1");
  assert.equal(defaultSheetForStyle(char, "doodle")?.id, "v1");
  assert.equal(presetsForCharacterStyle(char, "2d-anime").length, 1);
  assert.equal(presetsForCharacterStyle(char, "2d-anime")[0]?.id, "p1");
  const history = historyVersionsForCharacterStyle(char, "2d-anime");
  assert.deepEqual(
    history.map((v) => v.id),
    ["v1"],
  );
});

test("CharacterSelectDialog does not render AddCharacterStyleDialog or manual + Generate Style buttons", () => {
  const dialogSrc = readFileSync(
    path.join(
      process.cwd(),
      "src/presentation/components/app/projects/[id]/character-select-dialog.tsx",
    ),
    "utf8",
  );
  assert.doesNotMatch(dialogSrc, /AddCharacterStyleDialog/);
  assert.doesNotMatch(dialogSrc, /handleQuickAddCurrentStyle/);
});

test("toggleCharacterDialogSelection unselects an already-selected character when clicked again in both single and multi-select modes", () => {
  // 1. Clicking an unselected character in single-select mode selects it
  const step1 = toggleCharacterDialogSelection({
    value: [],
    selections: {},
    characterId: "c1",
    option: { versionId: "v1" },
    max: 1,
    isStripClick: true,
  });
  assert.deepEqual(step1.value, ["c1"]);
  assert.deepEqual(step1.selections, { c1: { versionId: "v1" } });

  // 2. Clicking the same selected character again in the strip unselects it
  const step2 = toggleCharacterDialogSelection({
    value: step1.value,
    selections: step1.selections,
    characterId: "c1",
    option: { versionId: "v1" },
    max: 1,
    isStripClick: true,
  });
  assert.deepEqual(step2.value, []);
  assert.deepEqual(step2.selections, {});

  // 3. Clicking a different preset on an already-selected character switches preset without unselecting
  const step3 = toggleCharacterDialogSelection({
    value: ["c1"],
    selections: { c1: { versionId: "v1" } },
    characterId: "c1",
    option: { versionId: "v2", presetId: "p2", presetName: "Suit" },
    max: 1,
    isStripClick: false,
  });
  assert.deepEqual(step3.value, ["c1"]);
  assert.deepEqual(step3.selections, {
    c1: { versionId: "v2", presetId: "p2", presetName: "Suit" },
  });

  // 4. Clicking the exact same active preset card again unselects the character
  const step4 = toggleCharacterDialogSelection({
    value: step3.value,
    selections: step3.selections,
    characterId: "c1",
    option: { versionId: "v2", presetId: "p2", presetName: "Suit" },
    max: 1,
    isStripClick: false,
  });
  assert.deepEqual(step4.value, []);
  assert.deepEqual(step4.selections, {});

  // 5. Multi-select mode: clicking an already-selected character in the strip removes only that character
  const multi = toggleCharacterDialogSelection({
    value: ["c1", "c2"],
    selections: { c1: { versionId: "v1" }, c2: { versionId: "v2" } },
    characterId: "c1",
    option: { versionId: "v1" },
    max: 3,
    isStripClick: true,
  });
  assert.deepEqual(multi.value, ["c2"]);
  assert.deepEqual(multi.selections, { c2: { versionId: "v2" } });
});


