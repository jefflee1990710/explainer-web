"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import type { AspectRatio, VideoQualityTier } from "@/model/project";
import { createSimpleVideoAction } from "@/presentation/actions/projects";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import {
  buildCastSlotItems,
  cycleOption,
  DirectorDockCastGroup,
  DirectorDockComposer,
  DirectorDockDivider,
  DirectorDockHero,
  DirectorDockPanel,
  DirectorDockPill,
  DirectorDockStage,
  DirectorDockStepperCell,
  DirectorDockStyleButton,
  getAspectRatioIconSizeClass,
} from "@/presentation/components/app/director-dock";
import {
  CharacterSelectDialog,
  defaultSheetForStyle,
} from "@/presentation/components/app/projects/[id]/character-select-dialog";
import { readDefaultVideoQualityTier } from "@/presentation/components/app/projects/new/brief-defaults";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StyleSelectDialog } from "@/presentation/components/style-select-dialog";
import type { PublicCharacter, PublicStyle } from "@/presentation/serialize";
import type { CharacterSelectionMap } from "@/service/character/character-presets";
import {
  FRAME_COST,
  VIDEO_CREDITS_PER_SECOND,
} from "@/service/credit-costs";

const ASPECT_OPTIONS: readonly AspectRatio[] = ["9:16", "16:9", "1:1"];
const DURATION_OPTIONS = [5, 6, 8, 10] as const;

const SAMPLE_PROMPTS_EN = [
  "24mm camera pointing to character from low level, smooth tracking motion as the protagonist walks toward camera through a neon-lit rain street at night.",
  "35mm camera pointing to character at eye level, gentle push-in as the character turns toward camera in a sunlit cafe and smiles.",
  "24mm camera pointing to character from low level, following the runner striding toward camera and leaving camera from right side across a mountain ridge at golden hour.",
];

const SAMPLE_PROMPTS_ZH = [
  "24mm 低角度鏡頭指向主角並平滑推進，主角在夜晚霓虹雨街中向鏡頭方向漫步走來。",
  "35mm 平視鏡頭指向主角並緩慢推近，主角在陽光灑落的咖啡店轉身面向鏡頭微笑。",
  "24mm 低角度鏡頭指向主角跟拍，主角在黃昏山脊向鏡頭方向奔跑並從鏡頭右側離開畫面。",
];

function characterPreviewForStyle(
  character: PublicCharacter,
  styleId: string,
  selection?: { versionId?: string; presetId?: string },
): string {
  if (selection?.presetId) {
    const preset = (character.presets || []).find(
      (p) => p.id === selection.presetId,
    );
    if (preset) {
      return (
        preset.portraitUrl ||
        preset.profileUrl ||
        preset.blueprintUrl ||
        character.previewUrl ||
        ""
      );
    }
  }
  if (selection?.versionId) {
    const ver = character.versions.find((v) => v.id === selection.versionId);
    if (ver) {
      return (
        ver.portraitUrl ||
        ver.profileUrl ||
        ver.blueprintUrl ||
        character.previewUrl ||
        ""
      );
    }
  }
  const sheet = defaultSheetForStyle(character, styleId);
  return (
    sheet?.portraitUrl ||
    sheet?.profileUrl ||
    sheet?.blueprintUrl ||
    character.previewUrl ||
    ""
  );
}

