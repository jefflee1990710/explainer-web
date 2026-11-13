"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  JutsuPersonMapping,
  JutsuSourceMediaKind,
  PublicJutsuJob,
} from "@/model/jutsu-job";
import {
  detectJutsuPeopleAction,
  startScroSwapJobAction,
} from "@/presentation/actions/jutsu";
import {
  captureImageElementDataUrl,
  captureVideoFrameDataUrl,
  JutsuPersonRleOverlay,
  JutsuPersonTabsBar,
  type JutsuPersonSlotAssignment,
} from "@/presentation/components/app/jutsu/jutsu-person-rle-mapper";
import { JutsuRelightPicker } from "@/presentation/components/app/jutsu/jutsu-relight-picker";
import { LookCardImage } from "@/presentation/components/app/jutsu/look-card-image";
import { CharacterManageDialog } from "@/presentation/components/app/projects/[id]/character-manage-dialog";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { writeLastCharacterIds } from "@/presentation/components/app/projects/new/brief-defaults";
import { BrandUploadDropzone } from "@/presentation/components/app/projects/new/brand-upload-dropzone";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
} from "@/presentation/serialize";
import type { CharacterPresetSelection } from "@/service/character/character-presets";
import type { DetectedSourcePerson } from "@/service/fal/sam3-image";
import { folderVideoPath } from "@/service/folder-video-path";

type LookTab = "presets" | "historical";

// Prioritize the full-body standing figure (`profileUrl`) so full outfits (top, pants/skirt/shorts,
// dress length, and shoes) are 100% visible when preparing the swapped keyframe.
function versionImageUrl(v?: PublicCharacterVersion | null): string {
  if (!v) return "";
  return v.profileUrl || v.portraitUrl || v.blueprintUrl || "";
}

function presetImageUrl(p: PublicCharacterPreset, char: PublicCharacter): string {
  if (p.profileUrl || p.portraitUrl || p.blueprintUrl) {
    return p.profileUrl || p.portraitUrl || p.blueprintUrl || "";
  }
  const ver = char.versions.find((v) => v.id === p.versionId);
  return versionImageUrl(ver);
}

function inferClientSourceMediaKind(url: string): JutsuSourceMediaKind {
  const clean = (url || "").split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  if (clean.endsWith(".gif")) return "gif";
  if (
    clean.endsWith(".png") ||
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".webp")
  ) {
    return "image";
  }
  return "video";
}

function defaultCharacterLookUrl(char?: PublicCharacter | null): string {
  if (!char) return "";
  const completed = [...(char.versions || [])]
    .reverse()
    .filter((v) => v.status === "completed" && Boolean(versionImageUrl(v)));
  const def = char.defaultVersionId
    ? completed.find((v) => v.id === char.defaultVersionId)
    : undefined;
  return versionImageUrl(def ?? completed[0]) || char.previewUrl || "";
}

/** Single-portrait avatar URL (avoids the 2-column blueprint board image). */
function characterAvatarUrl(char?: PublicCharacter | null): string {
  if (!char) return "";
  const completed = [...(char.versions || [])]
    .reverse()
    .filter((v) => v.status === "completed");
  const def = char.defaultVersionId
    ? completed.find((v) => v.id === char.defaultVersionId)
    : undefined;
  const pick = def ?? completed[0];
  return (
    pick?.portraitUrl ||
    pick?.profileUrl ||
    char.previewUrl ||
    pick?.blueprintUrl ||
    ""
  );
}

/**
 * Large modal dialog for creating a new Scro Swap job:
 * - Video upload + start/length controls
 * - 2-layer character selection:
 *   Layer 1: Character grid (or upload custom photo)
 *   Layer 2: Presets (default) | Historical versions | Customize Outfit (opens CharacterManageDialog)
 */
