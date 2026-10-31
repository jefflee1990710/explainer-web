import type { ObjectId } from "mongodb";
import { z } from "zod";
import { castMemberSchema, type CastMember } from "@/model/character";
import { productShotSchema, type ProductShot } from "@/model/product";
import { objectIdSchema } from "@/model/primitives";
import { SUBTITLE_LOOK_IDS, type SubtitleLook } from "@/model/subtitle-look-id";
import { videoEditSchema, type VideoEdit } from "@/model/video-edit";

export { SUBTITLE_LOOK_IDS, type SubtitleLook };

export type AspectRatio = "16:9" | "9:16" | "1:1";
// Cover stills can be inset so a platform crop still shows the whole picture.
export const COVER_SAFE_AREA_IDS = ["ig-reel", "tiktok", "youtube-shorts"] as const;
export type CoverSafeArea = (typeof COVER_SAFE_AREA_IDS)[number];
// auto: Phase A picks length and clip count. The others are fixed clip budgets.
export const DURATION_PRESET_IDS = ["auto", "micro", "short", "punchy", "full"] as const;
export type DurationPreset = (typeof DURATION_PRESET_IDS)[number];
export type LoopMode = "linear" | "infinite";
// Voiceover language supported across video creation and character demo voices.
export const VO_LANGUAGE_IDS = [
  "en",
  "yue",
  "zh",
  "ja",
  "ko",
  "id",
  "es",
  "pt",
  "fr",
  "de",
  "ru",
  "vi",
  "th",
  "ms",
  "fil",
  "hi",
  "ar",
  "it",
  "nl",
  "pl",
  "tr",
] as const;
export type VoLanguage = (typeof VO_LANGUAGE_IDS)[number];
// Narrator / spoken-voice gender chosen on the input step.
export type VoiceGender = "male" | "female";
// How fast the narrator / characters speak; scales the spoken-word budget.
export type SpeechPace = "slow" | "medium" | "fast";
// On-canvas labels in storyboard stills; independent of voiceover language.
export type SceneTextLanguage = "en" | "zh-Hant" | "zh-Hans";
// "none" is a brief choice, not a script. It turns on-screen text off.
export type SceneTextChoice = SceneTextLanguage | "none";
// Subtitle lettering. Placement is chosen by the director, not this field.

// Lifecycle: phase_a → production → ready.
// `awaiting_approval` remains for leftover videos; the UI treats it as production.
// Every clip's frames and video are made independently. Frame/video failures
// live on the clip, so `failed` only ever means Phase A failed.
export type ProjectStatus =
  | "draft"
  | "phase_a"
  | "awaiting_approval"
  | "production"
  | "ready"
  | "failed";

// Written by the pre per-clip pipeline; still present in Mongo. Normalised to
// `production` by normalizeProjectStatus() on every read.
export type LegacyProjectStatus =
  | "frames_generating"
  | "frames_ready"
  | "approved"
  | "generating";

export type FramePosition = "start" | "end";

// Director's revision for a frame redo: free-text remark and/or the previous
// image with hand-drawn markings baked in (uploaded to Blob).
export type FrameRevision = {
  remark?: string;
  annotatedUrl?: string;
};

// What the edit dialog sends when asking for a redo: the remark plus the
// transparent sketch layer (PNG data URL) drawn over the current frame.
export type FrameRevisionInput = {
  remark?: string;
  sketchDataUrl?: string;
};

// One storyboard still (start or end frame) for a clip; FRAME_COST credits each.
export type ClipFrame = {
  clipNumber: number;
  position: FramePosition;
  prompt: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  outputUrl?: string;
  blobUrl?: string;
  error?: string;
  // Revision used for the most recent redo (kept so the dialog can show it).
  revision?: FrameRevision;
  // ISO time the current job was submitted; compared with the row's editedAt.
  submittedAt?: string;
  // The production chat rewrote this prompt. Later sends keep it instead of rebuilding.
  promptEdited?: boolean;
  // Clean still with the subtitle plate burned on. Video generation sends this file.
  mergedUrl?: string;
  // Scene and plate URLs this merge was built from. A new file rebuilds it.
  mergedSceneUrl?: string;
  mergedPlateUrl?: string;
  // ISO time of the merge. Newer than the clip means the video is stale.
  mergedAt?: string;
};

