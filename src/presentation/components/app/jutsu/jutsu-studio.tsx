"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { put } from "@vercel/blob/client";
import type { PublicCustomWardrobeItem } from "@/model/custom-wardrobe-item";
import type {
  JutsuPersonMapping,
  JutsuSourceMediaKind,
  PublicJutsuJob,
} from "@/model/jutsu-job";
import { prepareBrandUploadAction } from "@/presentation/actions/brand-upload";
import {
  deleteJutsuJobAction,
  detectJutsuPeopleAction,
  pollJutsuJobStatusAction,
  startScroSwapJobAction,
} from "@/presentation/actions/jutsu";
import {
  cycleOption,
  DirectorDockHero,
  DirectorDockPanel,
  DirectorDockStage,
  DirectorDockStepperCell,
} from "@/presentation/components/app/director-dock";
import {
  captureImageElementDataUrl,
  captureVideoFrameDataUrl,
  JutsuPersonRleOverlay,
  JutsuPersonTabsBar,
  type JutsuPersonSlotAssignment,
} from "@/presentation/components/app/jutsu/jutsu-person-rle-mapper";
import { ClipRangeTimelineSelector } from "@/presentation/components/app/jutsu/clip-range-timeline-selector";
import { JutsuRelightPicker } from "@/presentation/components/app/jutsu/jutsu-relight-picker";
import { AddCharacterStyleDialog } from "@/presentation/components/app/characters/[id]/add-character-style-dialog";
import { LookCardImage } from "@/presentation/components/app/jutsu/look-card-image";
import { ScroSwapHistoryDialog } from "@/presentation/components/app/jutsu/scro-swap-history-dialog";
import { CharacterManageDialog } from "@/presentation/components/app/projects/[id]/character-manage-dialog";
import { InlineCreateCharacterDialog } from "@/presentation/components/app/projects/[id]/inline-create-character-dialog";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
  PublicStyle,
} from "@/presentation/serialize";
import type { CharacterPresetSelection } from "@/service/character/character-presets";
import type { DetectedSourcePerson } from "@/service/fal/sam3-image";
import { folderVideoPath } from "@/service/folder-video-path";
import { STYLES } from "@/service/style/catalog";
import { checkBrandUpload, resolveBrandContentType } from "@/service/video-edit/edit-state";
import { translateAppError } from "@/util/i18n/translate-app-error";

const JUTSU_PUBLIC_STYLES: PublicStyle[] = STYLES.map((s) => ({
  id: s.id,
  name: s.name,
  description: s.description,
  canvasColor: s.canvasColor,
  previewUrl: s.previewUrl,
  isCustom: false,
}));

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

