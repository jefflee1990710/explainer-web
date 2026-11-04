"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  lifePostTemplateById,
  pickRandomLifePostTemplateId,
  QUICK_LIFE_TEMPLATE_ID,
} from "@/model/life-post-template";
import type { LifeCreateMode, LifeShotKind } from "@/model/life-shot-kind";
import {
  generateLifeCaptionAction,
  generateLifeShotAction,
  listLifeShotsAction,
  searchLifeScenesAction,
} from "@/presentation/actions/life";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import {
  buildCastSlotItems,
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
  LIFE_REMARK_STAGE_CLASS,
  resolveCastSlotCount,
} from "@/presentation/components/app/director-dock";
import { LifeCharacterMenu } from "@/presentation/components/app/life/life-character-menu";
import { LifeSceneSource } from "@/presentation/components/app/life/life-scene-source";
import { LifePoseDialog } from "@/presentation/components/app/life/life-pose-dialog";
import { LifePhotoEditor } from "@/presentation/components/app/life/life-photo-editor";
import { LifeShotGrid } from "@/presentation/components/app/life/life-shot-grid";
import {
  LifeRecentDrawer,
  LifeRecentOpenButton,
} from "@/presentation/components/app/life/life-recent-drawer";
import { LifeTemplateDialog } from "@/presentation/components/app/life/life-template-dialog";
import { LifeDressDialog } from "@/presentation/components/app/life/life-dress-dialog";
import {
  EMPTY_LIFE_LOOK,
  LifePresetTree,
  lifePresetsFromPublic,
  lifeStylesFromPublic,
  type LifeLookSelection,
} from "@/presentation/components/app/life/life-preset-tree";
import { LifeWardrobePicker } from "@/presentation/components/app/life/life-wardrobe-picker";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { FRAME_COST } from "@/service/credit-costs";
import type { PublicCharacter } from "@/presentation/serialize";
import type {
  PublicLifeCharacter,
  PublicLifeShot,
} from "@/service/character/life";
import type { LifeSceneHit } from "@/service/character/life-prompt";
import type { CharacterWardrobePicks } from "@/service/character/character-look";
import type { CharacterWardrobeColorPicks } from "@/service/character/wardrobe-colors";
import { translateAppError } from "@/util/i18n/translate-app-error";

const REMARK_PALETTE = [
  { color: "#ff3b30", name: "red (#ff3b30)" },
  { color: "#007aff", name: "blue (#007aff)" },
  { color: "#34c759", name: "green (#34c759)" },
  { color: "#af52de", name: "purple (#af52de)" },
  { color: "#ff9500", name: "orange (#ff9500)" },
  { color: "#00c7be", name: "teal (#00c7be)" },
] as const;

const SCENE_PLACE_SHORTCUTS = [
  {
    id: "candid-scene",
    label: "讓角色自然融入此場景",
    prompt:
      "Place the selected character naturally inside this scene with matching directional lighting, realistic shadows, and candid posture.",
  },
  {
    id: "selfie-view",
    label: "讓角色在此場景自拍",
    prompt:
      "Make the selected character take a natural arm's-length phone selfie looking into the lens with this exact view and background behind them.",
  },
  {
    id: "foreground-look",
    label: "站在場景前景看向鏡頭",
    prompt:
      "Have the selected character stand naturally in the foreground facing the camera with a relaxed smile against this exact background.",
  },
] as const;

const DEFAULT_REPLACE_PERSON_COMMENT =
  "將此標記處的人物替換為所選角色（保留原圖姿勢）";

type Point = { x: number; y: number };

type RemarkItem = {
  number: number;
  color: string;
  colorName: string;
  comment: string;
  strokes: Point[][];
};

function drawRemarksOnContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  remarks: RemarkItem[],
) {
  ctx.clearRect(0, 0, width, height);
  const scale = Math.max(1, width / 600);
  for (const remark of remarks) {
    if (remark.strokes.length === 0) continue;
    ctx.strokeStyle = remark.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4.5 * scale;
    for (const stroke of remark.strokes) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x * width, stroke[0].y * height);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x * width, stroke[i].y * height);
      }
      ctx.stroke();
    }
    const anchor = remark.strokes[0]?.[0];
    if (anchor) {
      const cx = anchor.x * width;
      const cy = anchor.y * height;
      const radius = 14 * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = remark.color;
      ctx.fill();
      ctx.lineWidth = 2 * scale;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(12 * scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${remark.number}`, cx, cy);
    }
  }
}

async function renderAnnotatedSceneDataUrl(
  imageUrl: string,
  remarks: RemarkItem[],
): Promise<string | undefined> {
  const active = remarks.filter(
    (r) => r.strokes.length > 0 && r.comment.trim().length > 0,
  );
  if (active.length === 0) return undefined;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const maxDim = 1024;
        const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth || 800, img.naturalHeight || 800));
        const w = Math.max(1, Math.round((img.naturalWidth || 800) * ratio));
        const h = Math.max(1, Math.round((img.naturalHeight || 800) * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(undefined);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const overlayCanvas = document.createElement("canvas");
        overlayCanvas.width = w;
        overlayCanvas.height = h;
        const oCtx = overlayCanvas.getContext("2d");
        if (oCtx) {
          drawRemarksOnContext(oCtx, w, h, active);
          ctx.drawImage(overlayCanvas, 0, 0);
        }
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      } catch {
        resolve(undefined);
      }
    };
    img.onerror = () => resolve(undefined);
    img.src = imageUrl;
  });
}

export function LifeDesk({
  characters,
  shots: initialShots,
  initialCharacterId,
  subscribed,
}: {
  characters: PublicLifeCharacter[];
  shots: PublicLifeShot[];
  initialCharacterId?: string;
  subscribed: boolean;
}) {
  const { t, locale } = useI18n();
  const first =
    characters.find((item) => item.id === initialCharacterId) || characters[0];
  const [people, setPeople] = useState(characters);
  const [characterId, setCharacterId] = useState(first?.id || "");
  const [look, setLook] = useState<LifeLookSelection>(EMPTY_LIFE_LOOK);
  const [dressOpen, setDressOpen] = useState(false);
  // Default to the first tab: Post Type & Pose.
  const [createMode, setCreateMode] = useState<LifeCreateMode>("post-template");
  const [place, setPlace] = useState(first?.persona?.city || "");
  // Post-type template and its optional pose/framing reference photo.
  const [templateId, setTemplateId] = useState("");
  const [compositionRefUrl, setCompositionRefUrl] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  // Body pose from the pose library (independent of the template).
  const [poseId, setPoseId] = useState("");
  const [poseDialogOpen, setPoseDialogOpen] = useState(false);
  const [wardrobeDialogOpen, setWardrobeDialogOpen] = useState(false);
  const [lookDialogOpen, setLookDialogOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const sceneFileInputRef = useRef<HTMLInputElement | null>(null);
  const compRefInputRef = useRef<HTMLInputElement | null>(null);
  // Optional hair / clothes overrides shared by all 3 creation modes.
  const [wardrobe, setWardrobe] = useState<CharacterWardrobePicks>({});
  const [wardrobeColors, setWardrobeColors] = useState<CharacterWardrobeColorPicks>({});
  const kind: LifeShotKind = lifePostTemplateById(templateId)?.kind ?? "selfie";
  const [mode, setMode] = useState<"search" | "upload">("upload");
  const [hits, setHits] = useState<LifeSceneHit[]>([]);
  const [sceneUrl, setSceneUrl] = useState("");
  const [shots, setShots] = useState(initialShots);
  const [dialogShot, setDialogShot] = useState<PublicLifeShot | null>(null);
  const [pending, setPending] = useState<
    "search" | "upload" | "refUpload" | "generate" | "regenerate" | ""
  >("");
  const [error, setError] = useState("");
  const [creditGate, setCreditGate] = useState(false);
  const [placeDialogOpen, setPlaceDialogOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [historyEditPrompt, setHistoryEditPrompt] = useState("");
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [captionLoading, setCaptionLoading] = useState(false);

  // Count of life photos currently generating in the background.
  const generatingCount = shots.filter((s) => s.status === "generating").length;

  // Poll every 3 seconds while any life shot is generating in the background.
  useEffect(() => {
    if (generatingCount === 0) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await listLifeShotsAction();
        if (cancelled || !res.ok) return;
        setShots(res.shots);
        setDialogShot((current) => {
          if (!current) return current;
          const updated = res.shots.find((s) => s.id === current.id);
          return updated ?? current;
        });
      } catch {
        // Ignore transient polling errors.
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [generatingCount]);
  const [captionCopied, setCaptionCopied] = useState(false);

  // Multi-color numbered remarks (#1, #2, #3...) — empty by default until user draws or adds one
  const [remarks, setRemarks] = useState<RemarkItem[]>([]);
  const [activeRemarkNumber, setActiveRemarkNumber] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const character = useMemo(
    () => people.find((item) => item.id === characterId) || null,
    [people, characterId],
  );

  // Wardrobe dialog edits presets and style versions in place, so the tree stays current without a reload.
  const onDressUpdated = useCallback((next: PublicCharacter) => {
    const styles = lifeStylesFromPublic(next);
    const presets = lifePresetsFromPublic(next.presets, next);
    const newest = [...next.versions]
      .filter((version) => version.status === "completed")
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))[0];
    setPeople((current) =>
      current.map((item) => {
        if (item.id !== next.id) return item;
        const previewUrl = newest
          ? newest.portraitUrl || newest.profileUrl || newest.blueprintUrl || item.previewUrl
          : item.previewUrl;
        return {
          ...item,
          name: next.name,
          styleId: next.styleId,
          previewUrl,
          ready: Boolean(previewUrl),
          styles,
          presets,
        };
      }),
    );
    setLook((current) => {
      if (!current.presetId) return current;
      const match = presets.find((preset) => preset.id === current.presetId);
      if (!match) return EMPTY_LIFE_LOOK;
      return {
        versionId: match.versionId,
        presetId: match.id,
        thumbUrl: match.thumbUrl,
        styleId: match.styleId,
      };
    });
  }, []);

  // Each character has its own independent Recent history grid.
  const visibleShots = useMemo(
    () => shots.filter((item) => item.characterId === characterId),
    [shots, characterId],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawRemarksOnContext(ctx, canvas.width, canvas.height, remarks);
  }, [remarks, sceneUrl]);

  function resetRemarks() {
    setRemarks([]);
    setActiveRemarkNumber(0);
  }

  // After a shot is queued, empty the create form so the next photo starts clean.
  // The selected character and the current tab stay put.
  function resetCreateForm() {
    setSceneUrl("");
    setHits([]);
    setMode("upload");
    setCustomInstruction("");
    setPoseId("");
    setWardrobe({});
    setTemplateId("");
    setCompositionRefUrl("");
    setPlace(character?.persona?.city || "");
    resetRemarks();
  }

  function addRemarkSlot() {
    setRemarks((prev) => {
      const nextNum = prev.length > 0 ? Math.max(...prev.map((r) => r.number)) + 1 : 1;
      const palette = REMARK_PALETTE[(nextNum - 1) % REMARK_PALETTE.length];
      setActiveRemarkNumber(nextNum);
      return [
        ...prev,
        {
          number: nextNum,
          color: palette.color,
          colorName: palette.name,
          comment: "",
          strokes: [],
        },
      ];
    });
  }

  function removeRemarkSlot(num: number) {
    setRemarks((prev) => {
      const filtered = prev
        .filter((r) => r.number !== num)
        .map((r, idx) => {
          const palette = REMARK_PALETTE[idx % REMARK_PALETTE.length];
          return {
            ...r,
            number: idx + 1,
            color: palette.color,
            colorName: palette.name,
          };
        });
      setActiveRemarkNumber(
        filtered.length > 0 ? filtered[filtered.length - 1].number : 0,
      );
      return filtered;
    });
  }

  function canvasNormPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / Math.max(1, rect.height))),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!sceneUrl || pending !== "") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = canvasNormPoint(e);
    setRemarks((prev) => {
      if (prev.length === 0 || activeRemarkNumber <= 0) {
        const palette = REMARK_PALETTE[0];
        setActiveRemarkNumber(1);
        return [
          {
            number: 1,
            color: palette.color,
            colorName: palette.name,
            comment:
              createMode === "replace-person"
                ? DEFAULT_REPLACE_PERSON_COMMENT
                : "",
            strokes: [[pt]],
          },
        ];
      }
      return prev.map((item) =>
        item.number === activeRemarkNumber
          ? { ...item, strokes: [...item.strokes, [pt]] }
          : item,
      );
    });
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const pt = canvasNormPoint(e);
    setRemarks((prev) =>
      prev.map((item) => {
        if (item.number !== activeRemarkNumber || item.strokes.length === 0) {
          return item;
        }
        const strokes = [...item.strokes];
        const last = strokes[strokes.length - 1] || [];
        strokes[strokes.length - 1] = [...last, pt];
        return { ...item, strokes };
      }),
    );
  }

  function onPointerUp() {
    drawingRef.current = false;
  }

  function selectCharacter(id: string) {
    const next = people.find((item) => item.id === id);
    setCharacterId(id);
    setLook(EMPTY_LIFE_LOOK);
    setDressOpen(false);
    if (next?.persona?.city) setPlace(next.persona.city);
    setDialogShot(null);
    setError("");
  }

  function openShot(shot: PublicLifeShot) {
    setDialogShot(shot);
    setHistoryEditPrompt("");
    setGeneratedCaption("");
    setCaptionCopied(false);
  }

  async function onSearch() {
    if (!place.trim()) {
      setError(t("life.placePlaceholder"));
      return;
    }
    setPending("search");
    setError("");
    try {
      const result = await searchLifeScenesAction({
        place,
        kind,
        interest: character?.persona?.interests[0],
      });
      setPending("");
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      setHits(result.hits);
      setSceneUrl(result.hits[0]?.thumbUrl || "");
      setMode("search");
      resetRemarks();
    } catch {
      setPending("");
      setError(t("errors.lifeSearchFailed"));
    }
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setPending("upload");
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      const uploaded = await uploadCharacterImageAction(data);
      setPending("");
      if (!uploaded.ok || !uploaded.url) {
        setError(translateAppError(uploaded.ok ? "" : uploaded.error, t));
        return;
      }
      setSceneUrl(uploaded.url);
      setMode("upload");
      resetRemarks();
    } catch {
      setPending("");
      setError(t("errors.genericRetry"));
    }
  }

  // Uploads the composition reference used only for pose, angle and crop.
  async function onUploadCompositionRef(file: File | undefined) {
    if (!file) return;
    setPending("refUpload");
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      const uploaded = await uploadCharacterImageAction(data);
      setPending("");
      if (!uploaded.ok || !uploaded.url) {
        setError(translateAppError(uploaded.ok ? "" : uploaded.error, t));
        return;
      }
      setCompositionRefUrl(uploaded.url);
    } catch {
      setPending("");
      setError(t("errors.genericRetry"));
    }
  }

  async function onGenerate(overrideInstruction?: string) {
    if (!character?.ready) {
      setError(t("life.needBlueprint"));
      return;
    }
    const effectiveTemplateId =
      createMode === "post-template"
        ? templateId || QUICK_LIFE_TEMPLATE_ID
        : undefined;
    if (createMode !== "post-template" && !sceneUrl) {
      setError(t("life.needScene"));
      return;
    }
    setPending("generate");
    setError("");
    try {
      const annotatedSceneDataUrl = sceneUrl
        ? await renderAnnotatedSceneDataUrl(sceneUrl, remarks)
        : undefined;
      const result = await generateLifeShotAction({
        characterId: character.id,
        createMode,
        place: place || character.persona?.city || "Scene",
        kind,
        sceneImageUrl: sceneUrl || undefined,
        source: mode,
        customInstruction: overrideInstruction ?? customInstruction,
        annotatedSceneDataUrl,
        remarks: remarks.map((r) => ({
          number: r.number,
          colorName: r.colorName,
          comment: r.comment,
        })),
        templateId: effectiveTemplateId,
        compositionRefUrl:
          createMode === "post-template" && effectiveTemplateId && compositionRefUrl
            ? compositionRefUrl
            : undefined,
        poseId: poseId || undefined,
        wardrobe,
        wardrobeColors,
        versionId: look.versionId || undefined,
      });
      setPending("");
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) setCreditGate(true);
        return;
      }
      setShots((current) => [result.shot, ...current]);
      setRecentOpen(true);
      resetCreateForm();
    } catch {
      setPending("");
      setError(t("errors.lifeGenerateFailed"));
    }
  }

  async function onQuickGenerate(templateId: string) {
    if (!character?.ready) {
      setError(t("life.needBlueprint"));
      return;
    }
    const template = lifePostTemplateById(templateId);
    if (!template) {
      setError("找不到貼文類型 (Post Type)");
      return;
    }
    setPending("generate");
    setError("");
    try {
      const result = await generateLifeShotAction({
        characterId: character.id,
        createMode: "post-template",
        place: character.persona?.city || "Scene",
        kind: template.kind,
        source: "upload",
        templateId: template.id,
        versionId: look.versionId || undefined,
      });
      setPending("");
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) setCreditGate(true);
        return;
      }
      setShots((current) => [result.shot, ...current]);
      setRecentOpen(true);
    } catch {
      setPending("");
      setError(t("errors.lifeGenerateFailed"));
    }
  }

  async function onRegenerateFromHistory() {
    if (!dialogShot) return;
    const targetChar =
      people.find((c) => c.id === dialogShot.characterId) || character;
    if (!targetChar?.ready) {
      setError(t("life.needBlueprint"));
      return;
    }
    setPending("regenerate");
    setError("");
    try {
      const result = await generateLifeShotAction({
        characterId: targetChar.id,
        place: dialogShot.place || "Edited Shot",
        kind: dialogShot.kind,
        sceneImageUrl: dialogShot.resultUrl,
        source: "upload",
        customInstruction:
          historyEditPrompt.trim() ||
          "Keep the character identity and refine this photograph naturally.",
        versionId: targetChar.id === characterId ? look.versionId || undefined : undefined,
      });
      setPending("");
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) setCreditGate(true);
        return;
      }
      setShots((current) => [result.shot, ...current]);
      setRecentOpen(true);
      setDialogShot(null);
      setHistoryEditPrompt("");
    } catch {
      setPending("");
      setError(t("errors.lifeGenerateFailed"));
    }
  }

  if (!people.length) {
    return (
      <div className="flex flex-col gap-3 lg:h-[calc(100dvh-4.5rem)] lg:overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-accent-ink/10 bg-paper/90 px-4 py-2.5">
          <div>
            <h1 className="font-display text-lg font-bold">{t("life.title")}</h1>
            <p className="text-xs text-muted">{t("life.subtitle")}</p>
          </div>
          <Link
            href="/app/characters"
            className="inline-flex h-8 items-center rounded-full bg-accent-ink px-3.5 text-xs font-bold text-lime"
          >
            {t("characters.create")}
          </Link>
        </header>
        <div className="grid flex-1 place-items-center rounded-2xl border border-accent-ink/10 bg-paper/80 p-6">
          <p className="text-sm text-muted">{t("life.emptyCharacters")}</p>
        </div>
      </div>
    );
  }

  const sceneUploadAndCanvasSection = (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-muted">
            {createMode === "replace-person"
              ? "點擊或塗抹圈選要替換的人物（未圈選則替換主要人物）："
              : "畫筆標註（選填：在圖上塗鴉標記位置）："}
          </span>
          {remarks.map((r) => {
            const isActive = r.number === activeRemarkNumber;
            return (
              <button
                key={r.number}
                type="button"
                onClick={() => setActiveRemarkNumber(r.number)}
                style={{
                  backgroundColor: isActive ? r.color : "transparent",
                  borderColor: r.color,
                  color: isActive ? "#ffffff" : r.color,
                }}
                className="cursor-pointer rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition"
              >
                #{r.number}
              </button>
            );
          })}
          {remarks.length < 6 ? (
            <button
              type="button"
              onClick={addRemarkSlot}
              className="cursor-pointer rounded-full border border-accent-ink/20 bg-paper px-2.5 py-0.5 text-xs font-bold text-foreground hover:border-accent-ink"
            >
              + 新增 #{remarks.length + 1}
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {remarks.length > 0 ? (
            <button
              type="button"
              onClick={resetRemarks}
              className="cursor-pointer rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted hover:text-foreground"
            >
              清除圈選
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => sceneFileInputRef.current?.click()}
            className="cursor-pointer rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted hover:text-foreground"
          >
            更換圖片
          </button>
        </div>
      </div>

      {/* Image + Drawing Overlay Canvas */}
      <div className={LIFE_REMARK_STAGE_CLASS}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sceneUrl}
          alt="Scene reference"
          draggable={false}
          className="max-h-[14rem] w-auto object-contain"
        />
        <canvas
          ref={canvasRef}
          width={720}
          height={960}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
        />
      </div>

      {remarks.length > 0 ? (
        <div className="space-y-1.5 rounded-xl border border-accent-ink/12 bg-paper p-2.5">
          {remarks.map((r) => (
            <div key={r.number} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveRemarkNumber(r.number)}
                style={{ backgroundColor: r.color }}
                className="inline-flex h-6 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[11px] font-bold text-white"
              >
                #{r.number}
              </button>
              <input
                type="text"
                value={r.comment}
                onFocus={() => setActiveRemarkNumber(r.number)}
                onChange={(e) => {
                  const val = e.target.value;
                  setRemarks((prev) =>
                    prev.map((item) =>
                      item.number === r.number ? { ...item, comment: val } : item,
                    ),
                  );
                }}
                placeholder={`#${r.number} 修改說明（例：將此處人物換成角色 / 加上道具...）`}
                className="h-8 flex-1 rounded-lg border border-accent-ink/15 bg-paper px-2.5 text-xs text-foreground focus-visible:outline-1 focus-visible:outline-accent"
              />
              <button
                type="button"
                onClick={() => removeRemarkSlot(r.number)}
                className="cursor-pointer px-1.5 text-xs font-bold text-muted hover:text-red-600"
                aria-label={`Remove #${r.number}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  const selectedTemplate = lifePostTemplateById(templateId);
  const selectedTemplateName = selectedTemplate
    ? t(`life.templates.names.${selectedTemplate.id}`)
    : "";
  const wardrobeCount = Object.values(wardrobe).filter(Boolean).length;
  const castSlots = buildCastSlotItems(
    character ? [character.id] : [],
    people.map((p) => ({
      id: p.id,
      name: p.name,
      previewUrl:
        (look.thumbUrl && p.id === characterId ? look.thumbUrl : p.previewUrl) ||
        undefined,
    })),
    resolveCastSlotCount("life", 1),
  );

  const modeLabel =
    createMode === "post-template"
      ? locale === "en"
        ? "Post Template"
        : "IG 貼文模板"
      : createMode === "scene-place"
        ? locale === "en"
          ? "Place in Scene"
          : "融入實景"
        : locale === "en"
          ? "Replace Person"
          : "局部換人";

  return (
    <div className="min-h-[calc(100dvh-4.5rem)] w-full">
      {/* Hidden file inputs for the two right quick-slot tiles */}
      <input
        ref={compRefInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={pending !== ""}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void onUploadCompositionRef(file);
        }}
      />
      <input
        ref={sceneFileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={pending !== ""}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void onUpload(file);
        }}
      />

      <DirectorDockStage
        topLeft={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-full bg-white/95 p-0.5 text-[#12141c] shadow-sm">
              <LifeCharacterMenu
                characters={people}
                selectedId={characterId}
                onSelect={selectCharacter}
              />
            </div>
            {character ? (
              <button
                type="button"
                disabled={pending !== ""}
                onClick={() => setLookDialogOpen(true)}
                className="director-dock-cell inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 text-xs font-semibold text-zinc-200 transition hover:border-white/30 hover:text-white"
              >
                <span>✨</span>
                <span>
                  {look.presetId
                    ? locale === "en"
                      ? "Saved Look"
                      : "已選造型"
                    : locale === "en"
                      ? "Switch Look"
                      : "切換造型"}
                </span>
              </button>
            ) : null}
          </div>
        }
        topRight={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending !== "" || !character?.ready}
              onClick={() =>
                void onQuickGenerate(pickRandomLifePostTemplateId())
              }
              className="director-dock-cell inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[#d8ff3e]/40 bg-[#d8ff3e]/10 px-3 text-xs font-bold text-[#d8ff3e] transition hover:bg-[#d8ff3e]/20 disabled:opacity-50"
            >
              <span>🎲</span>
              <span>{locale === "en" ? "Surprise Me" : "隨機靈感一鍵拍"}</span>
            </button>
            <div className="rounded-full bg-white/95 text-[#12141c]">
              <LifeRecentOpenButton
                count={visibleShots.length}
                generatingCount={generatingCount}
                onClick={() => setRecentOpen(true)}
              />
            </div>
          </div>
        }
        bottomContent={
          visibleShots.length > 0 ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-[#181920]/90 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-zinc-100">
                  {character
                    ? `${character.name} · ${t("life.recent")}`
                    : t("life.recent")}
                </h2>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-zinc-300">
                  {visibleShots.length}
                </span>
              </div>
              <div className="rounded-xl bg-white p-3 text-[#12141c]">
                <LifeShotGrid
                  shots={visibleShots}
                  selectedId={dialogShot?.id}
                  onSelect={openShot}
                  compact
                />
              </div>
            </div>
          ) : null
        }
      >
        <DirectorDockHero kind="life" />

        {character && !character.ready ? (
          <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300">
            {t("life.needBlueprint")}
          </p>
        ) : null}

        {/* Collapsible 🎬 導演面板 */}
        <DirectorDockPanel
          headerRight={
            <button
              type="button"
              onClick={() => setDressOpen(true)}
              className="director-dock-cell cursor-pointer rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-semibold text-[#d8ff3e] hover:border-[#d8ff3e]/50"
            >
              {locale === "en" ? "Dress Up & Presets" : "衣帽間與造型管理"}
            </button>
          }
        >
          {/* Cell 1: Character & Look */}
          <DirectorDockCastGroup
            slots={castSlots}
            disabled={pending !== ""}
            badgeLabel={character?.name || t("life.title")}
            onOpenPicker={() => setLookDialogOpen(true)}
            onManageActive={() => setDressOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell 2: Post Template */}
          <DirectorDockStepperCell
            label={
              locale === "zh-Hant"
                ? "貼文類型"
                : locale === "zh-Hans"
                  ? "贴文类型"
                  : "Post Type"
            }
            value={
              selectedTemplateName ||
              (locale === "en" ? "Auto / Pick" : "自動構圖")
            }
            disabled={pending !== ""}
            onClick={() => setTemplateDialogOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell 3: Body Pose */}
          <DirectorDockCurveCell
            label={
              locale === "zh-Hant"
                ? "角色姿勢"
                : locale === "zh-Hans"
                  ? "角色姿势"
                  : "Body Pose"
            }
            value={poseId ? poseId : locale === "en" ? "Auto" : "自然擺拍"}
            disabled={pending !== ""}
            onClick={() => setPoseDialogOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell 4: Wardrobe Override */}
          <DirectorDockDurationCell
            label={
              locale === "zh-Hant"
                ? "服飾微調"
                : locale === "zh-Hans"
                  ? "服饰微调"
                  : "Wardrobe"
            }
            value={
              wardrobeCount > 0
                ? `${wardrobeCount} 項`
                : locale === "en"
                  ? "Default"
                  : "預設穿搭"
            }
            disabled={pending !== ""}
            onClick={() => setWardrobeDialogOpen(true)}
          />
        </DirectorDockPanel>

        {/* Main Composer Box + Left Floating Mode Rail */}
        <DirectorDockComposer
          disabled={pending !== ""}
          modeItems={[
            {
              id: "post-template",
              label: locale === "en" ? "Post" : "模板",
              icon: (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              ),
            },
            {
              id: "scene-place",
              label: locale === "en" ? "Scene" : "實景",
              icon: (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              ),
            },
            {
              id: "replace-person",
              label: locale === "en" ? "Swap" : "換人",
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
                  <path d="m17 8 5 5m0-5-5 5" />
                </svg>
              ),
            },
          ]}
          activeModeId={createMode}
          onSelectMode={(next) => {
            setCreateMode(next as LifeCreateMode);
            setError("");
          }}
          topMediaSlot={
            sceneUrl ? (
              <div className="rounded-xl bg-white p-3 text-[#12141c]">
                {sceneUploadAndCanvasSection}
              </div>
            ) : null
          }
          promptValue={customInstruction}
          onPromptChange={(val) => {
            setCustomInstruction(val);
            if (error) setError("");
          }}
          promptPlaceholder={
            createMode === "replace-person"
              ? "上傳含人物照片後可塗鴉圈選目標，或在此補充說明（例：只替換左側人物、面帶微笑）..."
              : createMode === "scene-place"
                ? "描述希望角色如何出現在場景中（例：坐在窗邊看著窗外、手拿咖啡走在街頭）..."
                : "描述你的生活照場景、光線或道具細節（例：傍晚暖陽逆光、桌上放著冰拿鐵與書本）..."
          }
          plusMenuOpen={plusMenuOpen}
          onPlusToggle={() => setPlusMenuOpen((prev) => !prev)}
          plusMenuSlot={
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold text-zinc-400">
                {locale === "en" ? "Scene Shortcuts" : "快捷情境指令"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SCENE_PLACE_SHORTCUTS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setCustomInstruction(sc.prompt);
                      setPlusMenuOpen(false);
                    }}
                    className="cursor-pointer rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-100 hover:bg-white/20"
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-white/10 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    setPlaceDialogOpen(true);
                  }}
                  className="w-full cursor-pointer rounded-xl bg-white/10 px-3 py-1.5 text-left text-xs font-semibold text-[#d8ff3e] hover:bg-white/15"
                >
                  🔍 {t("life.searchAction")}
                </button>
              </div>
            </div>
          }
          pills={
            <>
              <DirectorDockPill
                accentBadge={<span>✦</span>}
                label={modeLabel}
                hasChevron
                disabled={pending !== ""}
                onClick={() => {
                  const order: LifeCreateMode[] = [
                    "post-template",
                    "scene-place",
                    "replace-person",
                  ];
                  const next =
                    order[(order.indexOf(createMode) + 1) % order.length]!;
                  setCreateMode(next);
                }}
              />

              <DirectorDockPill
                icon={<span>📍</span>}
                label={place || (locale === "en" ? "Search Place" : "搜尋實景")}
                hasChevron
                disabled={pending !== ""}
                onClick={() => setPlaceDialogOpen(true)}
              />

              <DirectorDockPill
                label={
                  selectedTemplateName ||
                  (locale === "en" ? "Post Template" : "選擇貼文模板")
                }
                hasChevron
                disabled={pending !== ""}
                onClick={() => setTemplateDialogOpen(true)}
              />

              {poseId ? (
                <DirectorDockPill
                  label={`姿勢: ${poseId}`}
                  disabled={pending !== ""}
                  onClick={() => setPoseId("")}
                />
              ) : null}
            </>
          }
          rightSlot1={
            <DirectorDockQuickTile
              label={
                createMode === "post-template"
                  ? locale === "en"
                    ? "Ref Pose"
                    : "構圖參考"
                  : locale === "en"
                    ? "Pose"
                    : "動作姿勢"
              }
              badge={locale === "en" ? "Opt" : "可選"}
              thumbUrl={
                createMode === "post-template" ? compositionRefUrl : undefined
              }
              active={Boolean(compositionRefUrl || poseId)}
              disabled={pending !== ""}
              onClick={() => {
                if (createMode === "post-template") {
                  compRefInputRef.current?.click();
                } else {
                  setPoseDialogOpen(true);
                }
              }}
              onClear={
                compositionRefUrl ? () => setCompositionRefUrl("") : undefined
              }
            />
          }
          rightSlot2={
            <DirectorDockQuickTile
              label={
                createMode === "replace-person"
                  ? locale === "en"
                    ? "Target"
                    : "人物底圖"
                  : locale === "en"
                    ? "Scene"
                    : "場景底圖"
              }
              badge={
                createMode === "post-template"
                  ? locale === "en"
                    ? "Opt"
                    : "可選"
                  : locale === "en"
                    ? "Req"
                    : "必選"
              }
              thumbUrl={sceneUrl}
              disabled={pending !== ""}
              onClick={() => sceneFileInputRef.current?.click()}
              onClear={
                sceneUrl
                  ? () => {
                      setSceneUrl("");
                      resetRemarks();
                    }
                  : undefined
              }
            />
          }
          onGenerate={() => void onGenerate()}
          generateDisabled={pending !== "" || !character?.ready}
          generating={pending === "generate"}
          generateLabel={
            pending === "generate"
              ? locale === "en"
                ? "Queueing..."
                : "排入佇列..."
              : locale === "en"
                ? "Generate"
                : "生成"
          }
          creditBadge={FRAME_COST}
          error={error}
        />
      </DirectorDockStage>

      {/* Look Preset Selector Modal */}
      {lookDialogOpen && character ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setLookDialogOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-accent-ink/15 bg-paper p-5 text-[#12141c] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">
                {locale === "en" ? "Select Character Look" : "選擇角色預設造型"}
              </h3>
              <button
                type="button"
                onClick={() => setLookDialogOpen(false)}
                className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <LifePresetTree
              character={character}
              look={look}
              disabled={pending !== ""}
              onSelectDefault={() => {
                setLook(EMPTY_LIFE_LOOK);
                setLookDialogOpen(false);
              }}
              onSelectStyle={(styleLook) => {
                setLook({
                  versionId: styleLook.versionId || null,
                  presetId: null,
                  thumbUrl: styleLook.thumbUrl,
                  styleId: styleLook.styleId,
                });
                setLookDialogOpen(false);
              }}
              onSelectPreset={(preset) => {
                setLook({
                  versionId: preset.versionId,
                  presetId: preset.id,
                  thumbUrl: preset.thumbUrl,
                  styleId: preset.styleId,
                });
                setLookDialogOpen(false);
              }}
              onManage={() => {
                setLookDialogOpen(false);
                setDressOpen(true);
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Wardrobe Override Modal */}
      {wardrobeDialogOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setWardrobeDialogOpen(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-accent-ink/15 bg-paper p-5 text-[#12141c] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">
                {locale === "en"
                  ? "Hair & Outfit Overrides"
                  : "角色服飾微調 (Hair & Outfit)"}
              </h3>
              <button
                type="button"
                onClick={() => setWardrobeDialogOpen(false)}
                className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <LifeWardrobePicker
              value={wardrobe}
              colors={wardrobeColors}
              disabled={pending !== ""}
              onChange={setWardrobe}
              onColorsChange={setWardrobeColors}
            />
          </div>
        </div>
      ) : null}

      <LifeRecentDrawer
        open={recentOpen}
        onOpenChange={setRecentOpen}
        title={character ? `${character.name} · ${t("life.recent")}` : t("life.recent")}
        badge={
          <>
            {generatingCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-ink px-2 py-0.5 text-[10px] font-bold text-lime">
                <Spinner className="h-3 w-3" />
                {generatingCount}
              </span>
            ) : null}
            {visibleShots.length > 0 ? (
              <span className="rounded-full bg-accent-ink/8 px-2 py-0.5 text-[10px] font-bold text-muted">
                {visibleShots.length}
              </span>
            ) : null}
          </>
        }
      >
        <LifeShotGrid
          shots={visibleShots}
          selectedId={dialogShot?.id}
          onSelect={openShot}
          compact
        />
      </LifeRecentDrawer>

      {dialogShot ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={dialogShot.characterName}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          onClick={() => setDialogShot(null)}
        >
          <div
            className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-accent-ink/15 bg-paper shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-accent-ink/10 px-5 py-3">
              <div className="min-w-0 truncate text-xs font-bold text-foreground">
                {dialogShot.characterName}
                {dialogShot.place ? (
                  <span className="ml-1.5 font-medium text-muted">
                    · {dialogShot.place}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setDialogShot(null)}
                className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              {/* Filter editor: B&W / film looks, download, and save as a new photo */}
              <LifePhotoEditor
                key={dialogShot.id}
                shot={dialogShot}
                disabled={pending !== ""}
                onError={setError}
                onSaved={(saved) => {
                  setShots((current) => [saved, ...current]);
                  setDialogShot(saved);
                  setGeneratedCaption("");
                  setCaptionCopied(false);
                }}
              />

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={historyEditPrompt}
                  disabled={pending !== ""}
                  onChange={(e) => setHistoryEditPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void onRegenerateFromHistory();
                    }
                  }}
                  placeholder="輸入修改指令，用 AI 修改此圖並重新生成..."
                  className="h-9 min-w-0 flex-1 rounded-full border border-accent-ink/15 bg-paper px-3.5 text-xs font-medium text-foreground focus-visible:outline-1 focus-visible:outline-accent disabled:opacity-60"
                />
                <button
                  type="button"
                  disabled={pending !== ""}
                  onClick={() => void onRegenerateFromHistory()}
                  className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full bg-accent px-4 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending === "regenerate" ? (
                    <Spinner className="mr-1.5 h-3.5 w-3.5" />
                  ) : null}
                  AI 重新生成 · {t("life.cost", { cost: FRAME_COST })}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSceneUrl(dialogShot.resultUrl);
                    setMode("upload");
                    resetRemarks();
                    setDialogShot(null);
                  }}
                  className="cursor-pointer rounded-full border border-accent-ink/15 bg-paper px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent-ink"
                >
                  載入至主畫布塗鴉標註修改
                </button>
                <button
                  type="button"
                  disabled={captionLoading}
                  onClick={async () => {
                    setCaptionLoading(true);
                    setCaptionCopied(false);
                    try {
                      const res = await generateLifeCaptionAction({
                        shotId: dialogShot.id,
                        language: "yue",
                      });
                      if (res.ok) setGeneratedCaption(res.caption);
                    } finally {
                      setCaptionLoading(false);
                    }
                  }}
                  className="cursor-pointer rounded-full border border-accent-ink/15 bg-paper px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent-ink"
                >
                  {captionLoading ? "生成文案中..." : "✍️ AI 生成 IG 貼文文案"}
                </button>
              </div>

              {generatedCaption ? (
                <div className="rounded-xl border border-accent-ink/15 bg-paper p-3 text-xs">
                  <p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-foreground">
                    {generatedCaption}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(generatedCaption);
                      setCaptionCopied(true);
                    }}
                    className="mt-2 cursor-pointer rounded-full bg-accent-ink px-3 py-1 text-[11px] font-bold text-lime"
                  >
                    {captionCopied ? "已複製！" : "複製 IG 文案"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {dressOpen && character ? (
        <LifeDressDialog
          characterId={character.id}
          initialVersionId={look.versionId}
          initialPresetId={look.presetId}
          onUpdated={onDressUpdated}
          onUseLook={(selection) => {
            setLook({
              versionId: selection.versionId,
              presetId: selection.presetId ?? null,
              thumbUrl: selection.thumbUrl,
            });
            setDressOpen(false);
          }}
          onClose={() => setDressOpen(false)}
        />
      ) : null}

      {placeDialogOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("life.searchAction")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setPlaceDialogOpen(false)}
        >
          <div
            className="flex max-h-[82dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-accent-ink/15 bg-paper shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-accent-ink/10 px-5 py-3.5">
              <h2 className="font-display text-sm font-bold text-foreground">
                {t("life.searchAction")}
              </h2>
              <button
                type="button"
                onClick={() => setPlaceDialogOpen(false)}
                className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b border-accent-ink/10 px-5 py-3">
              <input
                type="text"
                value={place}
                maxLength={40}
                autoFocus
                disabled={pending === "search"}
                placeholder={t("life.placePlaceholder")}
                aria-label={t("life.place")}
                onChange={(event) => setPlace(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void onSearch();
                  }
                }}
                className="h-9 min-w-[12rem] flex-1 rounded-full border border-accent-ink/15 bg-paper px-3.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
              />
              <button
                type="button"
                disabled={pending === "search"}
                onClick={() => void onSearch()}
                className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full bg-accent px-4 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending === "search" ? (
                  <Spinner className="mr-1.5 h-3.5 w-3.5" />
                ) : null}
                {pending === "search"
                  ? t("life.searching")
                  : t("life.searchAction")}
              </button>
            </div>
            <div className="min-h-[16rem] flex-1 overflow-y-auto p-4">
              <LifeSceneSource
                mode="search"
                hits={hits}
                selectedUrl={sceneUrl}
                uploadUrl=""
                onPick={(url) => {
                  setSceneUrl(url);
                  setMode("search");
                  resetRemarks();
                  setPlaceDialogOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {templateDialogOpen ? (
        <LifeTemplateDialog
          value={templateId}
          onChange={setTemplateId}
          onClose={() => setTemplateDialogOpen(false)}
        />
      ) : null}

      {poseDialogOpen ? (
        <LifePoseDialog value={poseId} onChange={setPoseId} onClose={() => setPoseDialogOpen(false)} />
      ) : null}

      {creditGate ? (
        <InsufficientCreditsDialog
          needed={FRAME_COST}
          subscribed={subscribed}
          onClose={() => setCreditGate(false)}
          onPaid={() => setCreditGate(false)}
        />
      ) : null}
    </div>
  );
}