// User-supplied scene reference for the director. Max 4 per video, ids R1..R4.
export type ReferenceImage = {
  id: string;
  url: string;
  description: string;
};

// Optional pre-storyboard clip draft with hand-drawn layout sketch and text explanation.
export type StoryboardSketchElementType =
  | "person"
  | "rect"
  | "circle"
  | "arrow"
  | "line"
  | "text";

export type StoryboardSketchElement = {
  type: StoryboardSketchElementType;
  // Normalized coordinates (0..100) across the clip canvas.
  x: number;
  y: number;
  width?: number;
  height?: number;
  x2?: number;
  y2?: number;
  label?: string;
  color?: string;
};

export type StoryboardClipDraft = {
  clipNumber: number;
  explanation: string;
  voDraft?: string;
  sketchUrl?: string;
  sketchElements?: StoryboardSketchElement[];
};

export type StoryboardRow = {
  clipNumber: number;
  timeRange: string;
  durationSeconds: number;
  narrativeJob: string;
  explainerScene: string;
  motionCamera: string;
  englishVo: string;
  // 白板概念解說 dual-beat: dedicated stills + two spoken lines.
  startScene?: string;
  endScene?: string;
  startVo?: string;
  endVo?: string;
  // Legacy; no longer shown or required. Older videos may still have it.
  referenceTranslation?: string;
  bgmSfx: string;
  // Reference images (R1..R4) the director assigned to this clip's stills.
  referenceImageIds?: string[];
  // Per-clip visual style override for multi-style directors (e.g., style-switch-director).
  styleId?: string;
  // Director's choice: attach this clip's start still when drawing the end.
  // Absent on older videos and after a user edits the camera text.
  endUsesStartStill?: boolean;
  // Which empty-set background plate this clip uses (from backgroundPlates).
  backgroundSetId?: string;
  // ISO time the user last edited this row; newer than submittedAt ⇒ stale media.
  editedAt?: string;
  // Talking-head director native HeyGen Avatar IV motion_prompt and expressiveness ("low" | "medium" | "high").
  motionPrompt?: string;
  expressiveness?: "low" | "medium" | "high";
  // Director-planned semantic subtitle cues (shorter for 9:16 Reels so text renders bigger; longer for 16:9 landscape).
  subtitleCues?: string[];
};

// Prop tiles for the video-wide white-background object sheet.
export type ObjectSheetItem = {
  name: string;
  notes: string;
};

// One empty location plate. Clips share a setId when they are in the same place.
export type BackgroundPlate = {
  setId: string;
  name: string;
  notes: string;
  // Clips that open in this set. Used when rebuilding assignments after a rewrite.
  clipNumbers: number[];
  url?: string;
};

export type SceneChatField = "startScene" | "endScene" | "motionCamera" | "englishVo";

// One clip's fields rewritten by a production-chat turn.
export type SceneChatChange = {
  clipNumber: number;
  fields: SceneChatField[];
};

// One turn in the production-page chat. The thread belongs to one still.
export type SceneChatMessage = {
  role: "user" | "assistant";
  content: string;
  changedPaths?: SceneChatField[];
  // Every clip this turn rewrote. Default is the open clip; "all clips" fills the rest.
  changedClips?: SceneChatChange[];
  // This turn replaced the still's image prompt.
  promptChanged?: boolean;
  // Interface language of an opening summary, so a locale change can rewrite it.
  locale?: string;
  createdAt: Date;
};

