"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { lifePostTemplateById } from "@/model/life-post-template";
import type { LifeCreateMode, LifeShotKind } from "@/model/life-shot-kind";
import {
  generateLifeCaptionAction,
  generateLifeShotAction,
  listLifeShotsAction,
  searchLifeScenesAction,
} from "@/presentation/actions/life";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { downloadLifeShotAsPng } from "@/presentation/components/app/life/download-life-png";
import { LifeCharacterStrip } from "@/presentation/components/app/life/life-character-strip";
import { LifeCreateTabs } from "@/presentation/components/app/life/life-create-tabs";
import {
  LifeFormField,
  LifeFormSeparator,
} from "@/presentation/components/app/life/life-form-field";
import { LifeSceneSource } from "@/presentation/components/app/life/life-scene-source";
import { LifePoseBar } from "@/presentation/components/app/life/life-pose-bar";
import { LifePoseDialog } from "@/presentation/components/app/life/life-pose-dialog";
import { LifeShotGrid } from "@/presentation/components/app/life/life-shot-grid";
import { LifeTemplateDialog } from "@/presentation/components/app/life/life-template-dialog";
import { LifeTemplateGuide } from "@/presentation/components/app/life/life-template-guide";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { FRAME_COST } from "@/service/credit-costs";
import type {
  PublicLifeCharacter,
  PublicLifeShot,
} from "@/service/character/life";
import type { LifeSceneHit } from "@/service/character/life-prompt";
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
  "將此標記處的人物替換為所選角色（保留姿勢，換上角色的臉孔、髮型與預設服裝）";

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
  const { t } = useI18n();
  const first =
    characters.find((item) => item.id === initialCharacterId) || characters[0];
  const [characterId, setCharacterId] = useState(first?.id || "");
  const [createMode, setCreateMode] = useState<LifeCreateMode>("replace-person");
  const [place, setPlace] = useState(first?.persona?.city || "");
  // Post-type template and its optional pose/framing reference photo.
  const [templateId, setTemplateId] = useState("");
  const [compositionRefUrl, setCompositionRefUrl] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  // Body pose from the pose library (independent of the template).
  const [poseId, setPoseId] = useState("");
  const [poseDialogOpen, setPoseDialogOpen] = useState(false);
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
  const [isDragging, setIsDragging] = useState(false);
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
  const [downloadingPng, setDownloadingPng] = useState(false);

  // Multi-color numbered remarks (#1, #2, #3...) — empty by default until user draws or adds one
  const [remarks, setRemarks] = useState<RemarkItem[]>([]);
  const [activeRemarkNumber, setActiveRemarkNumber] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const character = useMemo(
    () => characters.find((item) => item.id === characterId) || null,
    [characters, characterId],
  );

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
    const next = characters.find((item) => item.id === id);
    setCharacterId(id);
    if (next?.persona?.city) setPlace(next.persona.city);
    setDialogShot(null);
    setError("");
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
    if (createMode === "post-template") {
      if (!templateId) {
        setError("請先選擇貼文類型 (Post Type)");
        setTemplateDialogOpen(true);
        return;
      }
    } else if (!sceneUrl) {
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
        templateId: createMode === "post-template" && templateId ? templateId : undefined,
        compositionRefUrl:
          createMode === "post-template" && templateId && compositionRefUrl
            ? compositionRefUrl
            : undefined,
        poseId: poseId || undefined,
      });
      setPending("");
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) setCreditGate(true);
        return;
      }
      setShots((current) => [result.shot, ...current]);
    } catch {
      setPending("");
      setError(t("errors.lifeGenerateFailed"));
    }
  }

  async function onRegenerateFromHistory() {
    if (!dialogShot) return;
    const targetChar =
      characters.find((c) => c.id === dialogShot.characterId) || character;
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
      });
      setPending("");
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) setCreditGate(true);
        return;
      }
      setShots((current) => [result.shot, ...current]);
      setDialogShot(null);
      setHistoryEditPrompt("");
    } catch {
      setPending("");
      setError(t("errors.lifeGenerateFailed"));
    }
  }

  if (!characters.length) {
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

  const uploadHeaderButtons = (
    <>
      {place ? (
        <span className="rounded-full bg-accent-ink/6 px-2.5 py-0.5 text-[11px] font-medium text-muted">
          {place}
        </span>
      ) : null}
      {createMode !== "replace-person" ? (
        <button
          type="button"
          disabled={pending !== ""}
          onClick={() => setPlaceDialogOpen(true)}
          className="inline-flex h-7 shrink-0 cursor-pointer items-center rounded-full border border-accent-ink/20 bg-paper px-3 text-[11px] font-bold text-foreground transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("life.searchAction")}
        </button>
      ) : null}
      <label className="inline-flex h-7 shrink-0 cursor-pointer items-center rounded-full border border-accent-ink/20 bg-paper px-3 text-[11px] font-bold text-foreground transition hover:border-accent-ink">
        {pending === "upload"
          ? t("common.loading")
          : createMode === "replace-person"
            ? "上傳人物照片"
            : createMode === "post-template"
              ? "上傳背景照片"
              : t("life.upload")}
        <input
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
      </label>
      {sceneUrl ? (
        <button
          type="button"
          disabled={pending !== ""}
          onClick={() => {
            setSceneUrl("");
            resetRemarks();
          }}
          className="inline-flex h-7 shrink-0 cursor-pointer items-center rounded-full border border-accent-ink/15 px-2.5 text-[11px] font-semibold text-muted hover:text-red-600"
        >
          移除圖片
        </button>
      ) : null}
    </>
  );

  const sceneUploadAndCanvasSection = (
    <div className="space-y-2.5">
      {/* Drag & Drop Upload Zone + Interactive Remark / Person Selection Canvas */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith("image/")) {
            void onUpload(file);
          }
        }}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-3 transition ${
          isDragging
            ? "border-accent bg-accent/10"
            : "border-accent-ink/20 bg-paper/60"
        }`}
      >
        {!sceneUrl ? (
          <label className="flex min-h-[10rem] w-full cursor-pointer flex-col items-center justify-center gap-2 text-center">
            <span className="rounded-full bg-accent-ink/10 px-3 py-1 text-xs font-bold text-foreground">
              {createMode === "replace-person"
                ? "拖放含人物的照片至此，或點擊上傳"
                : createMode === "scene-place"
                  ? "拖放場景照片至此，或點擊上傳場景"
                  : "拖放背景場景照片至此，或點擊上傳（未上傳則自動生成背景）"}
            </span>
            <span className="max-w-sm text-[11px] text-muted">
              {createMode === "replace-person"
                ? "上傳後可在圖中人物身上點擊或塗抹圈選要替換的人物，AI 將替換為所選角色的臉、髮型與預設服裝"
                : createMode === "scene-place"
                  ? "上傳後 AI 會將角色自然放入此場景，亦可直接在圖上塗鴉標記角色站位"
                  : "若上傳場景圖，生成時會以該場景作為背景，並依照所選貼文類型與姿勢拍攝"}
            </span>
            <input
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
          </label>
        ) : (
          <div className="flex w-full flex-col gap-2.5">
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
                <label className="cursor-pointer rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted hover:text-foreground">
                  更換圖片
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      void onUpload(file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Image + Drawing Overlay Canvas */}
            <div className="relative mx-auto max-h-[16rem] overflow-hidden rounded-xl border border-accent-ink/15 bg-zinc-900 select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sceneUrl}
                alt="Scene reference"
                draggable={false}
                className="max-h-[16rem] w-auto object-contain"
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
          </div>
        )}
      </div>

      {/* Numbered Remark Comment Inputs (#1, #2, #3...) — shown only when remarks exist */}
      {sceneUrl && remarks.length > 0 ? (
        <div className="space-y-1.5 rounded-xl border border-accent-ink/12 bg-paper p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-foreground">
              {createMode === "replace-person"
                ? "已圈選要替換的人物說明（生成結果不會顯示塗鴉線條與編號）"
                : "標註位置說明（生成結果不會顯示塗鴉線條與編號）"}
            </span>
            <span className="inline-flex items-center rounded-full border border-accent-ink/12 bg-accent-ink/6 px-2 py-0.5 text-[10px] font-bold text-muted">
              圈選說明 · 可微調文字
            </span>
          </div>
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

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-4.5rem)] lg:overflow-hidden">
      {/* Compact Single-Row Studio Header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-accent-ink/10 bg-paper/90 px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="font-display text-lg font-bold">{t("life.title")}</h1>
          <span className="hidden text-xs text-muted sm:inline">
            {t("life.subtitle")}
          </span>
        </div>
      </header>

      {/* 3-Column Single-Screen Studio (Right Recent Column Widened to 30rem) */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[13.5rem_minmax(0,1fr)_30rem] lg:items-stretch">
        {/* Left Column: Character Rail */}
        <aside
          aria-label={t("life.character")}
          className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper/80 p-3"
        >
          <div className="flex shrink-0 items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
              {t("life.character")}
            </span>
            <span className="rounded-full bg-accent-ink/8 px-2 py-0.5 text-[10px] font-bold text-muted">
              {characters.length}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <LifeCharacterStrip
              characters={characters}
              selectedId={characterId}
              onSelect={selectCharacter}
            />
          </div>
          {character && !character.ready ? (
            <p className="shrink-0 rounded-xl bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600">
              {t("life.needBlueprint")}
            </p>
          ) : null}
        </aside>

        {/* Center Column: 3-Tab Creation Studio */}
        <section
          aria-label={t("life.place")}
          className="flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper/90"
        >
          {/* 3-Tab Switcher */}
          <LifeCreateTabs
            value={createMode}
            disabled={pending !== ""}
            onChange={(nextMode) => {
              setCreateMode(nextMode);
              setError("");
            }}
          />

          {/* Center Scrollable Form Body */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {createMode === "replace-person" ? (
              <>
                <LifeFormField
                  step={1}
                  label="上傳含人物照片 & 圈選替換目標"
                  required
                  hint="請上傳包含人物的照片，並在圖中點擊或塗抹圈選要替換的人物（若未圈選，系統會自動替換主體人物）。"
                  headerRight={uploadHeaderButtons}
                >
                  {sceneUploadAndCanvasSection}
                </LifeFormField>

                <LifeFormSeparator />

                <LifeFormField
                  step={2}
                  label="角色姿勢 (Pose)"
                  required={false}
                  hint="預設會保留原圖中被替換人物的姿勢與手勢；若想改用其他姿勢，可在此選填覆寫。"
                >
                  <LifePoseBar
                    poseId={poseId}
                    disabled={pending !== ""}
                    emptyHint="未選擇時將保留原圖被替換人物的姿勢；選擇後將改用新姿勢"
                    onOpenPicker={() => setPoseDialogOpen(true)}
                    onClear={() => setPoseId("")}
                  />
                </LifeFormField>

                <LifeFormSeparator />

                <LifeFormField
                  step={3}
                  label="補充替換說明 (Additional Instruction)"
                  required={false}
                  hint="若有多位人物或特殊要求，可在此輸入補充說明（不填寫亦可直接生成）。"
                >
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="選填：例如「只替換左邊穿深色外套的人物，保留右側朋友」、「面帶微笑看鏡頭」..."
                    className="h-9 w-full rounded-xl border border-accent-ink/15 bg-paper px-3 text-xs font-medium text-foreground focus-visible:outline-1 focus-visible:outline-accent"
                  />
                </LifeFormField>
              </>
            ) : createMode === "scene-place" ? (
              <>
                <LifeFormField
                  step={1}
                  label="場景照片 (Scene Image)"
                  required
                  hint="請上傳一張環境或風景照片（或搜尋地點照片），AI 會將所選角色自然放入此場景中；亦可直接在圖上塗鴉標記站位。"
                  headerRight={uploadHeaderButtons}
                >
                  {sceneUploadAndCanvasSection}
                </LifeFormField>

                <LifeFormSeparator />

                <LifeFormField
                  step={2}
                  label="場景融入描述 (Scene Description)"
                  required={false}
                  hint="描述希望角色如何出現在場景中（例如位置、互動動作或神情），或直接點選下方快捷標籤。"
                >
                  <div className="space-y-2 rounded-xl border border-accent-ink/12 bg-paper p-3">
                    <input
                      type="text"
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      placeholder="選填：例「讓角色坐在窗邊看著窗外」、「手拿咖啡自然走在街道中央」..."
                      className="h-9 w-full rounded-lg border border-accent-ink/15 bg-paper px-3 text-xs font-medium text-foreground focus-visible:outline-1 focus-visible:outline-accent"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-bold text-muted">
                        快捷描述：
                      </span>
                      {SCENE_PLACE_SHORTCUTS.map((sc) => {
                        const active = customInstruction === sc.prompt;
                        return (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() =>
                              setCustomInstruction(active ? "" : sc.prompt)
                            }
                            className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                              active
                                ? "border-accent bg-accent text-white"
                                : "border-accent-ink/15 bg-paper text-foreground hover:border-accent-ink/40"
                            }`}
                          >
                            {sc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </LifeFormField>

                <LifeFormSeparator />

                <LifeFormField
                  step={3}
                  label="角色姿勢 (Pose)"
                  required={false}
                  hint="可選填指定角色在場景中的身體姿勢與取景比例。"
                >
                  <LifePoseBar
                    poseId={poseId}
                    disabled={pending !== ""}
                    onOpenPicker={() => setPoseDialogOpen(true)}
                    onClear={() => setPoseId("")}
                  />
                </LifeFormField>
              </>
            ) : (
              <>
                <LifeFormField
                  step={1}
                  label="貼文類型 (Post Type)"
                  required
                  hint="選擇一種 IG 貼文構圖與情境指南，決定鏡頭角度、距離與畫面氛圍。"
                >
                  <LifeTemplateGuide
                    templateId={templateId}
                    compositionRefUrl={compositionRefUrl}
                    uploading={pending === "refUpload"}
                    disabled={pending !== ""}
                    onOpenPicker={() => setTemplateDialogOpen(true)}
                    onClear={() => {
                      setTemplateId("");
                      setCompositionRefUrl("");
                    }}
                    onUploadRef={(file) => void onUploadCompositionRef(file)}
                    onRemoveRef={() => setCompositionRefUrl("")}
                  />
                </LifeFormField>

                <LifeFormSeparator />

                <LifeFormField
                  step={2}
                  label="角色姿勢 (Pose)"
                  required={false}
                  hint="可選填搭配特定骨架姿勢；若未選擇則依照貼文類型自然擺拍。"
                >
                  <LifePoseBar
                    poseId={poseId}
                    disabled={pending !== ""}
                    onOpenPicker={() => setPoseDialogOpen(true)}
                    onClear={() => setPoseId("")}
                  />
                </LifeFormField>

                <LifeFormSeparator />

                <LifeFormField
                  step={3}
                  label="背景場景照片 (Scene Background)"
                  required={false}
                  hint="可選填上傳或搜尋場景照片作為背景；若未上傳，AI 會根據所選貼文類型自動生成真實背景。"
                  headerRight={uploadHeaderButtons}
                >
                  {sceneUploadAndCanvasSection}
                </LifeFormField>

                <LifeFormSeparator />

                <LifeFormField
                  step={4}
                  label="補充細節說明 (Custom Note)"
                  required={false}
                  hint="可選填補充光線、時間、道具或氛圍等細節要求。"
                >
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="選填：例如「傍晚暖陽逆光」、「桌上放著一杯冰拿鐵與書本」..."
                    className="h-9 w-full rounded-xl border border-accent-ink/15 bg-paper px-3 text-xs font-medium text-foreground focus-visible:outline-1 focus-visible:outline-accent"
                  />
                </LifeFormField>
              </>
            )}
          </div>

          {/* Bottom Action Dock inside Center Pane */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-accent-ink/10 bg-paper px-4 py-2.5">
            <p className="min-w-0 flex-1 truncate text-[11px] text-muted">
              {error ? (
                <span className="font-semibold text-red-600">{error}</span>
              ) : (
                t("life.uploadHint")
              )}
            </p>
            <button
              type="button"
              disabled={pending !== "" || !character?.ready}
              onClick={() => void onGenerate()}
              className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full bg-accent px-5 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "generate" ? (
                <Spinner className="mr-2 h-3.5 w-3.5" />
              ) : null}
              {pending === "generate"
                ? "排入背景佇列中..."
                : t("life.generate")}
              <span className="ml-2 font-medium opacity-85">
                · {t("life.cost", { cost: FRAME_COST })}
              </span>
            </button>
          </div>
        </section>

        {/* Right Column: Wider Recent Panel showing full Instagram-Style Grid View */}
        <aside
          aria-label={t("life.recent")}
          className="flex min-h-[24rem] flex-col gap-2.5 overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper p-3.5"
        >
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold">
              {character ? `${character.name} · ${t("life.recent")}` : t("life.recent")}
            </h2>
            <div className="flex items-center gap-1.5">
              {generatingCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-ink px-2 py-0.5 text-[10px] font-bold text-lime">
                  <Spinner className="h-3 w-3" />
                  {generatingCount} 張背景生成中
                </span>
              ) : null}
              {visibleShots.length > 0 ? (
                <span className="rounded-full bg-accent-ink/8 px-2 py-0.5 text-[10px] font-bold text-muted">
                  {visibleShots.length}
                </span>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
            <LifeShotGrid
              shots={visibleShots}
              selectedId={dialogShot?.id}
              onSelect={(shot) => {
                setDialogShot(shot);
                setHistoryEditPrompt("");
                setGeneratedCaption("");
                setCaptionCopied(false);
              }}
              compact
            />
          </div>
        </aside>
      </div>

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
              <div className="relative mx-auto max-h-[52dvh] overflow-hidden rounded-xl border border-accent-ink/10 bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dialogShot.resultUrl}
                  alt={dialogShot.characterName}
                  className="max-h-[52dvh] w-auto object-contain"
                />
              </div>

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
                <button
                  type="button"
                  disabled={downloadingPng}
                  onClick={async () => {
                    setDownloadingPng(true);
                    try {
                      await downloadLifeShotAsPng({
                        url: dialogShot.resultUrl,
                        characterName: dialogShot.characterName,
                        place: dialogShot.place,
                        id: dialogShot.id,
                      });
                    } catch (caught) {
                      setError(
                        caught instanceof Error
                          ? translateAppError(caught.message, t)
                          : t("errors.genericRetry"),
                      );
                    } finally {
                      setDownloadingPng(false);
                    }
                  }}
                  className="cursor-pointer rounded-full border border-accent-ink/15 bg-paper px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloadingPng ? "下載 PNG 中..." : "下載原圖"}
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
