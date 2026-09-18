"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { FramesTimeline } from "@/components/project/frames-timeline";
import { ProjectStepper } from "@/components/project/project-stepper";
import { Spinner } from "@/components/spinner";
import { StylePicker } from "@/components/style-picker";
import {
  approveAndGenerateAction,
  approveStoryboardAction,
  regenerateFrameAction,
  updateClipStoryboardAction,
} from "@/lib/actions/generation";
import {
  createVideoAction,
  retryProjectAction,
  reviseProjectAction,
} from "@/lib/actions/projects";
import { DURATION_PRESETS } from "@/lib/director/duration-presets";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import { failedStepFor } from "@/lib/project-status";
import type { PublicCharacter, PublicSkill, PublicStyle, PublicVideo } from "@/lib/serialize";
import { DEFAULT_STYLE_ID, type StyleId } from "@/lib/styles";
import type {
  AspectRatio,
  ClipStoryboardInput,
  DurationPreset,
  FramePosition,
  FrameRevisionInput,
  VoLanguage,
} from "@/types/project";
import { CharacterPicker } from "../[id]/character-picker";
import { SkillPicker } from "../[id]/skill-picker";
import { AspectRatioPicker } from "./aspect-ratio-picker";
import { DirectorProgress } from "./director-progress";
import { DurationPicker } from "./duration-picker";
import { GenerationPanel } from "./generation-panel";
import { LanguagePicker } from "./language-picker";
import { StoryboardPreview } from "./storyboard-preview";
import { useProjectPoll } from "./use-project-poll";

const ease = [0.22, 1, 0.36, 1] as const;