export type SceneChatThread = {
  clipNumber: number;
  // Which still this thread edits. Missing on older clip-level chats.
  position?: FramePosition;
  messages: SceneChatMessage[];
};

// Storyboard fields the user may rewrite per clip while reviewing frames.
export type ClipStoryboardInput = Pick<
  StoryboardRow,
  "explainerScene" | "motionCamera" | "englishVo" | "startScene" | "endScene" | "startVo" | "endVo"
>;

// Phase A proposal fields the user can rewrite before approving frames.
export type PhaseAEditInput = {
  localizedTitle: string;
  englishTitle: string;
  coreMessage: string;
  hookStrategy: string;
  narrator: string;
  visualWorld: string;
  clips: Array<{ clipNumber: number } & ClipStoryboardInput>;
};

export type PhaseAProposal = {
  englishTitle: string;
  localizedTitle: string;
  targetDuration: string;
  clipCount: number;
  loopMode: LoopMode;
  coreMessage: string;
  hookStrategy: string;
  aspectRatio: AspectRatio;
  visualWorld: string;
  narrator: string;
  englishWordCount: number;
  characterLock: string;
  palette: string;
  bgmDirection: string;
  narrativeArc: string;
  clips: StoryboardRow[];
};

export type PhaseBPrompt = {
  clipNumber: number;
  durationSeconds: number;
  prompt: string;
};

export type PhaseBPackage = {
  globalContinuity: string;
  prompts: PhaseBPrompt[];
  stitchingGuide: string;
  voiceMusicNote: string;
};

export type ProjectClip = {
  clipNumber: number;
  durationSeconds: number;
  prompt: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  outputUrl?: string;
  blobUrl?: string;
  error?: string;
  // ISO time the video was requested (Phase B + submit happen in a job).
  submittedAt?: string;
  // Credits taken for the current attempt, so a refund returns the same amount.
  creditsCharged?: number;
  // True while the video job is still in our queue and has not been sent.
  unsent?: boolean;
  // True when this video was sent from stills that already had the subtitle burned in.
  mergedKeyframes?: boolean;
  // Pre-generated ElevenLabs TTS audio URL and speech onset used to time the video prompt.
  voUrl?: string;
  voOnsetSeconds?: number;
};

// One talking-head subtitle plate. Burned onto the start and end stills before video.
// Clips filmed from clean stills still burn this plate at export.
export type SubtitlePlate = {
  clipNumber: number;
  status: "queued" | "in_progress" | "completed" | "failed";
  outputUrl?: string;
  blobUrl?: string;
  error?: string;
  submittedAt?: string;
  creditsCharged?: number;
  // The spoken line this plate was drawn for; a later edit makes the plate stale.
  line?: string;
};

// One OpenCut AI on-screen text image asset (`ScroOnscreenText`) generated in the background queue.
export type OnscreenTextItem = {
  id: string;
  text: string;
  textStyleId: string;
  styleName?: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  outputUrl?: string;
  blobUrl?: string;
  error?: string;
  submittedAt?: string;
  creditsCharged?: number;
};

// AI-drawn text-only subtitle card in the video's lettering look, reused as a still reference.
// `key` covers the words and the look, so an edited line or a new text style draws a fresh card.
export type SubtitleLettering = {
  key: string;
  url: string;
};

// One queued "add clip" write. The dialog returns before the director finishes.
export type ClipAppendStatus = "queued" | "writing" | "failed";

export type ClipAppend = {
  id: string;
  content: string;
  // 1-based slot on the storyboard at enqueue time. Later inserts shift this.
  insertAt: number;
  status: ClipAppendStatus;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
};

// Concatenated reel of every storyboard clip, produced on the export step.
export type ReelStatus = "queued" | "in_progress" | "completed" | "failed";
// Social / reel thumbnail generated from the storyboard.
export type CoverStatus = "idle" | "generating" | "failed";

