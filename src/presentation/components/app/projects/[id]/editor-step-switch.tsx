import type { ProjectStatus } from "@/model/project";

export type EditorStepNav = {
  status: ProjectStatus;
  failedAtStep?: number;
  viewing: number;
  /** Phase A has storyboard clips — unlocks the Video step. */
  phaseAReady: boolean;
  onSelectStep: (step: number) => void;
  // Header 重新開始: reopen the brief form and wipe everything on submit.
  canRestart: boolean;
  onRestart: () => void;
};