export function SimpleVideoStudio({
  characters,
  styles,
}: {
  characters: PublicCharacter[];
  styles: PublicStyle[];
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const isEn = locale === "en";

  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [durationSeconds, setDurationSeconds] = useState<number>(6);
  const [styleId, setStyleId] = useState<string>("realistic");
  const [videoQualityTier] = useState<VideoQualityTier>(
    () => readDefaultVideoQualityTier(),
  );
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(
    characters[0]?.id ? [characters[0].id] : [],
  );
  const [characterSelections, setCharacterSelections] =
    useState<CharacterSelectionMap>({});
  const [firstFrameUrl, setFirstFrameUrl] = useState<string>("");
  const [lastFrameUrl, setLastFrameUrl] = useState<string>("");
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [uploadingSlot, setUploadingSlot] = useState<
    "first" | "last" | "ref" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [characterDialogOpen, setCharacterDialogOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  const activeStyle = useMemo(
    () => styles.find((s) => s.id === styleId) ?? styles[0] ?? null,
    [styles, styleId],
  );

  const castSlots = useMemo(
    () =>
      buildCastSlotItems(
        selectedCharacterIds,
        characters.map((c) => ({
          id: c.id,
          name: c.name,
          previewUrl: characterPreviewForStyle(
            c,
            styleId,
            characterSelections[c.id],
          ),
        })),
        1,
      ),
    [selectedCharacterIds, characters, styleId, characterSelections],
  );

  const perSecondCost = VIDEO_CREDITS_PER_SECOND;
  const estimatedCost =
    (firstFrameUrl ? 0 : FRAME_COST) + perSecondCost * durationSeconds;

  async function handleUploadImage(
    e: ChangeEvent<HTMLInputElement>,
    slot: "first" | "last" | "ref",
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingSlot(slot);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await uploadCharacterImageAction(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (slot === "first") setFirstFrameUrl(res.url);
      else if (slot === "last") setLastFrameUrl(res.url);
      else setReferenceImageUrls((prev) => [...prev, res.url].slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingSlot(null);
    }
  }

  async function handleSubmit() {
    if (!prompt.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const characterId = selectedCharacterIds[0] || "";
      const res = await createSimpleVideoAction({
        prompt: prompt.trim(),
        aspectRatio,
        durationSeconds,
        styleId,
        videoQualityTier,
        ...(firstFrameUrl ? { firstFrameUrl } : {}),
        ...(lastFrameUrl ? { lastFrameUrl } : {}),
        ...(characterId ? { characterId } : {}),
        ...(referenceImageUrls.length > 0 ? { referenceImageUrls } : {}),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/app/videos/${res.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create video");
    } finally {
      setSubmitting(false);
    }
  }

  const samplePrompts = isEn ? SAMPLE_PROMPTS_EN : SAMPLE_PROMPTS_ZH;

  return (
    <>
      <input
        ref={firstFrameInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={submitting || uploadingSlot !== null}
        onChange={(e) => void handleUploadImage(e, "first")}
      />
      <input
        ref={lastFrameInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={submitting || uploadingSlot !== null}
        onChange={(e) => void handleUploadImage(e, "last")}
      />
      <input
        ref={refImageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={submitting || uploadingSlot !== null}
        onChange={(e) => void handleUploadImage(e, "ref")}
      />

      <DirectorDockStage>
        <DirectorDockHero kind="simple" />

        {/* Collapsible Director Panel matching other generation studios */}
        <DirectorDockPanel>
          <DirectorDockStyleButton
            thumbUrl={activeStyle?.previewUrl}
            label={activeStyle?.name || (isEn ? "Realistic" : "寫實風格")}
            disabled={submitting}
            onClick={() => setStyleDialogOpen(true)}
          />

          <DirectorDockCastGroup
            slots={castSlots}
            disabled={submitting}
            badgeLabel={isEn ? "Cast" : "角色"}
            onOpenPicker={() => setCharacterDialogOpen(true)}
            onManageActive={() => setCharacterDialogOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell 1: First Frame */}
          <DirectorDockStepperCell
            thumbUrl={firstFrameUrl || undefined}
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
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            }
            label={isEn ? "First Frame" : "首幀 First Frame"}
            value={
              uploadingSlot === "first"
                ? isEn
                  ? "Uploading..."
                  : "上傳中..."
                : firstFrameUrl
                  ? isEn
                    ? "Attached (Click to change)"
                    : "已附加（點擊更換）"
                  : isEn
                    ? "Auto / Upload Start Frame"
                    : "自動生成／點擊上傳首幀"
            }
            disabled={submitting || uploadingSlot !== null}
            onClick={() => firstFrameInputRef.current?.click()}
          />

          <DirectorDockDivider />

          {/* Cell 2: Last Frame */}
          <DirectorDockStepperCell
            thumbUrl={lastFrameUrl || undefined}
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
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            }
            label={isEn ? "Last Frame" : "尾幀 Last Frame"}
            value={
              uploadingSlot === "last"
                ? isEn
                  ? "Uploading..."
                  : "上傳中..."
                : lastFrameUrl
                  ? isEn
                    ? "Attached (Click to change)"
                    : "已附加（點擊更換）"
                  : isEn
                    ? "Optional (Upload End Frame)"
                    : "選填（點擊上傳尾幀）"
            }
            disabled={submitting || uploadingSlot !== null}
            onClick={() => lastFrameInputRef.current?.click()}
          />

          <DirectorDockDivider />

          {/* Cell 3: Scene / Reference Photos */}
          <DirectorDockStepperCell
            thumbUrl={referenceImageUrls[0] || undefined}
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            }
            label={isEn ? "Scene / Reference" : "場景／參考圖"}
            value={
              uploadingSlot === "ref"
                ? isEn
                  ? "Uploading..."
                  : "上傳中..."
                : referenceImageUrls.length > 0
                  ? isEn
                    ? `Ref (${referenceImageUrls.length}/4)`
                    : `參考圖 (${referenceImageUrls.length}/4)`
                  : isEn
                    ? "Optional (0/4)"
                    : "選填參考圖 (0/4)"
            }
            disabled={submitting || uploadingSlot !== null}
            onClick={() => refImageInputRef.current?.click()}
          />
        </DirectorDockPanel>

        {/* Main Composer Box matching other generation studios */}
        <DirectorDockComposer
          disabled={submitting}
          promptValue={prompt}
          onPromptChange={(val) => {
            setPrompt(val);
            if (error) setError("");
          }}
          promptPlaceholder={
            isEn
              ? "Describe camera lens/angle & motion first (e.g. 24mm camera pointing to character from low level, walking toward camera...), and configure character, style & frames above..."
              : "請先描述鏡頭焦距、角度與運鏡方向（例如：24mm 低角度鏡頭指向主角，主角向鏡頭方向走來...），並於上方導演面板設定角色、風格與首尾幀..."
          }
          topMediaSlot={
            firstFrameUrl || lastFrameUrl || referenceImageUrls.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-zinc-200 bg-[#f4f4f5] p-2.5 text-xs">
                {firstFrameUrl ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-white px-2.5 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={firstFrameUrl}
                      alt="First frame"
                      className="h-8 w-8 rounded-xl object-cover"
                    />
                    <span className="font-bold text-[#12141c]">
                      {isEn ? "First Frame" : "首幀"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFirstFrameUrl("")}
                      className="cursor-pointer px-1 text-zinc-500 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ) : null}
                {lastFrameUrl ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-white px-2.5 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lastFrameUrl}
                      alt="Last frame"
                      className="h-8 w-8 rounded-xl object-cover"
                    />
                    <span className="font-bold text-[#12141c]">
                      {isEn ? "Last Frame" : "尾幀"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLastFrameUrl("")}
                      className="cursor-pointer px-1 text-zinc-500 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ) : null}
                {referenceImageUrls.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="flex items-center gap-2 rounded-2xl bg-white px-2.5 py-1.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Reference ${idx + 1}`}
                      className="h-8 w-8 rounded-xl object-cover"
                    />
                    <span className="font-bold text-[#12141c]">
                      {isEn ? `Ref ${idx + 1}` : `參考圖 ${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReferenceImageUrls((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="cursor-pointer px-1 text-zinc-500 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : undefined
          }
          plusMenuOpen={plusMenuOpen}
          onPlusToggle={() => setPlusMenuOpen((v) => !v)}
          plusMenuSlot={
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold text-zinc-400">
                {isEn
                  ? "Camera-First Sample Prompts"
                  : "鏡頭優先範例 Prompt（點擊填入）"}
              </p>
              <div className="space-y-1.5">
                {samplePrompts.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(sample);
                      setPlusMenuOpen(false);
                    }}
                    className="block w-full cursor-pointer rounded-xl border border-zinc-200 bg-[#f4f4f5] px-3 py-2 text-left text-xs text-[#12141c] transition hover:border-zinc-400"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          }
          pills={
            <>
              <DirectorDockPill
                icon={
                  <span
                    className={`inline-block rounded-[2px] border border-current ${getAspectRatioIconSizeClass(aspectRatio)}`}
                  />
                }
                label={aspectRatio}
                disabled={submitting}
                onClick={() =>
                  setAspectRatio(cycleOption(ASPECT_OPTIONS, aspectRatio, 1))
                }
              />

              <DirectorDockPill
                icon={
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
                label={`${durationSeconds}s`}
                disabled={submitting}
                onClick={() =>
                  setDurationSeconds(
                    cycleOption(
                      DURATION_OPTIONS,
                      durationSeconds as (typeof DURATION_OPTIONS)[number],
                      1,
                    ),
                  )
                }
              />

              <DirectorDockPill
                icon={
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                }
                label={
                  firstFrameUrl
                    ? isEn
                      ? "First Frame ✓"
                      : "首幀 ✓"
                    : isEn
                      ? "First Frame"
                      : "首幀"
                }
                disabled={submitting || uploadingSlot !== null}
                onClick={() => firstFrameInputRef.current?.click()}
              />

              <DirectorDockPill
                icon={
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                }
                label={
                  lastFrameUrl
                    ? isEn
                      ? "Last Frame ✓"
                      : "尾幀 ✓"
                    : isEn
                      ? "Last Frame"
                      : "尾幀"
                }
                disabled={submitting || uploadingSlot !== null}
                onClick={() => lastFrameInputRef.current?.click()}
              />

              <DirectorDockPill
                icon={
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
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
                }
                label={
                  referenceImageUrls.length > 0
                    ? isEn
                      ? `Reference (${referenceImageUrls.length}/4)`
                      : `參考圖 (${referenceImageUrls.length}/4)`
                    : isEn
                      ? "Reference"
                      : "參考圖"
                }
                disabled={submitting || uploadingSlot !== null}
                onClick={() => refImageInputRef.current?.click()}
              />
            </>
          }
          onGenerate={() => void handleSubmit()}
          generateDisabled={!prompt.trim() || submitting}
          generating={submitting}
          generateLabel={
            submitting
              ? isEn
                ? "Generating..."
                : "正在生成..."
              : isEn
                ? "Generate"
                : "生成"
          }
          creditBadge={estimatedCost}
          error={error}
        />
      </DirectorDockStage>

      {styleDialogOpen ? (
        <StyleSelectDialog
          styles={styles}
          selectedIds={[styleId]}
          maxSelect={1}
          isMulti={false}
          onPick={(id: string) => {
            setStyleId(id);
            setStyleDialogOpen(false);
          }}
          onClose={() => setStyleDialogOpen(false)}
        />
      ) : null}

      {characterDialogOpen ? (
        <CharacterSelectDialog
          characters={characters}
          styles={styles}
          styleId={styleId}
          value={selectedCharacterIds}
          selections={characterSelections}
          max={1}
          required={0}
          onChange={setSelectedCharacterIds}
          onSelectionsChange={setCharacterSelections}
          onClose={() => setCharacterDialogOpen(false)}
        />
      ) : null}
    </>
  );
}