// One explainer job owned by a signed-in user.
export type Project = {
  _id: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  // Parent folder. Optional: videos can live without a project or inside a folder.
  projectId?: ObjectId;
  skillId: ObjectId;
  skillSlug: string;
  source: string;
  // Talking-head: words the character reads. Other skills omit this.
  spokenScript?: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  // Visual style. Missing or empty resolves to doodle; a user ObjectId names that user's style.
  styleId?: string;
  // Ordered visual styles when a multi-style director is selected (up to maxStyleCount).
  styleIds?: string[];
  // Optional for legacy documents; defaults to "en" when absent.
  language?: VoLanguage;
  // Optional for legacy documents; defaults to true when absent.
  narrationEnabled?: boolean;
  // Optional for legacy documents; defaults to male when absent.
  voiceGender?: VoiceGender;
  // Optional for legacy documents; defaults to medium when absent.
  speechPace?: SpeechPace;
  // Missing or false → no on-canvas labels. True + language → labels in that script.
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextChoice;
  // Missing rows use handwritten. Does not choose where the subtitle sits.
  subtitleLook?: SubtitleLook;
  // System look id, or a user text-style ObjectId. Missing rows use subtitleLook.
  textStyleId?: string;
  // Denormalized lettering sample. Present only for a custom text style.
  textStyleImageUrl?: string;
  // Talking-head cinematic: the still stays free of painted subtitles.
  subtitleOverlay?: boolean;
  // Per-clip subtitle plates for that overlay. Absent until a plate job is queued.
  subtitlePlates?: SubtitlePlate[];
  // OpenCut AI on-screen text image assets (`ScroOnscreenText`) queued from the editor.
  onscreenTexts?: OnscreenTextItem[];
  // Painted-subtitle stills: one lettering card per subtitle line and look.
  subtitleLetterings?: SubtitleLettering[];
  characterImageUrl?: string;
  // Opening / Ending bookends: brand logo used as a reference in every still.
  logoUrl?: string;
  // Scene references from the brief; the director assigns them per clip.
  referenceImages?: ReferenceImage[];
  // Optional user-sketched or AI-drafted clip breakdowns created in the brief wizard.
  clipDrafts?: StoryboardClipDraft[];
  // Talking-head / preset-background directors: up to 2 background reference photos.
  backgroundImageUrls?: string[];
  // Director preset background id (from `IDirector.presetBackgrounds`).
  directorBackgroundId?: string;
  // Talking-head only: preset background id from TALKING_HEAD_BACKGROUNDS.
  talkingHeadBackgroundId?: string;
  // Talking-head only: preset pose id from TALKING_HEAD_POSES.
  talkingHeadPoseId?: string;
  // Talking-head read + Cinematic realistic: one optional photo for the opening still.
  startImageUrl?: string;
  // Characters chosen at creation; snapshot of each default blueprint.
  cast?: CastMember[];
  // Real products. They are never restyled into the video's look.
  products?: ProductShot[];
  status: ProjectStatus | LegacyProjectStatus;
  phaseA?: PhaseAProposal;
  phaseB?: PhaseBPackage;
  characterStillUrl?: string;
  // Character still failed; the next frame request resubmits it.
  stillError?: string;
  // Director-invented props on a white sheet. Absent until planned; [] means none.
  objectSheetItems?: ObjectSheetItem[];
  objectSheetUrl?: string;
  objectSheetError?: string;
  // New path segment so a redraw does not reuse the previous lock URL.
  lockRevision?: string;
  // One empty-set plate per unique location. Absent until planned; [] means none.
  backgroundPlates?: BackgroundPlate[];
  backgroundPlateError?: string;
  // Storyboard frames generated after storyboard approval.
  frames?: ClipFrame[];
  // Legacy batch charges (pre per-clip pipeline). No longer written.
  framesCreditCost?: number;
  framesCharged?: boolean;
  // Set once frame jobs have been submitted (guards against double submit).
  framesSubmittedAt?: Date;
  clips: ProjectClip[];
  // Clips that should start a video once both scene images exist.
  autoVideoClips?: number[];
  // Per-clip AI chat that rewrites the start still, end still, and camera.
  sceneChats?: SceneChatThread[];
  // Concatenated reel (step 4). Fingerprint must match current clip URLs.
  reelUrl?: string;
  reelStatus?: ReelStatus;
  reelFingerprint?: string;
  reelError?: string;
  // Which clip the pairwise reel join is on, so the editor can show progress.
  reelStep?: { current: number; total: number; phase: "download" | "join" };
  // Compose tries for the current fingerprint. A dead worker retries until the cap.
  reelAttempts?: number;
  // Director writes waiting to become storyboard clips.
  clipAppends?: ClipAppend[];
  // Single-flight lease so two polls cannot draft the same clip.
  clipAppendLockToken?: string;
  clipAppendLockUntil?: Date;
  // Branding edit for the Video tab (copy, never linked to the template).
  edit?: VideoEdit;
  // Generated reel cover still (not part of the exported video).
  coverUrl?: string;
  coverStatus?: CoverStatus;
  coverStartedAt?: Date;
  coverCreditsCharged?: boolean;
  // Optional extra requirement for the last cover generate.
  coverPrompt?: string;
  // Social apps whose crop the last cover was composed to survive.
  coverSafeAreas?: CoverSafeArea[];
  // True once those margins are scaled into the saved still, not only written into the prompt.
  coverInset?: boolean;
  // Template last applied to or saved from this video.
  editTemplateId?: ObjectId;
  // Branded export. Fingerprint = reel fingerprint + edit hash.
  finalUrl?: string;
  finalStatus?: ReelStatus;
  finalFingerprint?: string;
  finalError?: string;
  // When the current export was queued; a stale one can be re-queued.
  finalQueuedAt?: Date;
  // Set when the user marks a finished video as posted. Absent means pending to post.
  postedAt?: Date;
  // Set when the user archives the video. Any stage can be archived.
  archivedAt?: Date;
  // Legacy batch charges (pre per-clip pipeline). No longer written.
  creditCost?: number;
  creditsCharged: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

const aspectRatioSchema = z.enum(["16:9", "9:16", "1:1"]);
const frameStatusSchema = z.enum(["queued", "in_progress", "completed", "failed"]);

// Same four statuses as a clip. No frame position: one plate per clip.
const subtitlePlateSchema = z.object({
  clipNumber: z.number(),
  status: frameStatusSchema,
  outputUrl: z.string().optional(),
  blobUrl: z.string().optional(),
  error: z.string().optional(),
  submittedAt: z.string().optional(),
  creditsCharged: z.number().optional(),
  line: z.string().optional(),
});

const onscreenTextItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  textStyleId: z.string(),
  styleName: z.string().optional(),
  status: frameStatusSchema,
  outputUrl: z.string().optional(),
  blobUrl: z.string().optional(),
  error: z.string().optional(),
  submittedAt: z.string().optional(),
  creditsCharged: z.number().optional(),
});