export function ScroSwapCreateDialog({
  characters,
  onCharacterUpdated,
  onCreated,
  onClose,
}: {
  characters: PublicCharacter[];
  onCharacterUpdated: (next: PublicCharacter) => void;
  onCreated: (job: PublicJutsuJob) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [sourceMediaKind, setSourceMediaKind] = useState<JutsuSourceMediaKind>("video");
  const [sourceUploadProgress, setSourceUploadProgress] = useState<number | null>(null);
  const [sectionStart, setSectionStart] = useState(0);
  const [sectionLength, setSectionLength] = useState(6);

  const [characterId, setCharacterId] = useState<string>(characters[0]?.id ?? "");
  const [lookTab, setLookTab] = useState<LookTab>("presets");
  // Selected look URL from Preset / Historical / Customize Outfit (or custom uploaded photo)
  const [selectedLookUrl, setSelectedLookUrl] = useState<string>(() =>
    defaultCharacterLookUrl(characters[0]),
  );
  const [selectedLookKey, setSelectedLookKey] = useState<string>("default");
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState("");
  const [managingCharacter, setManagingCharacter] = useState(false);

  // SAM 3 RLE multi-person detection & per-person character assignment state
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [detectedPeople, setDetectedPeople] = useState<DetectedSourcePerson[]>([]);
  const [detectingPeople, setDetectingPeople] = useState(false);
  const [activePersonIndex, setActivePersonIndex] = useState<number>(1);
  const [personAssignments, setPersonAssignments] = useState<
    Record<number, JutsuPersonSlotAssignment>
  >({});

  // Advanced options
  const [relightEnabled, setRelightEnabled] = useState(false);
  const [relightId, setRelightId] = useState("golden_halo");
  const [customLightPrompt, setCustomLightPrompt] = useState("");
  const [maskMargin, setMaskMargin] = useState<"tight" | "normal" | "loose">("normal");
  const [hatFix, setHatFix] = useState(false);
  const [noLipSync, setNoLipSync] = useState(false);
  const [keepSourceOutfit, setKeepSourceOutfit] = useState(false);
  const [motionSize, setMotionSize] = useState<512 | 768 | 1376>(512);
  const [applyColorFixOnRender, setApplyColorFixOnRender] = useState(true);
  const [keepSourceAudio, setKeepSourceAudio] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape" && !managingCharacter && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [managingCharacter, onClose, submitting]);

  const activeCharacter = useMemo(
    () => characters.find((c) => c.id === characterId) ?? null,
    [characters, characterId],
  );

  const completedVersions = useMemo(() => {
    if (!activeCharacter) return [];
    return [...(activeCharacter.versions || [])]
      .filter((v) => v.status === "completed" && Boolean(versionImageUrl(v)))
      .sort((a, b) => b.number - a.number);
  }, [activeCharacter]);

  const savedPresets = useMemo(() => {
    if (!activeCharacter) return [];
    return [...(activeCharacter.presets || [])].filter((p) =>
      Boolean(presetImageUrl(p, activeCharacter)),
    );
  }, [activeCharacter]);

  function updateActivePersonSlot(patch: Partial<JutsuPersonSlotAssignment>) {
    setPersonAssignments((prev) => {
      const cur = prev[activePersonIndex] ?? {
        keepOriginal: false,
        characterId,
        characterName: activeCharacter?.name ?? "",
        lookTab,
        selectedLookKey,
        selectedLookUrl,
        lookLabel: isEn ? "Default Look" : "預設造型",
        uploadedPhotoUrl,
      };
      return {
        ...prev,
        [activePersonIndex]: { ...cur, ...patch },
      };
    });
  }

  function switchActivePerson(personIndex: number) {
    setActivePersonIndex(personIndex);
    const slot = personAssignments[personIndex];
    if (!slot || slot.keepOriginal) return;
    if (slot.uploadedPhotoUrl) {
      setUploadedPhotoUrl(slot.uploadedPhotoUrl);
      return;
    }
    if (slot.characterId) {
      setCharacterId(slot.characterId);
      setUploadedPhotoUrl("");
      setLookTab(slot.lookTab || "presets");
      setSelectedLookKey(slot.selectedLookKey || "default");
      setSelectedLookUrl(slot.selectedLookUrl);
    }
  }

  const runFramePeopleDetection = useCallback(async () => {
    if (!sourceVideoUrl) return;
    setDetectingPeople(true);
    try {
      let frameDataUrl: string | null = null;
      if (sourceMediaKind === "video") {
        const videoEl = videoRef.current;
        if (!videoEl) return;
        if (Math.abs(videoEl.currentTime - sectionStart) > 0.15) {
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              videoEl.removeEventListener("seeked", onSeeked);
              resolve();
            };
            videoEl.addEventListener("seeked", onSeeked, { once: true });
            try {
              videoEl.currentTime = sectionStart;
            } catch {
              videoEl.removeEventListener("seeked", onSeeked);
              resolve();
            }
            window.setTimeout(() => {
              videoEl.removeEventListener("seeked", onSeeked);
              resolve();
            }, 1200);
          });
        }
        frameDataUrl = captureVideoFrameDataUrl(videoEl, 640);
      } else {
        const imgEl = imageRef.current;
        if (!imgEl) return;
        if (!imgEl.complete) {
          await new Promise<void>((resolve) => {
            const onLoad = () => {
              imgEl.removeEventListener("load", onLoad);
              resolve();
            };
            imgEl.addEventListener("load", onLoad, { once: true });
            window.setTimeout(() => {
              imgEl.removeEventListener("load", onLoad);
              resolve();
            }, 1200);
          });
        }
        frameDataUrl = captureImageElementDataUrl(imgEl, 640);
      }
      if (!frameDataUrl) return;

      const res = await detectJutsuPeopleAction({ frameDataUrl });
      if (!res.ok) return;

      setDetectedPeople(res.people);
      if (res.people.length > 0) {
        const firstChar =
          characters.find((c) => c.id === characterId) ?? characters[0] ?? null;
        const nextMap: Record<number, JutsuPersonSlotAssignment> = {};
        for (const p of res.people) {
          if (p.personIndex === 1) {
            nextMap[p.personIndex] = {
              keepOriginal: false,
              characterId: firstChar?.id ?? "",
              characterName: firstChar?.name ?? "",
              lookTab: "presets",
              selectedLookKey: "default",
              selectedLookUrl: defaultCharacterLookUrl(firstChar),
              lookLabel: isEn ? "Default Look" : "預設造型",
              uploadedPhotoUrl: "",
            };
          } else {
            nextMap[p.personIndex] = {
              keepOriginal: true,
              characterId: firstChar?.id ?? "",
              characterName: firstChar?.name ?? "",
              lookTab: "presets",
              selectedLookKey: "default",
              selectedLookUrl: defaultCharacterLookUrl(firstChar),
              lookLabel: isEn ? "Default Look" : "預設造型",
              uploadedPhotoUrl: "",
            };
          }
        }
        setPersonAssignments(nextMap);
        setActivePersonIndex(1);
      } else {
        setPersonAssignments({});
        setActivePersonIndex(1);
      }
    } finally {
      setDetectingPeople(false);
    }
  }, [sourceVideoUrl, sourceMediaKind, sectionStart, characters, characterId, isEn]);

  useEffect(() => {
    if (!sourceVideoUrl) return;
    const timer = window.setTimeout(() => {
      void runFramePeopleDetection();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [sourceVideoUrl, sectionStart, runFramePeopleDetection]);

  function selectKeepOriginalForActivePerson() {
    updateActivePersonSlot({ keepOriginal: true });
  }

  function selectCharacter(char: PublicCharacter) {
    if (!activePersonKeepOriginal && characterId === char.id && !uploadedPhotoUrl) {
      setCharacterId("");
      setSelectedLookUrl("");
      setSelectedLookKey("");
      updateActivePersonSlot({
        keepOriginal: true,
        characterId: "",
        characterName: "",
        selectedLookKey: "",
        selectedLookUrl: "",
      });
      return;
    }
    const defUrl = defaultCharacterLookUrl(char);
    setCharacterId(char.id);
    writeLastCharacterIds([char.id]);
    setUploadedPhotoUrl("");
    setLookTab("presets");
    setSelectedLookKey("default");
    setSelectedLookUrl(defUrl);
    updateActivePersonSlot({
      keepOriginal: false,
      characterId: char.id,
      characterName: char.name,
      lookTab: "presets",
      selectedLookKey: "default",
      selectedLookUrl: defUrl,
      lookLabel: isEn ? "Default Look" : "預設造型",
      uploadedPhotoUrl: "",
    });
  }

  function handleCustomizedLook(
    selection: CharacterPresetSelection,
    updatedCharacter?: PublicCharacter,
  ) {
    setManagingCharacter(false);
    const char = updatedCharacter ?? activeCharacter;
    if (!char) return;
    if (selection.presetId) {
      const preset = char.presets.find((p) => p.id === selection.presetId);
      const url = preset ? presetImageUrl(preset, char) : "";
      if (url) {
        setLookTab("presets");
        setSelectedLookKey(`preset:${preset!.id}`);
        setSelectedLookUrl(url);
        updateActivePersonSlot({
          keepOriginal: false,
          characterId: char.id,
          characterName: char.name,
          lookTab: "presets",
          selectedLookKey: `preset:${preset!.id}`,
          selectedLookUrl: url,
          lookLabel: preset!.name,
          uploadedPhotoUrl: "",
        });
        return;
      }
    }
    if (selection.versionId) {
      const ver = char.versions.find((v) => v.id === selection.versionId);
      const url = versionImageUrl(ver);
      if (url) {
        setLookTab("historical");
        setSelectedLookKey(`ver:${ver!.id}`);
        setSelectedLookUrl(url);
        updateActivePersonSlot({
          keepOriginal: false,
          characterId: char.id,
          characterName: char.name,
          lookTab: "historical",
          selectedLookKey: `ver:${ver!.id}`,
          selectedLookUrl: url,
          lookLabel: `v${ver!.number}`,
          uploadedPhotoUrl: "",
        });
      }
    }
  }

  const activePersonKeepOriginal =
    detectedPeople.length > 0 && Boolean(personAssignments[activePersonIndex]?.keepOriginal);

  const builtPersonMappings = useMemo<JutsuPersonMapping[]>(() => {
    if (detectedPeople.length === 0) return [];
    const list: JutsuPersonMapping[] = [];
    for (const person of detectedPeople) {
      const slot = personAssignments[person.personIndex];
      if (!slot || slot.keepOriginal) continue;
      const refUrl = slot.uploadedPhotoUrl || slot.selectedLookUrl;
      if (!refUrl) continue;
      list.push({
        objectId: person.objectId,
        personIndex: person.personIndex,
        anchorPoint: person.anchorPoint,
        box: person.box,
        characterId: slot.uploadedPhotoUrl ? undefined : slot.characterId || undefined,
        characterName: slot.uploadedPhotoUrl ? undefined : slot.characterName || undefined,
        referenceImageUrl: refUrl,
      });
    }
    return list;
  }, [detectedPeople, personAssignments]);

  async function onSubmit() {
    if (submitting || !sourceVideoUrl) return;
    if (detectedPeople.length > 0 && builtPersonMappings.length === 0) {
      setError(
        isEn
          ? "Please assign a character to at least one detected person."
          : "請至少為 1 位畫面人物指定替換角色",
      );
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const effectiveRefUrl =
        builtPersonMappings[0]?.referenceImageUrl ||
        uploadedPhotoUrl ||
        selectedLookUrl ||
        undefined;
      const effectiveCharId =
        builtPersonMappings.length > 0
          ? builtPersonMappings[0]?.characterId
          : uploadedPhotoUrl
            ? undefined
            : characterId || undefined;

      const res = await startScroSwapJobAction({
        sourceVideoUrl,
        sourceMediaKind,
        sectionStart,
        sectionLength,
        characterId: effectiveCharId,
        referenceImageUrl: effectiveRefUrl,
        personMappings: builtPersonMappings.length > 0 ? builtPersonMappings : undefined,
        allDetectedAnchors:
          detectedPeople.length > 0
            ? detectedPeople.map((p) => ({
                objectId: p.objectId,
                anchorPoint: p.anchorPoint,
              }))
            : undefined,
        totalDetectedPeople: detectedPeople.length > 0 ? detectedPeople.length : undefined,
        relightId: relightEnabled ? relightId : undefined,
        customLightPrompt: relightEnabled ? customLightPrompt : undefined,
        maskMargin,
        hatFix,
        noLipSync,
        keepSourceOutfit,
        motionSize,
        keepSourceAudio,
        applyColorFix: applyColorFixOnRender,
      });
      if (!res.ok) {
        setSubmitting(false);
        setError(res.error);
        return;
      }
      onCreated(res.job);
      if (res.job.targetVideoId) {
        router.push(folderVideoPath(undefined, res.job.targetVideoId));
        return;
      }
      setSubmitting(false);
    } catch {
      setSubmitting(false);
      setError(isEn ? "Failed to start Scro Swap." : "啟動 Scro Swap 失敗，請重試");
    }
  }

  return (
    <>
      <DialogBackdrop
        className="grid place-items-center bg-accent-ink/50 p-3 backdrop-blur-xs sm:p-6"
        onClick={submitting ? undefined : onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(ev) => ev.stopPropagation()}
          className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 border-accent-ink bg-white shadow-[8px_8px_0_0_#12141c]"
        >
          {/* Dialog Header */}
          <div className="flex items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
                  Scro Swap
                </span>
                <h2 id={titleId} className="font-display text-lg font-bold">
                  {isEn ? "New Character Motion Swap" : "新增角色動作遷移"}
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {isEn
                  ? "Upload a reference video, pick a character and outfit look, then click Generate."
                  : "上傳參考短片，揀選角色與造型（Preset／歷史造型／自訂穿搭），再按 Generate。"}
              </p>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              aria-label={isEn ? "Close dialog" : "關閉視窗"}
              className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-accent-ink/15 text-base font-bold text-muted transition hover:border-accent-ink hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              ×
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {/* Step 1: Source Media (Video / GIF / Image) */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm font-bold">
                  {isEn
                    ? "1. Source Media (Video / GIF / Image)"
                    : "1. 上傳來源媒體（影片 / GIF / 圖片）"}
                </span>
                <BrandUploadButton
                  label={
                    sourceVideoUrl
                      ? isEn
                        ? "Replace Media"
                        : "更換媒體"
                      : isEn
                        ? "Upload Video / GIF / Image"
                        : "上傳影片 / GIF / 圖片"
                  }
                  accept="video/mp4,video/quicktime,image/gif,image/png,image/jpeg,image/webp"
                  disabled={submitting}
                  onUploaded={(asset) => {
                    const kind = inferClientSourceMediaKind(asset.url);
                    setDetectedPeople([]);
                    setPersonAssignments({});
                    setSourceMediaKind(kind);
                    setSourceVideoUrl(asset.url);
                    setError("");
                  }}
                  onProgress={setSourceUploadProgress}
                  onError={setError}
                />
              </div>

              {sourceVideoUrl ? (
                <div className="space-y-3">
                  <div
                    className={`grid gap-4 rounded-xl border border-accent-ink/12 bg-paper/70 p-3 ${
                      sourceMediaKind === "video" ? "sm:grid-cols-[1fr_14rem]" : ""
                    }`}
                  >
                    <div className="relative max-h-52 w-full overflow-hidden rounded-lg bg-black">
                      {sourceMediaKind === "video" ? (
                        <video
                          ref={videoRef}
                          src={sourceVideoUrl}
                          controls
                          playsInline
                          crossOrigin="anonymous"
                          onLoadedMetadata={(e) => {
                            const dur = e.currentTarget.duration;
                            if (!Number.isFinite(dur) || dur <= 0) return;
                            setSectionStart(0);
                            setSectionLength(Math.min(15, Math.max(2, Math.round(dur))));
                          }}
                          className="max-h-52 w-full rounded-lg bg-black object-contain"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          ref={imageRef}
                          src={sourceVideoUrl}
                          alt=""
                          crossOrigin="anonymous"
                          className="max-h-52 w-full rounded-lg bg-black object-contain"
                        />
                      )}
                      <JutsuPersonRleOverlay
                        people={detectedPeople}
                        activePersonIndex={activePersonIndex}
                        assignments={personAssignments}
                        onSelectPerson={switchActivePerson}
                        isEn={isEn}
                      />
                    </div>
                    {sourceMediaKind === "video" ? (
                      <div className="flex flex-col justify-center gap-3">
                        <label className="block">
                          <span className="text-[11px] font-semibold text-muted">
                            {isEn ? "Starts at (sec)" : "起始秒數 Starts at (s)"}
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={300}
                            step={0.5}
                            disabled={submitting}
                            value={sectionStart}
                            onChange={(e) => setSectionStart(Math.max(0, Number(e.target.value)))}
                            className="mt-1 h-9 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-semibold text-muted">
                            {isEn ? "Clip Length (2–15s)" : "截取長度 Length (2–15秒)"}
                          </span>
                          <input
                            type="number"
                            min={2}
                            max={15}
                            step={1}
                            disabled={submitting}
                            value={sectionLength}
                            onChange={(e) =>
                              setSectionLength(Math.min(15, Math.max(2, Number(e.target.value))))
                            }
                            className="mt-1 h-9 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>

                  <JutsuPersonTabsBar
                    people={detectedPeople}
                    detecting={detectingPeople}
                    activePersonIndex={activePersonIndex}
                    assignments={personAssignments}
                    onSelectPerson={switchActivePerson}
                    onRedetect={() => void runFramePeopleDetection()}
                    disabled={submitting}
                    isEn={isEn}
                  />
                </div>
              ) : (
                <BrandUploadDropzone
                  accept="video/mp4,video/quicktime,image/gif,image/png,image/jpeg,image/webp"
                  disabled={submitting}
                  externalProgress={sourceUploadProgress}
                  hintText={
                    isEn
                      ? "Click or drag & drop a Video (MP4/MOV), animated GIF, or Image (PNG/JPG/WebP) here"
                      : "點擊或拖曳上傳參考短片 (MP4/MOV)、動態 GIF 或圖片 (PNG/JPG/WebP)"
                  }
                  subHintText={
                    isEn
                      ? "Up to 50MB for Video / GIF · up to 5MB for Image"
                      : "影片與 GIF 最高 50MB · 靜態圖片最高 5MB"
                  }
                  onUploaded={(asset) => {
                    const kind = inferClientSourceMediaKind(asset.url);
                    setDetectedPeople([]);
                    setPersonAssignments({});
                    setSourceMediaKind(kind);
                    setSourceVideoUrl(asset.url);
                    setError("");
                  }}
                  onProgress={setSourceUploadProgress}
                  onError={setError}
                />
              )}
            </section>

            {/* Step 2: Two-Layer Character & Outfit Picker */}
            <section className="space-y-4 border-t border-accent-ink/10 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm font-bold">
                  {detectedPeople.length > 0
                    ? isEn
                      ? `2. Assign Character for Person #${activePersonIndex}`
                      : `2. 為「人物 #${activePersonIndex}」選擇替換角色`
                    : isEn
                      ? "2. Select Character"
                      : "2. 選擇角色"}
                </span>
                <div className="flex items-center gap-2">
                  <BrandUploadButton
                    label={isEn ? "Upload Custom Photo" : "上傳自訂人物相"}
                    accept="image/png,image/jpeg,image/webp"
                    disabled={submitting}
                    onUploaded={(asset) => {
                      if (asset.kind === "image") {
                        setUploadedPhotoUrl(asset.url);
                        updateActivePersonSlot({
                          keepOriginal: false,
                          uploadedPhotoUrl: asset.url,
                        });
                      }
                    }}
                    onError={setError}
                  />
                  {uploadedPhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedPhotoUrl("");
                        updateActivePersonSlot({ uploadedPhotoUrl: "" });
                      }}
                      className="cursor-pointer text-xs font-semibold text-red-600"
                    >
                      {isEn ? "Clear photo" : "清除相片"}
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Layer 1: Character avatar strip (image-only tile buttons, not pills) */}
              {characters.length > 0 || detectedPeople.length > 0 ? (
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-7">
                  {detectedPeople.length > 0 ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={selectKeepOriginalForActivePerson}
                      className={`group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-xl border p-2 text-center transition ${
                        activePersonKeepOriginal
                          ? "border-2 border-accent-ink bg-accent-ink text-lime ring-2 ring-lime"
                          : "border-accent-ink/15 bg-paper/70 text-muted hover:border-accent-ink/45 hover:text-foreground"
                      }`}
                    >
                      <span className="text-base font-bold">⊘</span>
                      <span className="mt-1 text-[10px] font-bold leading-tight">
                        {isEn ? "Keep Original" : "保留原人物"}
                      </span>
                    </button>
                  ) : null}
                  {characters.map((char) => {
                    const active =
                      !activePersonKeepOriginal &&
                      characterId === char.id &&
                      !uploadedPhotoUrl;
                    const avatar = characterAvatarUrl(char);
                    return (
                      <button
                        key={char.id}
                        type="button"
                        disabled={submitting}
                        title={char.name}
                        aria-label={char.name}
                        aria-pressed={active}
                        onClick={() => selectCharacter(char)}
                        className={`style-option group relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                          active
                            ? "border-2 border-accent-ink ring-2 ring-lime"
                            : "border-accent-ink/15 hover:border-accent-ink/45"
                        }`}
                      >
                        {avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatar}
                            alt={char.name}
                            className="h-full w-full object-cover object-top"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-zinc-200 text-xs font-bold text-zinc-600">
                            {char.name.slice(0, 2)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* Layer 2: Selected Character's Presets / Historical / Customize Outfit */}
              {activePersonKeepOriginal ? (
                <div className="rounded-xl border border-accent-ink/15 bg-paper/65 p-3 text-xs text-muted">
                  {isEn
                    ? `Person #${activePersonIndex} will stay unchanged in the output video. Click any character above to swap this person.`
                    : `人物 #${activePersonIndex} 將保留原片樣貌與衣服唔變。點選上方任何角色即可替換呢位人物。`}
                </div>
              ) : uploadedPhotoUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-accent-ink/15 bg-paper/70 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedPhotoUrl}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-foreground">
                      {isEn ? "Custom character photo selected" : "已選用自訂上傳人物相片"}
                    </p>
                    <p className="mt-0.5 text-muted">
                      {isEn
                        ? "Click any character above to switch back to character presets & history."
                        : "點選上方任何角色即可切回角色 Preset 與歷史造型。"}
                    </p>
                  </div>
                </div>
              ) : activeCharacter ? (
                <div className="space-y-3 rounded-2xl border border-accent-ink/15 bg-paper/65 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={lookTab === "presets"}
                        onClick={() => setLookTab("presets")}
                        className={`min-h-[36px] cursor-pointer rounded-full px-3.5 text-xs font-bold transition ${
                          lookTab === "presets"
                            ? "bg-accent-ink text-lime"
                            : "border border-accent-ink/15 bg-white text-muted hover:text-foreground"
                        }`}
                      >
                        {isEn
                          ? `Presets (${1 + savedPresets.length})`
                          : `預設造型 Presets (${1 + savedPresets.length})`}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={lookTab === "historical"}
                        onClick={() => setLookTab("historical")}
                        className={`min-h-[36px] cursor-pointer rounded-full px-3.5 text-xs font-bold transition ${
                          lookTab === "historical"
                            ? "bg-accent-ink text-lime"
                            : "border border-accent-ink/15 bg-white text-muted hover:text-foreground"
                        }`}
                      >
                        {isEn
                          ? `Historical (${completedVersions.length})`
                          : `歷史造型 Historical (${completedVersions.length})`}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setManagingCharacter(true)}
                      className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink bg-lime/60 px-3.5 text-xs font-bold text-accent-ink transition hover:bg-lime"
                    >
                      <span>{isEn ? "+ Customize Outfit" : "+ 自訂穿搭 Customize Outfit"}</span>
                    </button>
                  </div>

                  {lookTab === "presets" ? (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                      {/* Default preset card */}
                      {(() => {
                        const defUrl = defaultCharacterLookUrl(activeCharacter);
                        const active = selectedLookKey === "default";
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLookKey("default");
                              setSelectedLookUrl(defUrl);
                              updateActivePersonSlot({
                                keepOriginal: false,
                                lookTab: "presets",
                                selectedLookKey: "default",
                                selectedLookUrl: defUrl,
                                lookLabel: isEn ? "Default Look" : "預設造型",
                                uploadedPhotoUrl: "",
                              });
                            }}
                            className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border p-1.5 text-left transition ${
                              active
                                ? "border-2 border-accent-ink bg-white ring-2 ring-lime"
                                : "border-accent-ink/12 bg-white hover:border-accent-ink/35"
                            }`}
                          >
                            {defUrl ? (
                              <LookCardImage src={defUrl} alt={activeCharacter.name} />
                            ) : null}
                            <span className="mt-1.5 truncate text-[11px] font-bold">
                              {isEn ? "Default Look" : "預設造型"}
                            </span>
                            <span className="text-[10px] text-muted">
                              {activeCharacter.name}
                            </span>
                          </button>
                        );
                      })()}

                      {savedPresets.map((preset) => {
                        const url = presetImageUrl(preset, activeCharacter);
                        const key = `preset:${preset.id}`;
                        const active = selectedLookKey === key;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setSelectedLookKey(key);
                              setSelectedLookUrl(url);
                              updateActivePersonSlot({
                                keepOriginal: false,
                                lookTab: "presets",
                                selectedLookKey: key,
                                selectedLookUrl: url,
                                lookLabel: preset.name,
                                uploadedPhotoUrl: "",
                              });
                            }}
                            className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border p-1.5 text-left transition ${
                              active
                                ? "border-2 border-accent-ink bg-white ring-2 ring-lime"
                                : "border-accent-ink/12 bg-white hover:border-accent-ink/35"
                            }`}
                          >
                            <LookCardImage src={url} alt={preset.name} />
                            <span className="mt-1.5 truncate text-[11px] font-bold">
                              {preset.name}
                            </span>
                            <span className="truncate text-[10px] text-muted">
                              v{preset.versionNumber}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                      {completedVersions.map((ver) => {
                        const url = versionImageUrl(ver);
                        const key = `ver:${ver.id}`;
                        const active = selectedLookKey === key;
                        const label = ver.editInstruction
                          ? ver.editInstruction
                              .replace(/\s*Isolated wardrobe piece [\w-]+\.?/gi, "")
                              .slice(0, 26)
                          : isEn
                            ? `Version #${ver.number}`
                            : `造型 #${ver.number}`;
                        return (
                          <button
                            key={ver.id}
                            type="button"
                            onClick={() => {
                              setSelectedLookKey(key);
                              setSelectedLookUrl(url);
                              updateActivePersonSlot({
                                keepOriginal: false,
                                lookTab: "historical",
                                selectedLookKey: key,
                                selectedLookUrl: url,
                                lookLabel: label,
                                uploadedPhotoUrl: "",
                              });
                            }}
                            className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border p-1.5 text-left transition ${
                              active
                                ? "border-2 border-accent-ink bg-white ring-2 ring-lime"
                                : "border-accent-ink/12 bg-white hover:border-accent-ink/35"
                            }`}
                          >
                            <LookCardImage src={url} alt={label} />
                            <span className="mt-1.5 truncate text-[11px] font-bold">
                              {label}
                            </span>
                            <span className="text-[10px] text-muted">
                              v{ver.number} · {new Date(ver.createdAt).toLocaleDateString()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            {/* Optional Relight & Render Settings */}
            <details className="rounded-2xl border border-accent-ink/12 bg-paper/60 p-4">
              <summary className="cursor-pointer font-display text-xs font-bold text-foreground">
                {isEn
                  ? "Advanced: Relight & Motion Settings"
                  : "進階設定：打光 Relight 與遮罩參數"}
              </summary>
              <div className="mt-4 space-y-4">
                <JutsuRelightPicker
                  enabled={relightEnabled}
                  onEnabledChange={setRelightEnabled}
                  selectedId={relightId}
                  onSelectId={setRelightId}
                  customPrompt={customLightPrompt}
                  onCustomPromptChange={setCustomLightPrompt}
                  disabled={submitting}
                />

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-muted">
                      {isEn ? "Mask Margin" : "遮罩邊距 Mask Margin"}
                    </span>
                    <select
                      value={maskMargin}
                      disabled={submitting}
                      onChange={(e) =>
                        setMaskMargin(e.target.value as "tight" | "normal" | "loose")
                      }
                      className="mt-1 h-8 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                    >
                      <option value="tight">Tight (20 px)</option>
                      <option value="normal">Normal (40 px)</option>
                      <option value="loose">Loose (60 px)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-semibold text-muted">
                      {isEn ? "Motion Resolution" : "動作參考解析度"}
                    </span>
                    <select
                      value={motionSize}
                      disabled={submitting}
                      onChange={(e) =>
                        setMotionSize(Number(e.target.value) as 512 | 768 | 1376)
                      }
                      className="mt-1 h-8 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                    >
                      <option value={512}>512 px (Default)</option>
                      <option value={768}>768 px (High Precision)</option>
                      <option value={1376}>1376 px (Max Detail)</option>
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={keepSourceOutfit}
                      disabled={submitting}
                      onChange={(e) => setKeepSourceOutfit(e.target.checked)}
                      className="h-4 w-4 rounded accent-accent-ink"
                    />
                    <span>
                      {isEn
                        ? "Keep source outfit (head swap only)"
                        : "保留原片穿搭（只換人樣與髮型）"}
                    </span>
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={hatFix}
                      disabled={submitting}
                      onChange={(e) => setHatFix(e.target.checked)}
                      className="h-4 w-4 rounded accent-accent-ink"
                    />
                    <span>{isEn ? "Hat fix" : "帽子修復 Hat Fix"}</span>
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={noLipSync}
                      disabled={submitting}
                      onChange={(e) => setNoLipSync(e.target.checked)}
                      className="h-4 w-4 rounded accent-accent-ink"
                    />
                    <span>{isEn ? "No lip-sync" : "關閉對嘴 No Lip-Sync"}</span>
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={keepSourceAudio}
                      disabled={submitting}
                      onChange={(e) => setKeepSourceAudio(e.target.checked)}
                      className="h-4 w-4 rounded accent-accent-ink"
                    />
                    <span>{isEn ? "Keep source audio" : "保留原片音軌"}</span>
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={applyColorFixOnRender}
                      disabled={submitting}
                      onChange={(e) => setApplyColorFixOnRender(e.target.checked)}
                      className="h-4 w-4 rounded accent-accent-ink"
                    />
                    <span>{isEn ? "H3 Soft Color Fix" : "套用 H3 Soft 調色"}</span>
                  </label>
                </div>
              </div>
            </details>

            {error ? (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
              >
                {error}
              </p>
            ) : null}
          </div>

          {/* Dialog Footer */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-accent-ink/10 bg-paper/80 px-6 py-4">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-xs font-bold text-muted transition hover:text-foreground"
            >
              {isEn ? "Cancel" : "取消"}
            </button>
            <button
              type="button"
              disabled={!sourceVideoUrl || submitting}
              onClick={() => void onSubmit()}
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Spinner className="h-4 w-4" /> : null}
              <span>
                {submitting
                  ? isEn
                    ? "Starting Background Task…"
                    : "正在啟動背景任務…"
                  : isEn
                    ? "Generate"
                    : "Generate 立即生成"}
              </span>
            </button>
          </div>
        </div>
      </DialogBackdrop>

      {managingCharacter && activeCharacter ? (
        <CharacterManageDialog
          character={activeCharacter}
          onCharacterUpdated={onCharacterUpdated}
          onSelectAndClose={handleCustomizedLook}
          onClose={() => setManagingCharacter(false)}
        />
      ) : null}
    </>
  );
}
