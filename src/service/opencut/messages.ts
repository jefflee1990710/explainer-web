import type { OpencutEditMedia } from "@/model/opencut-edit";
import type { AspectRatio, FramePosition, OnscreenTextItem } from "@/model/project";
import type { PublicVideo } from "@/presentation/serialize";
import type { ScroVideoUiStage } from "@/service/scro-video/view-model";
import type { SubtitleCatalog } from "@/service/video-edit/subtitle-catalog";

export type { ScroVideoUiStage };

/** Seed / Assets / Properties row for one storyboard clip. */
export type ScroVideoSeedClip = {
  clipNumber: number;
  durationSeconds: number;
  stage: ScroVideoUiStage;
  posterUrl?: string;
  /** Completed still the video ends on. Shown beside the start so it can be added on its own. */
  endPosterUrl?: string;
  /** Talking-head: the end is this later clip's start still, not an end of its own. */
  endFromClipNumber?: number;
  /** The still the video ends on is drawing. */
  endPending?: boolean;
  videoUrl?: string;
  name: string;
  timeRange?: string;
  englishVo?: string;
  subtitleCues?: string[];
  startVo?: string;
  endVo?: string;
  explainerScene?: string;
  motionCamera?: string;
  error?: string;
  /** Start still exists (for redraw / thumbs). */
  hasStartFrame?: boolean;
  /** End still exists when dual-beat / end required. */
  hasEndFrame?: boolean;
  dualBeat?: boolean;
  frameCost?: number;
  videoCost?: number;
  videoUnsent?: boolean;
  staleFrames?: boolean;
  staleVideo?: boolean;
  /** The clip video failed after its stills were ready, so the user can send it again. */
  retryVideo?: boolean;
  wait?: "queued" | "running";
};

export type ScroSeedMessage = {
  type: "scro-seed-videos";
  videoId: string;
  aspectRatio?: AspectRatio;
  clips: ScroVideoSeedClip[];
  /** Create or recreate: drop the main-track cut and place the storyboard. */
  replace?: boolean;
  /** Only auto-generate the subtitle track on seed for talking-head directors. */
  autoSubtitles?: boolean;
};

export type ScroClipUpdatedMessage = {
  type: "scro-clip-updated";
  videoId: string;
  clip: ScroVideoSeedClip;
};

export type ScroVideosStateMessage = {
  type: "scro-videos-state";
  videoId: string;
  clips: ScroVideoSeedClip[];
};

export type ScroOnscreenTextSeedItem = {
  id: string;
  text: string;
  textStyleId: string;
  styleName?: string;
  status: OnscreenTextItem["status"];
  url?: string;
  error?: string;
  submittedAt?: string;
};

export type ScroOnscreenTextsStateMessage = {
  type: "scro-onscreen-texts-state";
  videoId: string;
  items: ScroOnscreenTextSeedItem[];
};

export type ScroProjectUpdatedMessage = {
  type: "scro-project-updated";
  videoId: string;
  project: PublicVideo;
};

export type ScroRestoreMessage = {
  type: "scro-restore";
  videoId: string;
  aspectRatio?: AspectRatio;
  project: Record<string, unknown>;
  media: OpencutEditMedia[];
  updatedAt: string;
};

export type ScroSubtitleCatalogMessage = {
  type: "scro-subtitle-catalog";
  videoId: string;
  catalog: SubtitleCatalog;
};

export type ScroSubtitleGenerateResultMessage = {
  type: "scro-subtitle-generate-result";
  videoId: string;
  ok: boolean;
  plates: Array<{ clipNumber: number; url: string }>;
  error?: string;
};

export type ScroClipMenuStateMessage = {
  type: "scro-clip-menu-state";
  videoId: string;
  idle?: boolean;
  videosEnabled?: boolean;
};

export type ScroClearCheckedMessage = {
  type: "scro-clear-checked";
  videoId: string;
};

/** Editor → host: run a production action for one clip. */
export type ScroClipActionMessage = {
  type: "scro-clip-action";
  videoId: string;
  clipNumber: number;
  action: "generate-frames" | "generate-video" | "cancel-video";
};

/** Editor → host: open FrameEdit on the page shell. */
export type ScroOpenAiMessage = {
  type: "scro-open-ai";
  videoId: string;
  clipNumber: number;
  kind: "scene-chat" | "frame-edit";
  position?: FramePosition;
};

/** Editor → host: rewrite this clip from one instruction, without a chat transcript. */
export type ScroSceneEditMessage = {
  type: "scro-scene-edit";
  videoId: string;
  clipNumber: number;
  message: string;
  requestId: string;
};

export type ScroSceneEditResultMessage = {
  type: "scro-scene-edit-result";
  videoId: string;
  clipNumber: number;
  requestId: string;
  ok: boolean;
  error?: string;
};

/** Editor → host: Assets selection for bulk / delete chrome. */
export type ScroSelectionStateMessage = {
  type: "scro-selection-state";
  videoId: string;
  selectedClipNumber: number | null;
  checkedClipNumbers: number[];
};

export type ScroLoadProgressMessage = {
  type: "scro-load-progress";
  videoId: string;
  current?: number;
  total?: number;
  label?: string;
  done?: boolean;
};

export type ScroSaveUpload = {
  id: string;
  name: string;
  type: OpencutEditMedia["type"];
  width?: number;
  height?: number;
  duration?: number;
  blob: Blob;
};

export type ScroProjectSaveMessage = {
  type: "scro-project-save";
  videoId: string;
  project: unknown;
  media?: OpencutEditMedia[];
  uploads?: ScroSaveUpload[];
};

export type ScroEditorReadyMessage = {
  type: "scro-editor-ready";
};

export type ScroSubtitleRequestMessage = {
  type: "scro-subtitle-request";
  videoId?: string;
};

export type ScroSubtitleGenerateMessage = {
  type: "scro-subtitle-generate";
  videoId: string;
  textStyleId: string;
  clipNumbers: number[];
};

export type ScroSeedDoneMessage = {
  type: "scro-seed-done";
  videoId: string;
};

export type ScroRestoreDoneMessage = {
  type: "scro-restore-done";
  sourceUrls?: string[];
};

/** Discriminated union of messages sent from Host Desk → OpenCut Editor. */
export type HostToEditorMessage =
  | ScroSeedMessage
  | ScroClipUpdatedMessage
  | ScroVideosStateMessage
  | ScroOnscreenTextsStateMessage
  | ScroRestoreMessage
  | ScroSubtitleCatalogMessage
  | ScroSubtitleGenerateResultMessage
  | ScroClipMenuStateMessage
  | ScroClearCheckedMessage
  | ScroSceneEditResultMessage;

/** Discriminated union of messages sent from OpenCut Editor → Host Desk. */
export type EditorToHostMessage =
  | ScroEditorReadyMessage
  | ScroSubtitleRequestMessage
  | ScroSubtitleGenerateMessage
  | ScroClipActionMessage
  | ScroSceneEditMessage
  | ScroOpenAiMessage
  | ScroSelectionStateMessage
  | ScroLoadProgressMessage
  | ScroSeedDoneMessage
  | ScroRestoreDoneMessage
  | ScroProjectSaveMessage
  | ScroProjectUpdatedMessage;

/** Type guard for incoming messages from OpenCut editor. */
export function isEditorToHostMessage(payload: unknown): payload is EditorToHostMessage {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "type" in payload &&
    typeof (payload as { type: unknown }).type === "string"
  );
}