const frameRevisionSchema = z.object({
  remark: z.string().optional(),
  annotatedUrl: z.string().optional(),
});

const storyboardRowSchema = z.object({
  clipNumber: z.number(),
  timeRange: z.string(),
  durationSeconds: z.number(),
  narrativeJob: z.string(),
  explainerScene: z.string(),
  motionCamera: z.string(),
  englishVo: z.string(),
  startScene: z.string().optional(),
  endScene: z.string().optional(),
  startVo: z.string().optional(),
  endVo: z.string().optional(),
  referenceTranslation: z.string().optional(),
  bgmSfx: z.string(),
  referenceImageIds: z.array(z.string()).optional(),
  styleId: z.string().optional(),
  editedAt: z.string().optional(),
  endUsesStartStill: z.boolean().optional(),
  backgroundSetId: z.string().optional(),
  motionPrompt: z.string().optional(),
  expressiveness: z.enum(["low", "medium", "high"]).optional(),
  subtitleCues: z.array(z.string()).optional(),
});

const objectSheetItemSchema = z.object({
  name: z.string(),
  notes: z.string(),
});

const backgroundPlateSchema = z.object({
  setId: z.string(),
  name: z.string(),
  notes: z.string(),
  clipNumbers: z.array(z.number()),
  url: z.string().optional(),
});

