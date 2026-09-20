import type {
  PhaseAEditInput,
  PhaseAProposal,
  StoryboardRow,
  VoLanguage,
} from "@/types/project";

export const MAX_PHASE_A_FIELD_LENGTH = 1200;
export const MAX_PHASE_A_TITLE_LENGTH = 160;

export function cleanPhaseAField(value: unknown, max = MAX_PHASE_A_FIELD_LENGTH) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function spokenUnits(text: string, language?: VoLanguage) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  if (language === "zh" || language === "yue") {
    return trimmed.replace(/\s+/g, "").length;
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export type PhaseAEditResult =
  | { ok: true; phaseA: PhaseAProposal }
  | { ok: false; error: string };

function clipEditOf(row: StoryboardRow) {
  return {
    clipNumber: row.clipNumber,
    explainerScene: row.explainerScene,
    motionCamera: row.motionCamera,
    englishVo: row.englishVo,
  };
}

export function phaseAToEditInput(phaseA: PhaseAProposal): PhaseAEditInput {
  return {
    localizedTitle: phaseA.localizedTitle,
    englishTitle: phaseA.englishTitle,
    coreMessage: phaseA.coreMessage,
    hookStrategy: phaseA.hookStrategy,
    narrator: phaseA.narrator,
    visualWorld: phaseA.visualWorld,
    clips: phaseA.clips.map(clipEditOf),
  };
}

export function phaseAEditsEqual(left: PhaseAEditInput, right: PhaseAEditInput) {
  return JSON.stringify(left) === JSON.stringify(right);
}

// Merge user edits onto the current proposal. Clip count / timing stay locked.
export function applyPhaseAEdits(
  current: PhaseAProposal,
  input: PhaseAEditInput,
  language?: VoLanguage,
): PhaseAEditResult {
  const localizedTitle = cleanPhaseAField(input.localizedTitle, MAX_PHASE_A_TITLE_LENGTH);
  const englishTitle = cleanPhaseAField(input.englishTitle, MAX_PHASE_A_TITLE_LENGTH);
  const coreMessage = cleanPhaseAField(input.coreMessage);
  const hookStrategy = cleanPhaseAField(input.hookStrategy);
  const narrator = cleanPhaseAField(input.narrator);
  const visualWorld = cleanPhaseAField(input.visualWorld);

  if (!localizedTitle) return { ok: false, error: "標題不能空白" };
  if (!englishTitle) return { ok: false, error: "英文標題不能空白" };
  if (!coreMessage) return { ok: false, error: "核心訊息不能空白" };
  if (!hookStrategy) return { ok: false, error: "開場鉤子不能空白" };
  if (!narrator) return { ok: false, error: "旁白角色不能空白" };
  if (!visualWorld) return { ok: false, error: "視覺世界不能空白" };

  if (!Array.isArray(input.clips) || input.clips.length !== current.clips.length) {
    return { ok: false, error: "分鏡段數不能增減" };
  }

  const byNumber = new Map(input.clips.map((clip) => [clip.clipNumber, clip]));
  const clips: StoryboardRow[] = [];
  const editedAt = new Date().toISOString();
  for (const row of current.clips) {
    const edit = byNumber.get(row.clipNumber);
    if (!edit) return { ok: false, error: `找不到 clip #${row.clipNumber}` };
    const explainerScene = cleanPhaseAField(edit.explainerScene);
    const motionCamera = cleanPhaseAField(edit.motionCamera);
    const englishVo = cleanPhaseAField(edit.englishVo);
    if (!explainerScene) return { ok: false, error: `Clip #${row.clipNumber} 的畫面描述不能空白` };
    if (!englishVo) return { ok: false, error: `Clip #${row.clipNumber} 的旁白不能空白` };
    const clipChanged =
      explainerScene !== row.explainerScene ||
      motionCamera !== row.motionCamera ||
      englishVo !== row.englishVo;
    clips.push({
      ...row,
      explainerScene,
      motionCamera,
      englishVo,
      // Stamp so production treats existing frames/videos as stale.
      ...(clipChanged ? { editedAt } : {}),
    });
  }

  const englishWordCount = Math.max(
    1,
    clips.reduce((sum, clip) => sum + spokenUnits(clip.englishVo, language), 0),
  );

  return {
    ok: true,
    phaseA: {
      ...current,
      localizedTitle,
      englishTitle,
      coreMessage,
      hookStrategy,
      narrator,
      visualWorld,
      clips,
      englishWordCount,
    },
  };
}

// After a clips-only regenerate, keep the user's proposal fields and take new rows.
export function keepProposalRegenerateClips(
  current: PhaseAProposal,
  generated: PhaseAProposal,
): PhaseAProposal {
  return {
    ...generated,
    localizedTitle: current.localizedTitle,
    englishTitle: current.englishTitle,
    coreMessage: current.coreMessage,
    hookStrategy: current.hookStrategy,
    narrator: current.narrator,
    visualWorld: current.visualWorld,
    characterLock: current.characterLock,
    palette: current.palette,
    aspectRatio: current.aspectRatio,
    loopMode: "linear",
    targetDuration: current.targetDuration,
  };
}
