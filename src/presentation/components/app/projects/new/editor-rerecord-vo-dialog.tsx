"use client";

import { useEffect, useId, useState } from "react";
import { updateClipUploadedVoAction } from "@/presentation/actions/vo-upload";
import { VoAudioRecorderControls } from "@/presentation/components/app/projects/new/vo-audio-recorder-controls";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicVideo } from "@/presentation/serialize";
import { isTalkingHeadSkill } from "@/service/director/talking-head";
import { clipVideoCost } from "@/service/production-plan";

// Dialog & toolbar trigger inside the Editor so the user can re-record or upload a new VO audio
// and immediately regenerate the talking-head clip video with the new audio + character.
export function EditorReRecordVoDialog({
  project,
  selectedClipNumber,
  credits,
  busy,
  onProject,
}: {
  project: PublicVideo;
  selectedClipNumber?: number | null;
  credits: number;
  busy?: boolean;
  onProject: (project: PublicVideo) => void;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();
  const [open, setOpen] = useState(false);

  const clips = project.phaseA?.clips ?? [];
  const defaultClipNum = selectedClipNumber ?? clips[0]?.clipNumber ?? 1;
  const [clipNumber, setClipNumber] = useState<number>(defaultClipNum);

  const currentClipRow =
    clips.find((c) => c.clipNumber === clipNumber) ?? clips[0];
  const initialVoUrl =
    currentClipRow?.uploadedVoUrl ||
    (clipNumber === 1 ? project.uploadedVoUrl : undefined) ||
    project.clips.find((c) => c.clipNumber === clipNumber)?.voUrl;
  const initialDuration =
    currentClipRow?.uploadedVoDurationSeconds ??
    (clipNumber === 1 ? project.uploadedVoDurationSeconds : undefined) ??
    currentClipRow?.durationSeconds;

  const [voUrl, setVoUrl] = useState<string | undefined>(initialVoUrl);
  const [voDuration, setVoDuration] = useState<number | undefined>(initialDuration);
  const [transcript, setTranscript] = useState<string>(
    currentClipRow?.englishVo ?? project.spokenScript ?? "",
  );
  const [savingMode, setSavingMode] = useState<"" | "save" | "regenerate">("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape" && !savingMode) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, savingMode]);

  if (!isTalkingHeadSkill(project.skillSlug) || clips.length === 0) {
    return null;
  }

  function openDialog() {
    const targetNum = selectedClipNumber ?? clips[0]?.clipNumber ?? 1;
    const row = clips.find((c) => c.clipNumber === targetNum) ?? clips[0];
    setClipNumber(row?.clipNumber ?? 1);
    setVoUrl(
      row?.uploadedVoUrl ||
        ((row?.clipNumber ?? 1) === 1 ? project.uploadedVoUrl : undefined) ||
        project.clips.find((c) => c.clipNumber === row?.clipNumber)?.voUrl,
    );
    setVoDuration(
      row?.uploadedVoDurationSeconds ??
        ((row?.clipNumber ?? 1) === 1 ? project.uploadedVoDurationSeconds : undefined) ??
        row?.durationSeconds,
    );
    setTranscript(row?.englishVo ?? project.spokenScript ?? "");
    setError("");
    setOpen(true);
  }

  async function handleSave(regenerateVideo: boolean) {
    if (!voUrl || savingMode) return;
    setError("");
    setSavingMode(regenerateVideo ? "regenerate" : "save");
    try {
      const res = await updateClipUploadedVoAction({
        videoId: project.id,
        clipNumber,
        voUrl,
        durationSeconds: voDuration || currentClipRow?.durationSeconds || 8,
        transcript,
        regenerateVideo,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onProject(res.project);
      if (regenerateVideo) notifyTasksChanged();
      setOpen(false);
    } catch {
      setError(isEn ? "Failed to update VO recording." : "更新 VO 錄音失敗，請重試");
    } finally {
      setSavingMode("");
    }
  }

  const estimatedCost = clipVideoCost(project, clipNumber);

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={openDialog}
        className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink/20 bg-paper px-3 text-xs font-bold text-foreground transition hover:border-accent-ink/45 hover:bg-lime/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span>🎙</span>
        <span>{isEn ? "Re-record / Upload VO" : "重新錄音 / 更換 VO"}</span>
      </button>

      {open ? (
        <DialogBackdrop
          className="grid place-items-center bg-black/50 p-4"
          onClick={() => {
            if (!savingMode) setOpen(false);
          }}
          zIndex={150}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(ev) => ev.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border-2 border-accent-ink bg-paper text-foreground shadow-[8px_8px_0_0_#12141c]"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
              <div>
                <h2 id={titleId} className="font-display text-lg font-bold">
                  {isEn
                    ? "Re-record or Upload VO Audio"
                    : "重新錄音／上傳 VO 並重新生成影片"}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  {isEn
                    ? "Record a new voiceover or upload an audio file, then regenerate the talking-head video with your character."
                    : "直接用麥克風重新錄音或上傳新音訊檔，AI 會自動更新字幕並用新錄音 + 角色重新生成對嘴影片。"}
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(savingMode)}
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {clips.length > 1 ? (
                <div>
                  <label className="block text-xs font-bold text-muted">
                    {isEn ? "Target Clip" : "選擇段落"}
                  </label>
                  <select
                    value={clipNumber}
                    onChange={(ev) => {
                      const nextNum = Number(ev.target.value);
                      setClipNumber(nextNum);
                      const row = clips.find((c) => c.clipNumber === nextNum);
                      setVoUrl(
                        row?.uploadedVoUrl ||
                          project.clips.find((c) => c.clipNumber === nextNum)?.voUrl,
                      );
                      setVoDuration(row?.uploadedVoDurationSeconds ?? row?.durationSeconds);
                      setTranscript(row?.englishVo ?? "");
                    }}
                    className="mt-1 h-9 w-full rounded-xl border border-accent-ink/20 bg-white px-3 text-xs font-semibold"
                  >
                    {clips.map((c) => (
                      <option key={c.clipNumber} value={c.clipNumber}>
                        Clip {c.clipNumber} ({c.durationSeconds}s)
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <VoAudioRecorderControls
                voUrl={voUrl}
                voDurationSeconds={voDuration}
                language={project.language}
                disabled={Boolean(savingMode)}
                onUploaded={({ url, durationSeconds, transcript: nextText }) => {
                  setVoUrl(url);
                  setVoDuration(durationSeconds);
                  if (nextText.trim()) setTranscript(nextText);
                }}
                onClear={() => {
                  setVoUrl(undefined);
                  setVoDuration(undefined);
                }}
                onError={setError}
              />

              <div>
                <label className="block text-xs font-bold text-foreground">
                  {isEn
                    ? "Spoken Transcript & Subtitles (Auto-transcribed, editable)"
                    : "語音字幕稿（AI 自動識別，可自由修改字眼）"}
                </label>
                <textarea
                  rows={4}
                  value={transcript}
                  onChange={(ev) => setTranscript(ev.target.value)}
                  disabled={Boolean(savingMode)}
                  placeholder={
                    isEn
                      ? "Spoken words for subtitles and facial choreography…"
                      : "錄音或上傳後會自動填入字幕稿，你亦可以手動微調…"
                  }
                  className="mt-1.5 w-full rounded-2xl border border-accent-ink/20 bg-white px-3.5 py-2.5 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-accent"
                />
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-accent-ink/10 bg-paper/90 px-6 py-3.5">
              <span className="text-[11px] font-medium text-muted">
                {isEn
                  ? `Video generation cost: ~${estimatedCost} credits (Remaining: ${credits})`
                  : `重新生成影片約需 ${estimatedCost} 點（目前餘額：${credits} 點）`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!voUrl || Boolean(savingMode)}
                  onClick={() => void handleSave(false)}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink/20 bg-white px-4 py-1.5 text-xs font-bold text-foreground transition hover:border-accent-ink/45 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingMode === "save" ? <Spinner className="h-3.5 w-3.5" /> : null}
                  <span>{isEn ? "Save VO Only" : "僅儲存錄音與字幕"}</span>
                </button>
                <button
                  type="button"
                  disabled={!voUrl || Boolean(savingMode)}
                  onClick={() => void handleSave(true)}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingMode === "regenerate" ? <Spinner className="h-3.5 w-3.5" /> : null}
                  <span>
                    {isEn
                      ? "Save & Regenerate Video"
                      : "儲存並用新錄音重新生成影片"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </DialogBackdrop>
      ) : null}
    </>
  );
}