// Whole create → storyboard → approve → generate flow lives on this one page.
export function NewProjectForm({
  projectId,
  skills,
  styles,
  characters,
  initialVideo = null,
  credits,
  subscribed,
  onVideoCreated,
}: {
  projectId: string;
  skills: PublicSkill[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  initialVideo?: PublicVideo | null;
  credits: number;
  subscribed: boolean;
  onVideoCreated?: (video: PublicVideo) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Form fields
  const [skillSlug, setSkillSlug] = useState(
    initialVideo?.skillSlug || skills[0]?.slug || "",
  );
  // Visual style; the cast must share it, so changing it prunes mismatches.
  const [styleId, setStyleId] = useState<StyleId>(
    initialVideo?.styleId || DEFAULT_STYLE_ID,
  );
  const [source, setSource] = useState(initialVideo?.source || "");
  const [language, setLanguage] = useState<VoLanguage>(initialVideo?.language || "en");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | "">(
    initialVideo?.aspectRatio || "",
  );
  const [durationPreset, setDurationPreset] = useState<DurationPreset>(
    initialVideo?.durationPreset || "punchy",
  );
  const [characterIds, setCharacterIds] = useState<string[]>(
    initialVideo?.cast.map((member) => member.characterId) || [],
  );

  // Flow state — locked when opening an existing video via ?video=.
  const [project, setProject] = useState<PublicVideo | null>(initialVideo);
  const [submitting, setSubmitting] = useState(false);
  // "" | "revise" | "approve" | `frame:${clip}:${position}`
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  const onPollUpdate = useCallback((next: PublicVideo) => {
    setProject(next);
  }, []);
  const onPollError = useCallback((message: string) => setError(message), []);
  useProjectPoll(project, onPollUpdate, onPollError);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aspectRatio) {
      setError("請選擇畫面比例");
      return;
    }
    setSubmitting(true);
    setError("");
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("skillSlug", skillSlug);
    formData.set("styleId", styleId);
    formData.set("source", source);
    formData.set("language", language);
    formData.set("aspectRatio", aspectRatio);
    formData.set("durationPreset", durationPreset);
    for (const id of characterIds) formData.append("characterIds", id);

    const result = await createVideoAction(formData);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Switch to the stepper immediately; Phase A runs in the background.
    setProject(result.project);
    onVideoCreated?.(result.project);
    router.replace(`${pathname}?video=${result.project.id}`);
  }

  async function onRevise(note: string) {
    if (!project) return;
    setPending("revise");
    setError("");
    const data = new FormData();
    data.set("projectId", project.id);
    data.set("note", note);
    const result = await reviseProjectAction(data);
    setPending("");
    if (!result.ok) setError(result.error);
    else {
      // Phase A runs in the background; poll picks up the storyboard.
      setProject(result.project);
    }
  }

  // Shared handler for both paid approvals; billing errors bounce to /app/billing.
  async function runPaid(
    key: string,
    action: () => Promise<
      { ok: true; project: PublicVideo } | { ok: false; error: string }
    >,
  ) {
    setPending(key);
    setError("");
    const result = await action();
    setPending("");
    if (!result.ok) {
      setError(result.error);
      if (result.error.includes("訂閱") || result.error.includes("credits 不足")) {
        router.push("/app/billing");
      }
      return false;
    }
    setProject(result.project);
    return true;
  }

  // Step 1: storyboard approved → generate start/end frames.
  function onApproveStoryboard() {
    if (!project) return;
    void runPaid("approve", () => approveStoryboardAction(project.id));
  }

  // Step 2: frames approved → Phase B + video.
  function onApproveFrames() {
    if (!project) return;
    void runPaid("approve", () => approveAndGenerateAction(project.id));
  }

  // Redo one frame; `revision` (sketch + remark) comes from the edit dialog.
  function onRegenerateFrame(
    clipNumber: number,
    position: FramePosition,
    revision?: FrameRevisionInput,
  ) {
    if (!project) return;
    void runPaid(`frame:${clipNumber}:${position}`, () =>
      regenerateFrameAction(project.id, clipNumber, position, revision),
    );
  }

  // Rewrite one clip's storyboard text; optionally redraw its two frames (2 credits).
  function onUpdateClip(
    clipNumber: number,
    input: ClipStoryboardInput,
    regenerate: boolean,
  ) {
    if (!project) return Promise.resolve(false);
    return runPaid(`clip:${clipNumber}${regenerate ? ":regen" : ""}`, () =>
      updateClipStoryboardAction(project.id, clipNumber, input, { regenerate }),
    );
  }

  // Failed → move back to the gate it fell over on (no charge).
  async function onRetry() {
    if (!project) return;
    setPending("retry");
    setError("");
    const result = await retryProjectAction(project.id);
    setPending("");
    if (!result.ok) setError(result.error);
    else setProject(result.project);
  }

  // Switching style drops selected characters drawn in a different style.
  function onStyleChange(id: StyleId) {
    setStyleId(id);
    setCharacterIds((ids) =>
      ids.filter((cid) => characters.find((c) => c.id === cid)?.styleId === id),
    );
  }

  function reset() {
    router.replace(pathname);
  }

  const locked = project !== null;
  const skillTitle =
    skills.find((item) => item.slug === (project?.skillSlug || skillSlug))?.titleZh ||
    "解說風格";
  const styleName =
    styles.find((item) => item.id === (project?.styleId || styleId))?.nameZh || "視覺風格";
  const canSubmit =
    source.trim().length > 0 &&
    aspectRatio !== "" &&
    skillSlug !== "" &&
    !submitting;

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6">
        {/* Step indicator: 題材 → 分鏡 → 分鏡圖 → 影片 */}
        <div className="rounded-2xl border border-accent-ink/10 bg-paper/70 px-5 py-4">
          <ProjectStepper
            status={project?.status ?? "draft"}
            failedAtStep={project?.status === "failed" ? failedStepFor(project) : undefined}
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {!locked ? (
            <motion.form
              key="form"
              onSubmit={onSubmit}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.99, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, ease }}
              className="space-y-7 rounded-[1.75rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.08)] backdrop-blur sm:p-8"
            >
              <input type="hidden" name="projectId" value={projectId} />

              <Section step="01" title="解說風格" hint="這支影片要用哪一種敘事風格。">
                <SkillPicker
                  skills={skills}
                  value={skillSlug}
                  onChange={setSkillSlug}
                  disabled={submitting}
                />
                {/* Visual style sits under the narrative skill in the same step. */}
                <p className="mt-5 text-sm font-semibold">視覺風格</p>
                <p className="mt-1 text-xs text-muted">
                  分鏡圖與影片的畫風；角色必須是同一種風格。
                </p>
                <div className="mt-3">
                  <StylePicker
                    styles={styles}
                    value={styleId}
                    onChange={onStyleChange}
                    disabled={locked || submitting}
                  />
                </div>
              </Section>

              <Section step="02" title="題材或腳本" hint="貼上文章、產品說明、或你想解釋的概念。">
                <label htmlFor="source" className="sr-only">
                  題材或腳本
                </label>
                <textarea
                  id="source"
                  name="source"
                  required
                  rows={7}
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  disabled={submitting}
                  className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-base leading-7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                  placeholder="例如：為什麼複利對年輕人特別重要？用一個簡單的比喻說明，最後給一個行動建議。"
                />
                <p className="mt-2 text-right text-xs tabular-nums text-muted">
                  {source.length.toLocaleString()} 字
                </p>
              </Section>

              <Section step="03" title="旁白語言" hint="影片會用這個語言配旁白；分鏡說明維持繁體中文。">
                <LanguagePicker value={language} onChange={setLanguage} disabled={submitting} />
              </Section>

              <Section step="04" title="畫面比例" hint="依投放平台選擇。">
                <AspectRatioPicker
                  value={aspectRatio}
                  onChange={setAspectRatio}
                  disabled={submitting}
                />
              </Section>

              <Section step="05" title="片長" hint="影響 clip 數量，也就是核准時要扣的 credits。">
                <DurationPicker
                  value={durationPreset}
                  onChange={setDurationPreset}
                  disabled={submitting}
                />
              </Section>

              <Section step="06" title="角色" hint="選填。最多 4 個；分鏡與分鏡圖會鎖定這些角色的藍圖。">
                <CharacterPicker
                  characters={characters}
                  styleId={styleId}
                  value={characterIds}
                  onChange={setCharacterIds}
                  disabled={submitting}
                />
              </Section>

              {error ? (
                <p role="alert" className="text-sm font-medium text-accent">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-4 border-t border-accent-ink/10 pt-6">
                <motion.button
                  type="submit"
                  disabled={!canSubmit}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {submitting ? <Spinner /> : null}
                  {submitting ? "送出中…" : "產生分鏡提案"}
                </motion.button>
                <p className="text-xs text-muted">
                  這一步不扣 credits。分鏡出來後你再決定要不要產片。
                </p>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              transition={{ duration: 0.35, ease }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-ink/10 bg-paper/70 px-5 py-4 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold">{skillTitle}</span>
                <Dot />
                <span>{styleName}</span>
                <Dot />
                <span>{LANGUAGE_PRESETS[language].label}</span>
                <Dot />
                <span>{aspectRatio}</span>
                <Dot />
                <span>{DURATION_PRESETS[durationPreset].label}</span>
                {project?.cast.length ? (
                  <>
                    <Dot />
                    <span>{project.cast.map((member) => member.name).join("、")}</span>
                  </>
                ) : null}
              </div>
              <button
                type="button"
                onClick={reset}
                className="min-h-[44px] cursor-pointer rounded-full px-3 text-sm font-semibold text-muted transition hover:text-foreground"
              >
                建立另一支
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {project?.status === "phase_a" ? (
            <DirectorProgress key="phase-a" mode="storyboard" />
          ) : project?.status === "awaiting_approval" ? (
            <StoryboardPreview
              key="storyboard"
              project={project}
              credits={credits}
              subscribed={subscribed}
              pending={pending === "revise" || pending === "approve" ? pending : ""}
              error={error}
              onApprove={onApproveStoryboard}
              onRevise={(note) => void onRevise(note)}
            />
          ) : project?.status === "frames_generating" ||
            project?.status === "frames_ready" ? (
            <FramesTimeline
              key="frames"
              project={project}
              credits={credits}
              subscribed={subscribed}
              pending={pending}
              error={error}
              onApprove={onApproveFrames}
              onRegenerate={onRegenerateFrame}
              onUpdateClip={onUpdateClip}
            />
          ) : project?.status === "approved" ? (
            <DirectorProgress key="phase-b" mode="production" />
          ) : project?.status === "generating" || project?.status === "ready" ? (
            <GenerationPanel key="generation" project={project} />
          ) : project?.status === "failed" ? (
            <FailedCard
              key="failed"
              project={project}
              pending={pending}
              onRetry={() => void onRetry()}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="flex items-center gap-3">
        <span className="font-display rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold">
          {step}
        </span>
        <span className="font-display text-base font-bold">{title}</span>
      </legend>
      <p className="mt-1 text-xs text-muted">{hint}</p>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function FailedCard({
  project,
  pending,
  onRetry,
}: {
  project: PublicVideo;
  pending: string;
  onRetry: () => void;
}) {
  // Label the retry by the step it will return to.
  const step = failedStepFor(project);
  const label =
    step === 1 ? "重新產生分鏡" : step === 2 ? "回到分鏡，重畫分鏡圖" : "回到分鏡圖，重新產片";
  return (
    <motion.section
      role="alert"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      className="rounded-[1.5rem] border border-accent/40 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(255,77,46,0.35)]"
    >
      <p className="font-display text-lg font-bold text-accent">這次沒有成功</p>
      <p className="mt-2 text-sm text-muted">{project.error || "請再試一次。"}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={pending !== ""}
        className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 py-2 text-sm font-semibold text-lime transition hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? <Spinner /> : null}
        {label}
      </button>
      <p className="mt-3 text-xs text-muted">失敗階段的 credits 已自動退回，重試不會重複扣款。</p>
    </motion.section>
  );
}

function Dot() {
  return <span aria-hidden className="h-1 w-1 rounded-full bg-accent-ink/30" />;
}