const phaseAProposalSchema = z.object({
  englishTitle: z.string(),
  localizedTitle: z.string(),
  targetDuration: z.string(),
  clipCount: z.number(),
  loopMode: z.enum(["linear", "infinite"]),
  coreMessage: z.string(),
  hookStrategy: z.string(),
  aspectRatio: aspectRatioSchema,
  visualWorld: z.string(),
  narrator: z.string(),
  englishWordCount: z.number(),
  characterLock: z.string(),
  palette: z.string(),
  bgmDirection: z.string(),
  narrativeArc: z.string(),
  clips: z.array(storyboardRowSchema),
});

export const projectSchema: z.ZodType<Project> = z.object({
  _id: objectIdSchema,
  userId: objectIdSchema,
  clerkUserId: z.string(),
  projectId: objectIdSchema.optional(),
  skillId: objectIdSchema,
  skillSlug: z.string(),
  source: z.string(),
  spokenScript: z.string().optional(),
  aspectRatio: aspectRatioSchema,
  durationPreset: z.enum(DURATION_PRESET_IDS),
  styleId: z.string().optional(),
  styleIds: z.array(z.string()).optional(),
  language: z.enum(VO_LANGUAGE_IDS).optional(),
  narrationEnabled: z.boolean().optional(),
  voiceGender: z.enum(["male", "female"]).optional(),
  speechPace: z.enum(["slow", "medium", "fast"]).optional(),
  sceneTextEnabled: z.boolean().optional(),
  sceneTextLanguage: z.enum(["en", "zh-Hant", "zh-Hans", "none"]).optional(),
  subtitleLook: z.enum(SUBTITLE_LOOK_IDS).optional(),
  textStyleId: z.string().optional(),
  textStyleImageUrl: z.string().optional(),
  subtitleOverlay: z.boolean().optional(),
  subtitlePlates: z.array(subtitlePlateSchema).optional(),
  onscreenTexts: z.array(onscreenTextItemSchema).optional(),
  subtitleLetterings: z.array(z.object({ key: z.string(), url: z.string() })).optional(),
  characterImageUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  referenceImages: z
    .array(z.object({ id: z.string(), url: z.string(), description: z.string() }))
    .optional(),
  clipDrafts: z
    .array(
      z.object({
        clipNumber: z.number().int().min(1),
        explanation: z.string(),
        voDraft: z.string().optional(),
        sketchUrl: z.string().optional(),
        sketchElements: z
          .array(
            z.object({
              type: z.enum(["person", "rect", "circle", "arrow", "line", "text"]),
              x: z.number(),
              y: z.number(),
              width: z.number().optional(),
              height: z.number().optional(),
              x2: z.number().optional(),
              y2: z.number().optional(),
              label: z.string().optional(),
              color: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
  backgroundImageUrls: z.array(z.string()).max(2).optional(),
  directorBackgroundId: z.string().optional(),
  talkingHeadBackgroundId: z.string().optional(),
  talkingHeadPoseId: z.string().optional(),
  startImageUrl: z.string().optional(),
  cast: z.array(castMemberSchema).optional(),
  products: z.array(productShotSchema).optional(),
  status: z.enum([
    "draft",
    "phase_a",
    "awaiting_approval",
    "production",
    "ready",
    "failed",
    "frames_generating",
    "frames_ready",
    "approved",
    "generating",
  ]),
  phaseA: phaseAProposalSchema.optional(),
  phaseB: z
    .object({
      globalContinuity: z.string(),
      prompts: z.array(
        z.object({
          clipNumber: z.number(),
          durationSeconds: z.number(),
          prompt: z.string(),
        }),
      ),
      stitchingGuide: z.string(),
      voiceMusicNote: z.string(),
    })
    .optional(),
  characterStillUrl: z.string().optional(),
  stillError: z.string().optional(),
  objectSheetItems: z.array(objectSheetItemSchema).optional(),
  objectSheetUrl: z.string().optional(),
  objectSheetError: z.string().optional(),
  lockRevision: z.string().optional(),
  backgroundPlates: z.array(backgroundPlateSchema).optional(),
  backgroundPlateError: z.string().optional(),
  frames: z
    .array(
      z.object({
        clipNumber: z.number(),
        position: z.enum(["start", "end"]),
        prompt: z.string(),
        status: frameStatusSchema,
        outputUrl: z.string().optional(),
        blobUrl: z.string().optional(),
        error: z.string().optional(),
        revision: frameRevisionSchema.optional(),
        submittedAt: z.string().optional(),
        mergedUrl: z.string().optional(),
        mergedSceneUrl: z.string().optional(),
        mergedPlateUrl: z.string().optional(),
        mergedAt: z.string().optional(),
      }),
    )
    .optional(),
  framesCreditCost: z.number().optional(),
  framesCharged: z.boolean().optional(),
  framesSubmittedAt: z.date().optional(),
  clips: z.array(
    z.object({
      clipNumber: z.number(),
      durationSeconds: z.number(),
      prompt: z.string(),
      status: frameStatusSchema,
      outputUrl: z.string().optional(),
      blobUrl: z.string().optional(),
      error: z.string().optional(),
      submittedAt: z.string().optional(),
      creditsCharged: z.number().optional(),
      unsent: z.boolean().optional(),
      mergedKeyframes: z.boolean().optional(),
      voUrl: z.string().optional(),
      voOnsetSeconds: z.number().optional(),
    }),
  ),
  reelUrl: z.string().optional(),
  reelStatus: z.enum(["queued", "in_progress", "completed", "failed"]).optional(),
  reelFingerprint: z.string().optional(),
  reelError: z.string().optional(),
  reelStep: z
    .object({
      current: z.number(),
      total: z.number(),
      phase: z.enum(["download", "join"]),
    })
    .optional(),
  reelAttempts: z.number().optional(),
  clipAppends: z
    .array(
      z.object({
        id: z.string(),
        content: z.string(),
        insertAt: z.number(),
        status: z.enum(["queued", "writing", "failed"]),
        error: z.string().optional(),
        createdAt: z.date(),
        startedAt: z.date().optional(),
      }),
    )
    .optional(),
  clipAppendLockToken: z.string().optional(),
  clipAppendLockUntil: z.date().optional(),
  edit: videoEditSchema.optional(),
  coverUrl: z.string().optional(),
  coverStatus: z.enum(["idle", "generating", "failed"]).optional(),
  coverStartedAt: z.date().optional(),
  coverCreditsCharged: z.boolean().optional(),
  coverPrompt: z.string().optional(),
  coverSafeAreas: z.array(z.enum(COVER_SAFE_AREA_IDS)).optional(),
  coverInset: z.boolean().optional(),
  editTemplateId: objectIdSchema.optional(),
  finalUrl: z.string().optional(),
  finalStatus: z.enum(["queued", "in_progress", "completed", "failed"]).optional(),
  finalFingerprint: z.string().optional(),
  finalError: z.string().optional(),
  finalQueuedAt: z.date().optional(),
  postedAt: z.date().optional(),
  archivedAt: z.date().optional(),
  creditCost: z.number().optional(),
  creditsCharged: z.boolean(),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
