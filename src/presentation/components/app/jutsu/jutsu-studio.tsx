"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicCustomWardrobeItem } from "@/model/custom-wardrobe-item";
import type {
  JutsuPersonMapping,
  JutsuSourceMediaKind,
  PublicJutsuJob,
} from "@/model/jutsu-job";
import {
  deleteJutsuJobAction,
  detectJutsuPeopleAction,
  pollJutsuJobStatusAction,
  startScroSwapJobAction,
} from "@/presentation/actions/jutsu";
import {
  buildCastSlotItems,
  cycleOption,
  DirectorDockCastGroup,
  DirectorDockComposer,
  DirectorDockCurveCell,
  DirectorDockDivider,
  DirectorDockDurationCell,
  DirectorDockHero,
  DirectorDockPanel,
  DirectorDockPill,
  DirectorDockQuickTile,
  DirectorDockStage,
  DirectorDockStepperCell,
  resolveCastSlotCount,
} from "@/presentation/components/app/director-dock";
import {
  captureImageElementDataUrl,
  captureVideoFrameDataUrl,
  JutsuPersonRleOverlay,
  JutsuPersonTabsBar,
  type JutsuPersonSlotAssignment,
} from "@/presentation/components/app/jutsu/jutsu-person-rle-mapper";
import { JutsuRelightPicker } from "@/presentation/components/app/jutsu/jutsu-relight-picker";
import { LookCardImage } from "@/presentation/components/app/jutsu/look-card-image";
import { ScroSwapHistoryDialog } from "@/presentation/components/app/jutsu/scro-swap-history-dialog";
import { ScroSwapHistoryPanel } from "@/presentation/components/app/jutsu/scro-swap-history-panel";
import { CharacterManageDialog } from "@/presentation/components/app/projects/[id]/character-manage-dialog";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { useI18n } from "@/presentation/components/i18n-provider";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
} from "@/presentation/serialize";
import type { CharacterPresetSelection } from "@/service/character/character-presets";
import type { DetectedSourcePerson } from "@/service/fal/sam3-image";

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
  const { locale } = useI18n();
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
  const [sectionStart, setSectionStart] = useState(0);
  const [sectionLength, setSectionLength] = useState(6);

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

  // Advanced options
  const [relightEnabled, setRelightEnabled] = useState(false);
  const [relightId, setRelightId] = useState("golden_halo");
  const [customLightPrompt, setCustomLightPrompt] = useState("");
  const [maskMargin, setMaskMargin] = useState<"tight" | "normal" | "loose">("normal");
  const [hatFix, setHatFix] = useState(false);
  const [noLipSync, setNoLipSync] = useState(false);
  const [motionSize, setMotionSize] = useState<512 | 768 | 1376>(512);
  const [applyColorFixOnRender, setApplyColorFixOnRender] = useState(true);
  const [keepSourceAudio, setKeepSourceAudio] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [charModalOpen, setCharModalOpen] = useState(false);
  const [relightModalOpen, setRelightModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);

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
      if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
        setHistoryOpen(true);
      }
      notifyTasksChanged();
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

  const castSlots = buildCastSlotItems(
    activeCharacter ? [activeCharacter.id] : [],
    characters.map((c) => ({
      id: c.id,
      name: c.name,
      previewUrl:
        (c.id === characterId
          ? uploadedPhotoUrl || selectedLookUrl || characterAvatarUrl(c)
          : characterAvatarUrl(c)) || undefined,
    })),
    resolveCastSlotCount("scroswap", 1),
  );

  const maskOptions = ["tight", "normal", "loose"] as const;
  const motionSizes = [512, 768, 1376] as const;

  return (
    <div className="min-h-[calc(100dvh-4.5rem)] w-full">
      <DirectorDockStage
        topLeft={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#d8ff3e] px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wider text-[#111318]">
              Scro Swap
            </span>
            <span className="text-xs font-semibold text-zinc-300">
              {isEn ? "Character Motion Swap" : "角色動作遷移"}
            </span>
          </div>
        }
        topRight={
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="director-dock-cell inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 text-xs font-bold text-zinc-100 transition hover:border-white/30 hover:text-white"
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
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-200">
              {jobs.length}
            </span>
          </button>
        }
        bottomContent={
          jobs.length > 0 ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white p-4 text-[#12141c]">
              <ScroSwapHistoryPanel
                jobs={jobs}
                characters={characters}
                activeJobId={activeJob?.id ?? null}
                onSelectJob={setActiveJob}
                onDeleteJob={(id) => void onDeleteJob(id)}
                layout="sidebar"
              />
            </div>
          ) : null
        }
      >
        <DirectorDockHero kind="scroswap" />

        {/* Collapsible 🎬 導演面板 */}
        <DirectorDockPanel
          headerRight={
            activeCharacter ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setManagingCharacter(true)}
                className="director-dock-cell cursor-pointer rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-semibold text-[#d8ff3e] hover:border-[#d8ff3e]/50"
              >
                {isEn ? "+ Customize Outfit" : "+ 自訂穿搭"}
              </button>
            ) : null
          }
        >
          {/* Cell 1: Target Character & Look */}
          <DirectorDockCastGroup
            slots={castSlots}
            disabled={submitting}
            badgeLabel={activeCharacter?.name || (isEn ? "Character" : "選擇角色")}
            onOpenPicker={() => setCharModalOpen(true)}
            onManageActive={() => setCharModalOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell 2: Relight */}
          <DirectorDockStepperCell
            thumbUrl={
              relightEnabled ? `/relight/${relightId}.webp` : "/relight/golden_halo.webp"
            }
            label={isEn ? "Relight" : "光影重打"}
            value={
              relightEnabled
                ? relightId.replace(/_/g, " ")
                : isEn
                  ? "Original"
                  : "原片光線"
            }
            disabled={submitting}
            onPrev={() => setRelightEnabled((prev) => !prev)}
            onNext={() => setRelightEnabled((prev) => !prev)}
            onClick={() => setRelightModalOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell 3: Motion & Mask */}
          <DirectorDockCurveCell
            label={isEn ? "Mask & Lip-Sync" : "遮罩與對嘴"}
            value={`${maskMargin} · ${noLipSync ? (isEn ? "Locked" : "鎖嘴") : isEn ? "LipSync" : "對嘴"}`}
            disabled={submitting}
            onPrev={() =>
              setMaskMargin(cycleOption(maskOptions, maskMargin, -1))
            }
            onNext={() =>
              setMaskMargin(cycleOption(maskOptions, maskMargin, 1))
            }
            onClick={() => setRelightModalOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell 4: Section Length */}
          <DirectorDockDurationCell
            label={isEn ? "Duration" : "截取時長"}
            value={`${sectionLength}s`}
            disabled={submitting}
            onClick={() => setSectionModalOpen(true)}
          />
        </DirectorDockPanel>

        {/* Main Composer Box + Left Floating Mode Rail */}
        <DirectorDockComposer
          disabled={submitting}
          modeItems={[
            {
              id: "presets",
              label: isEn ? "Presets" : "造型",
              icon: (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              ),
            },
            {
              id: "historical",
              label: isEn ? "History" : "版本",
              icon: (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              ),
            },
          ]}
          activeModeId={lookTab}
          onSelectMode={(next) => {
            setLookTab(next as LookTab);
            setCharModalOpen(true);
          }}
          topMediaSlot={
            sourceVideoUrl ? (
              <div className="space-y-2.5 rounded-xl bg-white p-3 text-[#12141c]">
                <div className="relative mx-auto max-h-52 w-full overflow-hidden rounded-lg bg-black">
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
                        setSectionLength(
                          Math.min(15, Math.max(2, Math.round(dur))),
                        );
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
            ) : null
          }
          promptValue={customLightPrompt}
          onPromptChange={(val) => {
            setCustomLightPrompt(val);
            if (val.trim() && !relightEnabled) {
              setRelightEnabled(true);
            }
          }}
          promptPlaceholder={
            isEn
              ? "Upload a source clip on the right, click detected people to assign characters, or add custom relight notes here..."
              : "點擊右側上傳來源影片並選擇替換角色，或在此輸入自訂打光與環境氛圍描述（選填）..."
          }
          plusMenuOpen={uploadMenuOpen}
          onPlusToggle={() => setUploadMenuOpen((prev) => !prev)}
          plusMenuSlot={
            <div className="space-y-3 text-[#12141c]">
              <div className="rounded-xl bg-white p-3">
                <p className="mb-2 text-xs font-bold">
                  {isEn
                    ? "Upload Source Media (MP4 / MOV / GIF / Image)"
                    : "上傳來源媒體（影片 / GIF / 圖片）"}
                </p>
                <BrandUploadButton
                  label={
                    sourceVideoUrl
                      ? isEn
                        ? "Replace Source Media"
                        : "更換來源媒體"
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
                    setUploadMenuOpen(false);
                  }}
                  onProgress={setSourceUploadProgress}
                  onError={setError}
                />
              </div>
            </div>
          }
          pills={
            <>
              <DirectorDockPill
                accentBadge={<span>⚡</span>}
                label={`Scro Swap ${motionSize}p`}
                hasChevron
                disabled={submitting}
                onClick={() =>
                  setMotionSize(cycleOption(motionSizes, motionSize, 1))
                }
              />

              <DirectorDockPill
                label={
                  keepSourceAudio
                    ? isEn
                      ? "Audio: ON"
                      : "保留原聲: 開"
                    : isEn
                      ? "Audio: OFF"
                      : "保留原聲: 關"
                }
                disabled={submitting}
                onClick={() => setKeepSourceAudio((prev) => !prev)}
              />

              <DirectorDockPill
                label={
                  applyColorFixOnRender
                    ? isEn
                      ? "Color Fix: ON"
                      : "H3 調色: 開"
                    : isEn
                      ? "Color Fix: OFF"
                      : "H3 調色: 關"
                }
                disabled={submitting}
                onClick={() => setApplyColorFixOnRender((prev) => !prev)}
              />

              {sourceVideoUrl ? (
                <DirectorDockPill
                  label={
                    detectingPeople
                      ? isEn
                        ? "Detecting..."
                        : "偵測人物中..."
                      : isEn
                        ? "Redetect People"
                        : "🔍 重新偵測人物"
                  }
                  disabled={submitting || detectingPeople}
                  onClick={() => void runFramePeopleDetection()}
                />
              ) : null}
            </>
          }
          rightSlot1={
            <DirectorDockQuickTile
              label={isEn ? "Source" : "來源媒體"}
              badge={
                sourceUploadProgress !== null
                  ? `${Math.round(sourceUploadProgress)}%`
                  : isEn
                    ? "Req"
                    : "必選"
              }
              videoUrl={
                sourceVideoUrl && sourceMediaKind === "video"
                  ? sourceVideoUrl
                  : undefined
              }
              thumbUrl={
                sourceVideoUrl && sourceMediaKind !== "video"
                  ? sourceVideoUrl
                  : undefined
              }
              disabled={submitting}
              onClick={() => setUploadMenuOpen(true)}
              onClear={
                sourceVideoUrl
                  ? () => {
                      setSourceVideoUrl("");
                      setDetectedPeople([]);
                      setPersonAssignments({});
                    }
                  : undefined
              }
            />
          }
          rightSlot2={
            <DirectorDockQuickTile
              label={isEn ? "Character" : "替換角色"}
              badge={activeCharacter?.name?.slice(0, 4)}
              thumbUrl={
                uploadedPhotoUrl ||
                selectedLookUrl ||
                characterAvatarUrl(activeCharacter)
              }
              disabled={submitting}
              onClick={() => setCharModalOpen(true)}
              onClear={
                uploadedPhotoUrl
                  ? () => {
                      setUploadedPhotoUrl("");
                      updateActivePersonSlot({ uploadedPhotoUrl: "" });
                    }
                  : undefined
              }
            />
          }
          onGenerate={() => void onSubmit()}
          generateDisabled={!sourceVideoUrl || submitting}
          generating={submitting}
          generateLabel={
            submitting
              ? isEn
                ? "Starting..."
                : "啟動中..."
              : isEn
                ? "Generate"
                : "生成"
          }
          creditBadge="2K"
          error={error}
        />
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
                <button
                  type="button"
                  onClick={() => setCharModalOpen(false)}
                  className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
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

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setCharModalOpen(false);
                      setManagingCharacter(true);
                    }}
                    className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink bg-lime/60 px-3.5 text-xs font-bold text-accent-ink transition hover:bg-lime"
                  >
                    <span>
                      {isEn ? "+ Customize Outfit" : "+ 自訂穿搭 Customize Outfit"}
                    </span>
                  </button>
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

      {/* Relight & Motion Settings Modal */}
      {relightModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setRelightModalOpen(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                {isEn
                  ? "Relight & Motion Mask Settings"
                  : "光影重打 Relight 與遮罩參數"}
              </h3>
              <button
                type="button"
                onClick={() => setRelightModalOpen(false)}
                className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
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

            <div className="grid grid-cols-2 gap-3 border-t border-accent-ink/10 pt-4">
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
                  className="mt-1 h-9 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
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
                  className="mt-1 h-9 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                >
                  <option value={512}>512 px (Default)</option>
                  <option value={768}>768 px (High Precision)</option>
                  <option value={1376}>1376 px (Max Detail)</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
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
        </div>
      ) : null}

      {/* Section Start & Length Modal */}
      {sectionModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setSectionModalOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                {isEn ? "Clip Section Trim" : "影片截取範圍設定"}
              </h3>
              <button
                type="button"
                onClick={() => setSectionModalOpen(false)}
                className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                  onChange={(e) =>
                    setSectionStart(Math.max(0, Number(e.target.value)))
                  }
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
                    setSectionLength(
                      Math.min(15, Math.max(2, Number(e.target.value))),
                    )
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                />
              </label>
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