export function JutsuStudio({
  characters: initialCharacters,
  initialJobs,
}: {
  characters: PublicCharacter[];
  customWardrobeItems?: PublicCustomWardrobeItem[];
  initialJobs: PublicJutsuJob[];
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const historyLabel =
    locale === "zh-Hant"
      ? "歷史紀錄"
      : locale === "zh-Hans"
        ? "历史记录"
        : "History";

  const [characters, setCharacters] = useState<PublicCharacter[]>(initialCharacters);
  const [jobs, setJobs] = useState<PublicJutsuJob[]>(initialJobs);
  const [activeJob, setActiveJob] = useState<PublicJutsuJob | null>(
    initialJobs[0] ?? null,
  );
  const [historyOpen, setHistoryOpen] = useState(false);

  // Creation form state
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [sourceMediaKind, setSourceMediaKind] = useState<JutsuSourceMediaKind>("video");
  const [sourceUploadProgress, setSourceUploadProgress] = useState<number | null>(null);
  const [sourceDuration, setSourceDuration] = useState(15);
  const [sectionStart, setSectionStart] = useState(0);
  const [sectionLength, setSectionLength] = useState(6);
  const trimVideoRef = useRef<HTMLVideoElement>(null);

  const [characterId, setCharacterId] = useState<string>(
    initialCharacters[0]?.id ?? "",
  );
  const [lookTab, setLookTab] = useState<LookTab>("presets");
  const [selectedLookUrl, setSelectedLookUrl] = useState<string>(() =>
    defaultCharacterLookUrl(initialCharacters[0]),
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

  // Advanced options (default maskMargin="normal", noLipSync=false)
  const [relightEnabled, setRelightEnabled] = useState(false);
  const [relightId, setRelightId] = useState("golden_halo");
  const [customLightPrompt, setCustomLightPrompt] = useState("");
  const maskMargin = "normal" as const;
  const hatFix = false;
  const noLipSync = false;
  const [motionSize, setMotionSize] = useState<512 | 768 | 1376>(512);
  const [applyColorFixOnRender, setApplyColorFixOnRender] = useState(true);
  const [keepSourceAudio, setKeepSourceAudio] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [charModalOpen, setCharModalOpen] = useState(false);
  const [createCharOpen, setCreateCharOpen] = useState(false);
  const [addStyleOpen, setAddStyleOpen] = useState(false);
  const [relightModalOpen, setRelightModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sourceDragOver, setSourceDragOver] = useState(false);
  const [charDragOver, setCharDragOver] = useState(false);
  const [charUploading, setCharUploading] = useState(false);
  const sourceInputRef = useRef<HTMLInputElement>(null);

  async function uploadDirectBlob(
    file: File,
    allowGif: boolean,
    onProgress?: (pct: number | null) => void,
  ): Promise<{ url: string; kind: "image" | "video" } | null> {
    const contentType = resolveBrandContentType(file);
    const checked = checkBrandUpload({ type: contentType, size: file.size }, { allowGif });
    if (!checked.ok) {
      setError(translateAppError(checked.error, t));
      return null;
    }
    onProgress?.(0);
    try {
      const prepared = await prepareBrandUploadAction({
        contentType,
        size: file.size,
        allowGif,
      });
      if (!prepared.ok) {
        setError(translateAppError(prepared.error, t));
        return null;
      }
      const blob = await put(prepared.pathname, file, {
        access: "public",
        token: prepared.token,
        contentType: prepared.contentType,
        multipart: file.size > 8 * 1024 * 1024,
        onUploadProgress: ({ percentage }) =>
          onProgress?.(Math.min(100, Math.round(percentage))),
      });
      return { url: blob.url, kind: prepared.kind };
    } catch {
      setError(t("errors.uploadFailed"));
      return null;
    } finally {
      onProgress?.(null);
    }
  }

  async function handleSourceFile(file: File | undefined) {
    if (!file || submitting) return;
    setError("");
    const uploaded = await uploadDirectBlob(file, true, setSourceUploadProgress);
    if (!uploaded) return;
    const kind = inferClientSourceMediaKind(uploaded.url);
    setDetectedPeople([]);
    setPersonAssignments({});
    setSourceMediaKind(kind);
    setSourceVideoUrl(uploaded.url);
    if (kind === "video" || kind === "gif") {
      setSectionModalOpen(true);
    }
  }

  async function handleCharacterFile(file: File | undefined) {
    if (!file || submitting) return;
    setError("");
    setCharUploading(true);
    try {
      const uploaded = await uploadDirectBlob(file, false);
      if (uploaded && uploaded.kind === "image") {
        setUploadedPhotoUrl(uploaded.url);
        updateActivePersonSlot({
          keepOriginal: false,
          uploadedPhotoUrl: uploaded.url,
        });
      }
    } finally {
      setCharUploading(false);
    }
  }

  const handleCharacterUpdated = useCallback((next: PublicCharacter) => {
    setCharacters((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    // When the active character generates a new outfit version and `selectedLookKey === "default"`,
    // sync `selectedLookUrl` to the updated default look so clicking Generate uses the new outfit.
    setSelectedLookUrl((prevUrl) => {
      if (characterId === next.id && selectedLookKey === "default") {
        return defaultCharacterLookUrl(next) || prevUrl;
      }
      return prevUrl;
    });
  }, [characterId, selectedLookKey]);

  // Poll any in-flight job automatically and keep history updated.
  useEffect(() => {
    const runningIds = jobs
      .filter((item) => item.status === "rendering")
      .map((item) => item.id);
    if (runningIds.length === 0) return;

    const timer = window.setInterval(async () => {
      for (const id of runningIds) {
        const res = await pollJutsuJobStatusAction(id);
        if (!res.ok) continue;
        setJobs((prev) =>
          prev.map((item) => (item.id === res.job.id ? res.job : item)),
        );
        setActiveJob((prev) => (prev?.id === res.job.id ? res.job : prev));
        if (res.job.status === "completed" || res.job.status === "failed") {
          notifyTasksChanged();
        }
      }
    }, 4500);

    return () => window.clearInterval(timer);
  }, [jobs]);

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

  // Debounced auto-detection 800ms after `sourceVideoUrl` loads or `sectionStart` changes.
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
    const defUrl = defaultCharacterLookUrl(char);
    setCharacterId(char.id);
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
        motionSize,
        keepSourceAudio,
        applyColorFix: applyColorFixOnRender,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setActiveJob(res.job);
      setJobs((prev) => [
        res.job,
        ...prev.filter((item) => item.id !== res.job.id),
      ]);
      notifyTasksChanged();
      if (res.job.targetVideoId) {
        router.push(folderVideoPath(undefined, res.job.targetVideoId));
        return;
      }
      if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
        setHistoryOpen(true);
      }
    } catch {
      setError(isEn ? "Failed to start Scro Swap." : "啟動 Scro Swap 失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteJob(id: string) {
    const res = await deleteJutsuJobAction(id);
    if (res.ok) {
      const remaining = jobs.filter((j) => j.id !== id);
      setJobs(remaining);
      if (activeJob?.id === id) {
        setActiveJob(remaining[0] ?? null);
      }
      notifyTasksChanged();
    }
  }

  const motionSizes = [512, 768, 1376] as const;
  const activeLookPreviewUrl =
    uploadedPhotoUrl || selectedLookUrl || characterAvatarUrl(activeCharacter);

  return (
    <div className="min-h-[calc(100dvh-4.5rem)] w-full">
      <input
        ref={sourceInputRef}
        type="file"
        accept="video/mp4,video/quicktime,image/gif,image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={submitting}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void handleSourceFile(file);
        }}
      />

      <DirectorDockStage
        topLeft={
          <div className="flex items-center gap-2">
            <span className="rounded-2xl bg-[#12141c] px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wider text-[#c6f24b]">
              Scro Swap
            </span>
            <span className="text-xs font-semibold text-zinc-600">
              {isEn ? "Character Motion Swap" : "角色動作遷移"}
            </span>
          </div>
        }
        topRight={
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="director-dock-cell inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-100 px-3.5 text-xs font-bold text-[#12141c] transition hover:border-zinc-400"
            aria-label={historyLabel}
          >
            <svg
              aria-hidden
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>{historyLabel}</span>
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-2xl bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-700">
              {jobs.length}
            </span>
          </button>
        }
      >
        <DirectorDockHero kind="scroswap" />

        {/* Director Panel — All Swap Settings */}
        <DirectorDockPanel
          headerRight={
            activeCharacter ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setManagingCharacter(true)}
                className="director-dock-cell cursor-pointer rounded-2xl bg-[#12141c] px-2.5 py-0.5 text-[11px] font-bold text-[#c6f24b] hover:bg-black"
              >
                {isEn ? "+ Customize Outfit" : "+ 自訂穿搭"}
              </button>
            ) : null
          }
        >
          {/* Setting 1: Cinematic Relight */}
          <DirectorDockStepperCell
            thumbUrl={
              relightEnabled ? `/relight/${relightId}.webp` : "/relight/golden_halo.webp"
            }
            label={isEn ? "Cinematic Relight" : "光影重打 Relight"}
            value={
              relightEnabled
                ? customLightPrompt.trim() || relightId.replace(/_/g, " ")
                : isEn
                  ? "Original Light"
                  : "原片光線"
            }
            disabled={submitting}
            onPrev={() => setRelightModalOpen(true)}
            onNext={() => setRelightModalOpen(true)}
            onClick={() => setRelightModalOpen(true)}
          />

          {/* Setting 2: Motion Resolution */}
          <DirectorDockStepperCell
            icon={
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            }
            label={isEn ? "Motion Quality" : "動作解析度"}
            value={`Scro Swap ${motionSize}p`}
            disabled={submitting}
            onPrev={() => setMotionSize(cycleOption(motionSizes, motionSize, -1))}
            onNext={() => setMotionSize(cycleOption(motionSizes, motionSize, 1))}
            onClick={() => setMotionSize(cycleOption(motionSizes, motionSize, 1))}
          />

          {/* Setting 3: Source Audio */}
          <DirectorDockStepperCell
            icon={
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            }
            label={isEn ? "Source Audio" : "原片音訊"}
            value={
              keepSourceAudio
                ? isEn
                  ? "Audio: ON"
                  : "保留原聲: 開"
                : isEn
                  ? "Audio: OFF"
                  : "保留原聲: 關"
            }
            disabled={submitting}
            onPrev={() => setKeepSourceAudio((prev) => !prev)}
            onNext={() => setKeepSourceAudio((prev) => !prev)}
            onClick={() => setKeepSourceAudio((prev) => !prev)}
          />

          {/* Setting 4: H3 Color Fix */}
          <DirectorDockStepperCell
            icon={
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            }
            label={isEn ? "Color Grading" : "H3 智慧調色"}
            value={
              applyColorFixOnRender
                ? isEn
                  ? "Color Fix: ON"
                  : "H3 調色: 開"
                : isEn
                  ? "Color Fix: OFF"
                  : "H3 調色: 關"
            }
            disabled={submitting}
            onPrev={() => setApplyColorFixOnRender((prev) => !prev)}
            onNext={() => setApplyColorFixOnRender((prev) => !prev)}
            onClick={() => setApplyColorFixOnRender((prev) => !prev)}
          />
        </DirectorDockPanel>

        {/* Main Drag & Drop Workbench: Source Video + Character + Generate Button */}
        <div className="mt-3 flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[0_12px_36px_rgba(18,20,28,0.07)]">
          <div className="flex flex-col items-stretch gap-3 md:flex-row">
            {/* 1. Source Video Drag & Drop Upload / Preview Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!submitting) setSourceDragOver(true);
              }}
              onDragLeave={() => setSourceDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSourceDragOver(false);
                const file = e.dataTransfer.files?.[0];
                void handleSourceFile(file);
              }}
              className={`relative flex min-h-[180px] flex-1 flex-col justify-between overflow-hidden rounded-2xl border-2 border-dashed p-3 transition ${
                sourceDragOver
                  ? "border-[#12141c] bg-[#c6f24b]/15"
                  : sourceVideoUrl
                    ? "border-zinc-200 bg-[#f4f4f5]"
                    : "border-zinc-300 bg-[#f4f4f5] hover:border-zinc-400"
              }`}
            >
              {sourceVideoUrl ? (
                <div className="flex h-full flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#12141c]">
                      {isEn ? "1. Source Video / Media" : "1. 來源影片 / 媒體"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {sourceMediaKind === "video" ? (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setSectionModalOpen(true)}
                          className="cursor-pointer rounded-2xl border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-bold text-[#12141c] hover:border-[#12141c]"
                        >
                          {isEn
                            ? `Trim ${sectionStart}s–${sectionStart + sectionLength}s`
                            : `截取 ${sectionStart}s–${sectionStart + sectionLength}s`}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => sourceInputRef.current?.click()}
                        className="cursor-pointer rounded-2xl border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:border-[#12141c] hover:text-[#12141c]"
                      >
                        {isEn ? "Replace" : "更換"}
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setSourceVideoUrl("");
                          setDetectedPeople([]);
                          setPersonAssignments({});
                        }}
                        className="cursor-pointer rounded-2xl border border-zinc-300 bg-white px-2 py-1 text-[11px] font-bold text-zinc-500 hover:text-red-600"
                        aria-label="Clear source media"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="relative mx-auto max-h-48 w-full overflow-hidden rounded-2xl bg-black">
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
                          setSourceDuration(Math.max(2, Math.round(dur * 10) / 10));
                          setSectionStart(0);
                          setSectionLength(
                            Math.min(15, Math.max(2, Math.round(dur))),
                          );
                        }}
                        className="max-h-48 w-full rounded-2xl bg-black object-contain"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        ref={imageRef}
                        src={sourceVideoUrl}
                        alt=""
                        crossOrigin="anonymous"
                        className="max-h-48 w-full rounded-2xl bg-black object-contain"
                      />
                    )}
                    <JutsuPersonRleOverlay
                      people={detectedPeople}
                      activePersonIndex={activePersonIndex}
                      assignments={personAssignments}
                      onSelectPerson={(idx) => {
                        switchActivePerson(idx);
                        setCharModalOpen(true);
                      }}
                      isEn={isEn}
                    />
                  </div>

                  <JutsuPersonTabsBar
                    people={detectedPeople}
                    detecting={detectingPeople}
                    activePersonIndex={activePersonIndex}
                    assignments={personAssignments}
                    onSelectPerson={(idx) => {
                      switchActivePerson(idx);
                      setCharModalOpen(true);
                    }}
                    onRedetect={() => void runFramePeopleDetection()}
                    disabled={submitting}
                    isEn={isEn}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting || sourceUploadProgress !== null}
                  onClick={() => sourceInputRef.current?.click()}
                  className="flex h-full min-h-[156px] w-full cursor-pointer flex-col items-center justify-center gap-2 text-center disabled:cursor-not-allowed"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-[#12141c] shadow-2xs">
                    {sourceUploadProgress !== null ? (
                      <Spinner className="h-5 w-5" />
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#12141c]">
                      {sourceUploadProgress !== null
                        ? isEn
                          ? `Uploading ${sourceUploadProgress}%...`
                          : `上傳中 ${sourceUploadProgress}%...`
                        : isEn
                          ? "Drop Source Video / GIF / Image here"
                          : "拖放或點擊上傳來源影片 / GIF / 圖片"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {isEn
                        ? "MP4, MOV, GIF, PNG, JPG · Auto-detects people in frame"
                        : "支援 MP4、MOV、GIF、圖片 · 自動偵測畫面人物"}
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* 2. Target Character Card (Click to choose AI Influencer or Drag & Drop custom character photo) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!submitting) setCharDragOver(true);
              }}
              onDragLeave={() => setCharDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setCharDragOver(false);
                const file = e.dataTransfer.files?.[0];
                void handleCharacterFile(file);
              }}
              className={`relative flex min-h-[180px] w-full flex-col justify-between overflow-hidden rounded-2xl border-2 p-3 transition md:w-56 ${
                charDragOver
                  ? "border-[#12141c] bg-[#c6f24b]/15"
                  : "border-zinc-200 bg-[#f4f4f5] hover:border-zinc-400"
              }`}
            >
              <button
                type="button"
                disabled={submitting || charUploading}
                onClick={() => setCharModalOpen(true)}
                className="group flex h-full w-full cursor-pointer flex-col justify-between text-left"
              >
                <div className="flex w-full items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-[#12141c]">
                    {isEn ? "2. Character" : "2. 替換角色"}
                  </span>
                  <span className="rounded-2xl bg-white px-2 py-0.5 text-[10px] font-bold text-zinc-700 shadow-2xs">
                    {charUploading
                      ? isEn
                        ? "Uploading..."
                        : "上傳中..."
                      : uploadedPhotoUrl
                        ? isEn
                          ? "Custom"
                          : "自訂照片"
                        : activeCharacter?.name || (isEn ? "Pick" : "選擇")}
                  </span>
                </div>

                {activeLookPreviewUrl ? (
                  <div className="relative my-2 h-28 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeLookPreviewUrl}
                      alt={activeCharacter?.name || "Character"}
                      className="h-full w-full object-cover object-top transition duration-200 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="my-2 flex h-28 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white text-xs text-zinc-400">
                    {isEn ? "Select or drop photo" : "點擊選擇或拖放照片"}
                  </div>
                )}

                <span className="block truncate text-[11px] font-semibold text-zinc-500">
                  {isEn
                    ? "Click to change or drop photo"
                    : "點擊切換角色造型或拖放照片"}
                </span>
              </button>
            </div>

            {/* 3. Generate Button */}
            <button
              type="button"
              disabled={!sourceVideoUrl || submitting}
              onClick={() => void onSubmit()}
              className="director-dock-generate flex min-h-[120px] w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-[#c6f24b] px-5 py-4 font-display text-sm font-extrabold text-[#12141c] transition duration-200 hover:bg-[#b6e23a] disabled:cursor-not-allowed disabled:opacity-45 md:w-36"
            >
              {submitting ? (
                <Spinner className="h-5 w-5 text-[#12141c]" />
              ) : (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 14-7-4 14-3-5-7-2z" />
                </svg>
              )}
              <span className="text-base font-extrabold tracking-tight">
                {submitting
                  ? isEn
                    ? "Starting..."
                    : "啟動中..."
                  : isEn
                    ? "Generate"
                    : "生成"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-2xl bg-[#12141c]/10 px-2.5 py-0.5 text-xs font-bold text-[#12141c]">
                <svg
                  aria-hidden="true"
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                </svg>
                <span>2K</span>
              </span>
            </button>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
            >
              {error}
            </p>
          ) : null}
        </div>
      </DirectorDockStage>

      {/* Character & Outfit Selection Modal */}
      {charModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setCharModalOpen(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold">
                {detectedPeople.length > 0
                  ? isEn
                    ? `Assign Character for Person #${activePersonIndex}`
                    : `為「人物 #${activePersonIndex}」選擇替換角色與造型`
                  : isEn
                    ? "Select Character & Outfit Look"
                    : "選擇替換角色與造型"}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setCreateCharOpen(true)}
                  className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-2xl bg-[#12141c] px-3 text-xs font-bold text-[#c6f24b] hover:bg-black"
                >
                  <span>+</span>
                  <span>{isEn ? "New Character" : "新增角色"}</span>
                </button>
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
                <button
                  type="button"
                  onClick={() => setCharModalOpen(false)}
                  className="cursor-pointer rounded-2xl px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </div>

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
                      onClick={() => selectCharacter(char)}
                      className={`style-option group relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl border transition ${
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

            {activeCharacter && !activePersonKeepOriginal && !uploadedPhotoUrl ? (
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

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setAddStyleOpen(true)}
                      className="inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-2xl border border-zinc-300 bg-white px-3 text-xs font-bold text-[#12141c] hover:border-[#12141c]"
                    >
                      <span>+</span>
                      <span>{isEn ? "Add Style" : "新增風格"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setCharModalOpen(false);
                        setManagingCharacter(true);
                      }}
                      className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-2xl border border-accent-ink bg-lime/60 px-3.5 text-xs font-bold text-accent-ink transition hover:bg-lime"
                    >
                      <span>
                        {isEn ? "+ Customize Outfit" : "+ 自訂穿搭"}
                      </span>
                    </button>
                  </div>
                </div>

                {lookTab === "presets" ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
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
                            setCharModalOpen(false);
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
                            setCharModalOpen(false);
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
                            setCharModalOpen(false);
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
                            v{ver.number}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Cinematic Relight Modal */}
      {relightModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setRelightModalOpen(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                {isEn
                  ? "Cinematic Relight"
                  : "電影級重新打光 Cinematic Relight"}
              </h3>
              <button
                type="button"
                onClick={() => setRelightModalOpen(false)}
                className="cursor-pointer rounded-2xl px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <JutsuRelightPicker
              enabled={relightEnabled}
              onEnabledChange={setRelightEnabled}
              selectedId={relightId}
              onSelectId={setRelightId}
              customPrompt={customLightPrompt}
              onCustomPromptChange={setCustomLightPrompt}
              disabled={submitting}
            />

            <div className="flex items-center justify-end border-t border-accent-ink/10 pt-3">
              <button
                type="button"
                onClick={() => setRelightModalOpen(false)}
                className="cursor-pointer rounded-2xl bg-[#12141c] px-5 py-2 text-xs font-bold text-[#c6f24b] transition hover:bg-black"
              >
                {isEn ? "Done" : "完成"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Interactive Timeline Range Trim Modal */}
      {sectionModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setSectionModalOpen(false)}
        >
          <div
            className="w-full max-w-xl space-y-4 rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold">
                  {isEn
                    ? "Select Clip Range on Timeline"
                    : "時間軸互動截取範圍設定"}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  {isEn
                    ? "Drag the start and end handles to choose a 2s–15s segment."
                    : "拖曳時間軸起點與終點滑桿，選擇要替換角色的 2–15 秒片段。"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSectionModalOpen(false)}
                className="cursor-pointer rounded-2xl px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {sourceVideoUrl && sourceMediaKind === "video" ? (
              <div className="overflow-hidden rounded-2xl bg-black">
                <video
                  ref={trimVideoRef}
                  src={sourceVideoUrl}
                  controls
                  playsInline
                  className="max-h-56 w-full object-contain"
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    if (Number.isFinite(dur) && dur > 0) {
                      setSourceDuration(Math.max(2, Math.round(dur * 10) / 10));
                    }
                    e.currentTarget.currentTime = sectionStart;
                  }}
                />
              </div>
            ) : null}

            {/* Interactive Timeline Bar */}
            <ClipRangeTimelineSelector
              sourceDuration={sourceDuration}
              sectionStart={sectionStart}
              sectionLength={sectionLength}
              disabled={submitting}
              isEn={isEn}
              onChange={({ sectionStart: nextStart, sectionLength: nextLen }) => {
                setSectionStart(nextStart);
                setSectionLength(nextLen);
              }}
              onPreviewTime={(sec) => {
                if (trimVideoRef.current) {
                  trimVideoRef.current.currentTime = sec;
                }
              }}
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSectionModalOpen(false)}
                className="cursor-pointer rounded-2xl bg-[#12141c] px-5 py-2 text-xs font-bold text-[#c6f24b] transition hover:bg-black"
              >
                {isEn ? "Apply Range" : "確認範圍"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ScroSwapHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        jobs={jobs}
        characters={characters}
        activeJobId={activeJob?.id ?? null}
        onSelectJob={setActiveJob}
        onDeleteJob={(id) => void onDeleteJob(id)}
      />

      {createCharOpen ? (
        <InlineCreateCharacterDialog
          styles={JUTSU_PUBLIC_STYLES}
          defaultStyleId="realistic"
          onCreated={(created) => {
            setCharacters((prev) => [created, ...prev]);
            selectCharacter(created);
          }}
          onClose={() => setCreateCharOpen(false)}
        />
      ) : null}

      {addStyleOpen && activeCharacter ? (
        <AddCharacterStyleDialog
          character={activeCharacter}
          styles={JUTSU_PUBLIC_STYLES}
          onClose={() => setAddStyleOpen(false)}
          onAdded={(updated) => {
            handleCharacterUpdated(updated);
            setAddStyleOpen(false);
          }}
          onNeedCredits={() => setAddStyleOpen(false)}
        />
      ) : null}

      {managingCharacter && activeCharacter ? (
        <CharacterManageDialog
          character={activeCharacter}
          onCharacterUpdated={handleCharacterUpdated}
          onSelectAndClose={handleCustomizedLook}
          onClose={() => setManagingCharacter(false)}
        />
      ) : null}
    </div>
  );
}
