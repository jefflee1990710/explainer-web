"use client";

import { useMemo, useState } from "react";
import {
  POST_ASPECT_RATIOS,
  type DetectedPostElement,
  type PostAspectRatio,
  type PostElementCategory,
  type PostElementEditMode,
  type PublicPost,
} from "@/model/post";
import {
  createPostJobAction,
  deletePostJobAction,
  editPostElementJobAction,
  redetectPostElementsAction,
  selectPostRevisionAction,
} from "@/presentation/actions/posts";
import {
  buildCastSlotItems,
  cycleOption,
  DirectorDockCastGroup,
  DirectorDockComposer,
  DirectorDockDivider,
  DirectorDockHero,
  DirectorDockPanel,
  DirectorDockPill,
  DirectorDockQuickTile,
  DirectorDockStage,
  DirectorDockStepperCell,
} from "@/presentation/components/app/director-dock";
import { LookCardImage } from "@/presentation/components/app/jutsu/look-card-image";
import {
  PostElementRleOverlay,
  PostElementTabsBar,
} from "@/presentation/components/app/posts/post-element-rle-mapper";
import { PostHistoryDialog } from "@/presentation/components/app/posts/post-history-dialog";
import { CharacterSelectDialog } from "@/presentation/components/app/projects/[id]/character-select-dialog";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StyleSelectDialog } from "@/presentation/components/style-select-dialog";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
  PublicProduct,
  PublicStyle,
} from "@/presentation/serialize";
import type { CharacterSelectionMap } from "@/service/character/character-presets";
import { FRAME_COST } from "@/service/credit-costs";

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

export function PostStudio({
  initialPosts,
  styles,
  characters,
  products,
  initialPostId,
}: {
  initialPosts: PublicPost[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  products: PublicProduct[];
  initialPostId?: string;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const historyLabel =
    locale === "zh-Hant"
      ? "歷史紀錄"
      : locale === "zh-Hans"
        ? "历史记录"
        : "History";

  const [posts, setPosts] = useState<PublicPost[]>(initialPosts);
  const [activePost, setActivePost] = useState<PublicPost | null>(() => {
    if (initialPostId) {
      return initialPosts.find((p) => p.id === initialPostId) ?? initialPosts[0] ?? null;
    }
    return initialPosts[0] ?? null;
  });
  const [historyOpen, setHistoryOpen] = useState(false);

  // Studio mode: "create" (generate new post) or "edit" (SAM element selection & regeneration)
  const [studioMode, setStudioMode] = useState<"create" | "edit">(() =>
    initialPostId && initialPosts.some((p) => p.id === initialPostId)
      ? "edit"
      : "create",
  );

  // Create Mode state
  const [createPrompt, setCreatePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<PostAspectRatio>("9:16");
  const [selectedStyleId, setSelectedStyleId] = useState<string>(
    styles[0]?.id ?? "",
  );
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [characterSelections, setCharacterSelections] = useState<CharacterSelectionMap>({});
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>("");
  const [sourceImageUrl, setSourceImageUrl] = useState<string>("");
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [characterDialogOpen, setCharacterDialogOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  // SAM Edit Mode state
  const [categoryFilter, setCategoryFilter] = useState<"all" | PostElementCategory>("all");
  const [activeElementId, setActiveElementId] = useState<string | null>(
    activePost?.detectedElements[0]?.id ?? null,
  );
  const [editMode, setEditMode] = useState<PostElementEditMode>("change");
  const [editInstruction, setEditInstruction] = useState("");
  const [swapCharacterId, setSwapCharacterId] = useState<string>(
    characters[0]?.id ?? "",
  );
  const [swapLookUrl, setSwapLookUrl] = useState<string>(
    defaultCharacterLookUrl(characters[0]),
  );
  const [replaceProductId, setReplaceProductId] = useState<string>(
    products[0]?.id ?? "",
  );
  const [editReferenceUrl, setEditReferenceUrl] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [switchingRevision, setSwitchingRevision] = useState(false);
  const [error, setError] = useState("");

  const selectedElement: DetectedPostElement | null = useMemo(() => {
    if (!activePost || activePost.detectedElements.length === 0) return null;
    if (activeElementId) {
      const found = activePost.detectedElements.find(
        (e) => e.id === activeElementId,
      );
      if (found) return found;
    }
    return activePost.detectedElements[0] ?? null;
  }, [activePost, activeElementId]);

  const effectiveElementId = selectedElement?.id ?? null;

  function handleSelectElement(id: string) {
    setActiveElementId(id);
    const el = activePost?.detectedElements.find((e) => e.id === id);
    if (!el) return;
    if (el.category === "person") {
      setEditMode("swap_character");
    } else if (el.category === "object") {
      setEditMode(products.length > 0 ? "replace_product" : "change");
    } else {
      setEditMode("change");
    }
  }

  const activeStyle = useMemo(
    () => styles.find((s) => s.id === selectedStyleId) ?? styles[0] ?? null,
    [styles, selectedStyleId],
  );

  const selectedSwapChar = useMemo(
    () => characters.find((c) => c.id === swapCharacterId) ?? characters[0] ?? null,
    [characters, swapCharacterId],
  );

  const castSlots = useMemo(
    () =>
      buildCastSlotItems(
        selectedCharacterIds,
        characters.map((c) => ({
          id: c.id,
          name: c.name,
          previewUrl: c.previewUrl ?? undefined,
        })),
        2,
      ),
    [selectedCharacterIds, characters],
  );

  const selectedCreateProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  function syncUpdatedPost(updated: PublicPost) {
    setActivePost(updated);
    setPosts((prev) => [
      updated,
      ...prev.filter((item) => item.id !== updated.id),
    ]);
    const first = updated.detectedElements[0];
    setActiveElementId(first?.id ?? null);
    if (first?.category === "person") {
      setEditMode("swap_character");
    } else if (first?.category === "object") {
      setEditMode(products.length > 0 ? "replace_product" : "change");
    } else {
      setEditMode("change");
    }
  }

  async function handleCreatePost() {
    if (submitting) return;
    if (!createPrompt.trim() && !sourceImageUrl.trim()) {
      setError(
        isEn
          ? "Enter a post description or upload a post image."
          : "請輸入貼文主題描述，或上傳一張貼文圖片。",
      );
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const characterLookUrls: Record<string, string> = {};
      for (const cid of selectedCharacterIds) {
        const sel = characterSelections[cid];
        const charDoc = characters.find((c) => c.id === cid);
        if (!sel || !charDoc) continue;
        if (sel.presetId) {
          const preset = charDoc.presets?.find((p) => p.id === sel.presetId);
          const url = preset ? presetImageUrl(preset, charDoc) : "";
          if (url) characterLookUrls[cid] = url;
        } else if (sel.versionId) {
          const ver = charDoc.versions.find((v) => v.id === sel.versionId);
          const url = versionImageUrl(ver);
          if (url) characterLookUrls[cid] = url;
        }
      }
      const res = await createPostJobAction({
        prompt: createPrompt.trim(),
        aspectRatio,
        styleId: selectedStyleId || undefined,
        characterIds: selectedCharacterIds,
        characterLookUrls,
        productIds: selectedProductId ? [selectedProductId] : [],
        referenceImageUrl: referenceImageUrl || undefined,
        sourceImageUrl: sourceImageUrl || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      syncUpdatedPost(res.post);
      setActiveElementId(res.post.detectedElements[0]?.id ?? null);
      setStudioMode("edit");
      notifyTasksChanged();
    } catch {
      setError(isEn ? "Failed to generate post." : "生成貼文失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditElement() {
    if (submitting || !activePost || !selectedElement) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await editPostElementJobAction({
        postId: activePost.id,
        elementId: selectedElement.id,
        editMode,
        instruction: editInstruction.trim() || undefined,
        characterId:
          selectedElement.category === "person" && editMode === "swap_character"
            ? swapCharacterId || undefined
            : undefined,
        characterLookUrl:
          selectedElement.category === "person" && editMode === "swap_character"
            ? swapLookUrl || undefined
            : undefined,
        productId:
          selectedElement.category === "object" && editMode === "replace_product"
            ? replaceProductId || undefined
            : undefined,
        referenceImageUrl: editReferenceUrl || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      syncUpdatedPost(res.post);
      setActiveElementId(res.post.detectedElements[0]?.id ?? null);
      setEditInstruction("");
      notifyTasksChanged();
    } catch {
      setError(
        isEn ? "Failed to modify selected element." : "局部修改失敗，請稍後再試",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRedetect() {
    if (!activePost || detecting) return;
    setError("");
    setDetecting(true);
    try {
      const res = await redetectPostElementsAction(activePost.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      syncUpdatedPost(res.post);
      setActiveElementId(res.post.detectedElements[0]?.id ?? null);
    } finally {
      setDetecting(false);
    }
  }

  async function handleSelectRevision(revisionId: string) {
    if (!activePost || switchingRevision) return;
    setError("");
    setSwitchingRevision(true);
    try {
      const res = await selectPostRevisionAction({
        postId: activePost.id,
        revisionId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      syncUpdatedPost(res.post);
      setActiveElementId(res.post.detectedElements[0]?.id ?? null);
    } finally {
      setSwitchingRevision(false);
    }
  }

  async function handleDeletePost(id: string) {
    const res = await deletePostJobAction(id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPosts((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (activePost?.id === id) {
        setActivePost(next[0] ?? null);
      }
      return next;
    });
  }

  const canSubmitCreate =
    !submitting && Boolean(createPrompt.trim() || sourceImageUrl.trim());
  const canSubmitEdit =
    !submitting && Boolean(activePost?.currentImageUrl && selectedElement);

  const editPromptPlaceholder = useMemo(() => {
    if (!selectedElement) {
      return isEn
        ? "Click any SAM mask above (Person, Object, or Text) to edit it…"
        : "請先在上方畫布點選要修改的「人物」、「物件」或「文字」遮罩…";
    }
    const name = isEn
      ? selectedElement.label
      : selectedElement.labelZh || selectedElement.label;
    if (editMode === "remove") {
      return isEn
        ? `Ready to remove ${name} and fill background seamlessly (optional extra note)…`
        : `準備無縫移除「${name}」並補齊背景（可選填補充說明）…`;
    }
    if (selectedElement.category === "text") {
      return isEn
        ? `Type the new text to replace ${name} (e.g. "SUMMER SALE 50% OFF")…`
        : `輸入要替換「${name}」的新文字內容（保留原海報字體風格與排版）…`;
    }
    if (selectedElement.category === "person" && editMode === "swap_character") {
      return isEn
        ? `Replacing ${name} with selected character (optional pose/lighting note)…`
        : `將「${name}」替換為所選角色與穿搭（可選填補充動作或光影要求）…`;
    }
    if (selectedElement.category === "object" && editMode === "replace_product") {
      return isEn
        ? `Replacing ${name} with selected product/reference (optional placement note)…`
        : `將「${name}」替換為所選產品或參考圖（可選填擺放角度或細節描述）…`;
    }
    return isEn
      ? `Describe how to modify ${name} (e.g. "change to iced matcha latte")…`
      : `描述你想如何修改「${name}」（例如：改成冰抹茶拿鐵、換成紅色太陽眼鏡）…`;
  }, [selectedElement, editMode, isEn]);

  return (
    <DirectorDockStage
      topLeft={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white/90 px-3 py-1 text-xs font-bold text-[#12141c] shadow-xs">
          <span className="h-2 w-2 rounded-full bg-[#c6f24b]" />
          <span>Post SAM Studio · 2K</span>
        </span>
      }
      topRight={
        <div className="flex items-center gap-2">
          {activePost ? (
            <button
              type="button"
              onClick={() =>
                setStudioMode((m) => (m === "create" ? "edit" : "create"))
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-[#12141c] shadow-xs transition hover:border-[#12141c]"
            >
              <span>{studioMode === "create" ? "🎯" : "✨"}</span>
              <span>
                {studioMode === "create"
                  ? isEn
                    ? "Edit Current Post in SAM"
                    : "進入 SAM 局部編輯"
                  : isEn
                    ? "New Post"
                    : "建立新貼文"}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-[#12141c] shadow-xs transition hover:border-[#12141c]"
          >
            <span>{historyLabel}</span>
            <span className="rounded-full bg-[#12141c] px-2 py-0.5 font-display text-[11px] font-bold text-[#c6f24b]">
              {posts.length}
            </span>
          </button>
        </div>
      }
      bottomContent={
        activePost ? (
          <div className="mx-auto mt-6 w-full max-w-4xl rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#12141c] px-2.5 py-0.5 font-display text-[11px] font-bold text-[#c6f24b]">
                  V{Math.max(1, activePost.revisions.length)}
                </span>
                <span className="text-xs font-bold text-[#12141c]">
                  {isEn ? "Revision History" : "版本修改紀錄（點擊任意版本即可切換或繼續編輯）"}
                </span>
              </div>
              {activePost.currentImageUrl ? (
                <a
                  href={activePost.currentImageUrl}
                  download={`post-${activePost.id}.webp`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-[#12141c] px-3 py-1 text-xs font-bold text-[#c6f24b]"
                >
                  <span>↓</span>
                  <span>{isEn ? "Download 2K WebP" : "下載 2K 海報"}</span>
                </a>
              ) : null}
            </div>

            {activePost.revisions.length > 0 ? (
              <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
                {activePost.revisions.map((rev, idx) => {
                  const isCurrent = rev.imageUrl === activePost.currentImageUrl;
                  return (
                    <button
                      key={rev.revisionId}
                      type="button"
                      disabled={switchingRevision || submitting}
                      onClick={() => void handleSelectRevision(rev.revisionId)}
                      className={`group flex w-36 shrink-0 cursor-pointer items-center gap-2 rounded-xl border p-1.5 text-left transition ${
                        isCurrent
                          ? "border-2 border-[#12141c] bg-zinc-50 ring-2 ring-[#c6f24b]"
                          : "border-zinc-200 bg-white hover:border-zinc-400"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rev.imageUrl}
                        alt={rev.editSummary || rev.revisionId}
                        className="h-12 w-10 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-[11px] font-extrabold text-[#12141c]">
                          V{idx + 1}
                        </div>
                        <div className="truncate text-[10px] font-semibold text-zinc-500">
                          {rev.editSummary || (idx === 0 ? "初始版本" : rev.prompt)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <DirectorDockHero kind="posts" />

      {/* Director Panel */}
      <DirectorDockPanel
        title={
          studioMode === "create"
            ? isEn
              ? "🎬 Post Director Panel"
              : "🎬 海報導演面板"
            : isEn
              ? "🎯 SAM Element Edit Panel"
              : "🎯 SAM 元素重繪面板"
        }
      >
        {studioMode === "create" ? (
          <>
            <DirectorDockCastGroup
              badgeLabel={isEn ? "Cast" : "角色"}
              slots={castSlots}
              onOpenPicker={() => setCharacterDialogOpen(true)}
              disabled={submitting}
            />
            <DirectorDockDivider />
            <DirectorDockStepperCell
              label={isEn ? "Visual Style" : "視覺風格"}
              value={activeStyle?.name || (isEn ? "Realistic" : "寫實風格")}
              thumbUrl={activeStyle?.previewUrl}
              onClick={() => setStyleDialogOpen(true)}
              onPrev={() => {
                if (styles.length === 0) return;
                const next = cycleOption(styles, activeStyle ?? styles[0]!, -1);
                setSelectedStyleId(next.id);
              }}
              onNext={() => {
                if (styles.length === 0) return;
                const next = cycleOption(styles, activeStyle ?? styles[0]!, 1);
                setSelectedStyleId(next.id);
              }}
              disabled={submitting}
            />
            <DirectorDockDivider />
            <DirectorDockStepperCell
              label={isEn ? "Product" : "產品植入"}
              value={
                selectedCreateProduct?.name ||
                (isEn ? "None (Optional)" : "無（選填）")
              }
              thumbUrl={selectedCreateProduct?.blueprintUrl}
              onClick={() => {
                if (products.length === 0) return;
                const ids = ["", ...products.map((p) => p.id)];
                setSelectedProductId(cycleOption(ids, selectedProductId, 1));
              }}
              onPrev={() => {
                if (products.length === 0) return;
                const ids = ["", ...products.map((p) => p.id)];
                setSelectedProductId(cycleOption(ids, selectedProductId, -1));
              }}
              onNext={() => {
                if (products.length === 0) return;
                const ids = ["", ...products.map((p) => p.id)];
                setSelectedProductId(cycleOption(ids, selectedProductId, 1));
              }}
              disabled={submitting}
            />
            <DirectorDockDivider />
            <DirectorDockStepperCell
              label={isEn ? "Aspect Ratio" : "海報比例"}
              value={aspectRatio}
              onClick={() =>
                setAspectRatio(cycleOption(POST_ASPECT_RATIOS, aspectRatio, 1))
              }
              onPrev={() =>
                setAspectRatio(cycleOption(POST_ASPECT_RATIOS, aspectRatio, -1))
              }
              onNext={() =>
                setAspectRatio(cycleOption(POST_ASPECT_RATIOS, aspectRatio, 1))
              }
              disabled={submitting}
            />
          </>
        ) : (
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-[#12141c]">
                {selectedElement
                  ? `${selectedElement.category === "person" ? "👤" : selectedElement.category === "object" ? "📦" : "🔤"} ${
                      isEn
                        ? selectedElement.label
                        : selectedElement.labelZh || selectedElement.label
                    }`
                  : isEn
                    ? "Select an element on the post"
                    : "請點擊下方海報中的元素"}
              </span>

              {selectedElement?.category === "person" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "swap_character", label: isEn ? "Swap Character" : "替換角色" },
                      { id: "change", label: isEn ? "Prompt Edit" : "指令修改" },
                      { id: "remove", label: isEn ? "Remove" : "移除人物" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEditMode(m.id)}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                        editMode === m.id
                          ? "bg-[#12141c] text-[#c6f24b]"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              ) : selectedElement?.category === "object" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "replace_product", label: isEn ? "Replace with Product" : "替換產品／圖片" },
                      { id: "change", label: isEn ? "Prompt Edit" : "指令修改" },
                      { id: "remove", label: isEn ? "Remove" : "移除物件" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEditMode(m.id)}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                        editMode === m.id
                          ? "bg-[#12141c] text-[#c6f24b]"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              ) : selectedElement?.category === "text" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "change", label: isEn ? "Rewrite Text" : "原位改字" },
                      { id: "remove", label: isEn ? "Remove Text" : "移除文字" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEditMode(m.id)}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                        editMode === m.id
                          ? "bg-[#12141c] text-[#c6f24b]"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Context-sensitive character or product selector strip */}
            {selectedElement?.category === "person" &&
            editMode === "swap_character" &&
            characters.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={swapCharacterId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSwapCharacterId(nextId);
                    const nextChar = characters.find((c) => c.id === nextId);
                    setSwapLookUrl(defaultCharacterLookUrl(nextChar));
                  }}
                  className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#12141c]"
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      👤 {c.name}
                    </option>
                  ))}
                </select>
                {selectedSwapChar && (selectedSwapChar.presets?.length ?? 0) > 0 ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {selectedSwapChar.presets!.slice(0, 4).map((preset) => {
                      const url = presetImageUrl(preset, selectedSwapChar);
                      if (!url) return null;
                      const active = swapLookUrl === url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSwapLookUrl(url)}
                          className={`relative h-9 w-7 shrink-0 cursor-pointer overflow-hidden rounded-lg border transition ${
                            active
                              ? "border-2 border-[#12141c] ring-2 ring-[#c6f24b]"
                              : "border-zinc-200 opacity-75 hover:opacity-100"
                          }`}
                          title={preset.name}
                        >
                          <LookCardImage src={url} alt={preset.name} />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            {selectedElement?.category === "object" &&
            editMode === "replace_product" &&
            products.length > 0 ? (
              <select
                value={replaceProductId}
                onChange={(e) => setReplaceProductId(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#12141c]"
              >
                <option value="">
                  {isEn ? "Select a Product…" : "選擇要植入的產品…"}
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    📦 {p.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        )}
      </DirectorDockPanel>

      {/* Main Composer & Interactive SAM Stage */}
      <DirectorDockComposer
        modeItems={[
          {
            id: "create",
            label: isEn ? "Create" : "生貼文",
            icon: <span>✨</span>,
          },
          {
            id: "edit",
            label: isEn ? "SAM Edit" : "SAM 改圖",
            icon: <span>🎯</span>,
          },
        ]}
        activeModeId={studioMode}
        onSelectMode={(id) => setStudioMode(id === "edit" ? "edit" : "create")}
        promptValue={studioMode === "create" ? createPrompt : editInstruction}
        onPromptChange={(val) => {
          if (studioMode === "create") setCreatePrompt(val);
          else setEditInstruction(val);
        }}
        promptPlaceholder={
          studioMode === "create"
            ? isEn
              ? "Describe your social post or poster (include headline text in quotes if desired)…"
              : "描述你想生成的貼文或海報畫面（若有標題文案可直接寫在描述中，或右側上傳現有海報直接用 SAM 改圖）…"
            : editPromptPlaceholder
        }
        topMediaSlot={
          studioMode === "edit" && activePost?.currentImageUrl ? (
            <div className="space-y-2.5">
              <div className="relative mx-auto flex max-h-[420px] w-fit items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePost.currentImageUrl}
                  alt={activePost.prompt}
                  className="max-h-[420px] w-auto object-contain select-none"
                />
                <PostElementRleOverlay
                  elements={activePost.detectedElements}
                  activeElementId={effectiveElementId}
                  categoryFilter={categoryFilter}
                  onSelectElement={handleSelectElement}
                  isEn={isEn}
                />
              </div>

              <PostElementTabsBar
                elements={activePost.detectedElements}
                detecting={detecting}
                activeElementId={effectiveElementId}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                onSelectElement={handleSelectElement}
                onRedetect={() => void handleRedetect()}
                disabled={submitting}
                isEn={isEn}
              />
            </div>
          ) : undefined
        }
        plusMenuOpen={plusMenuOpen}
        onPlusToggle={() => setPlusMenuOpen((v) => !v)}
        plusMenuSlot={
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#12141c]">
              {isEn ? "Upload Image" : "上傳圖片"}
            </div>
            {studioMode === "create" ? (
              <div className="space-y-2">
                <BrandUploadButton
                  accept="image/png,image/jpeg,image/webp"
                  label={
                    isEn
                      ? "Upload Composition Reference (Ref Layout)"
                      : "上傳構圖參考圖（Ref Layout）"
                  }
                  onUploaded={({ url }) => {
                    setReferenceImageUrl(url);
                    setPlusMenuOpen(false);
                  }}
                  onError={(msg) => setError(msg)}
                />
                <BrandUploadButton
                  accept="image/png,image/jpeg,image/webp"
                  label={
                    isEn
                      ? "Upload Existing Post to Edit in SAM"
                      : "上傳現有海報直接進入 SAM 分割編輯"
                  }
                  onUploaded={({ url }) => {
                    setSourceImageUrl(url);
                    setPlusMenuOpen(false);
                  }}
                  onError={(msg) => setError(msg)}
                />
              </div>
            ) : (
              <BrandUploadButton
                accept="image/png,image/jpeg,image/webp"
                label={
                  isEn
                    ? "Upload Donor / Reference Image"
                    : "上傳替換參考圖片"
                }
                onUploaded={({ url }) => {
                  setEditReferenceUrl(url);
                  setPlusMenuOpen(false);
                }}
                onError={(msg) => setError(msg)}
              />
            )}
          </div>
        }
        pills={
          studioMode === "create" ? (
            <>
              <DirectorDockPill
                accentBadge="2K"
                label="Seedream 5.0 Pro"
                disabled={submitting}
              />
              <DirectorDockPill
                label={aspectRatio}
                hasChevron
                onClick={() =>
                  setAspectRatio(cycleOption(POST_ASPECT_RATIOS, aspectRatio, 1))
                }
                disabled={submitting}
              />
              <DirectorDockPill
                label={activeStyle?.name || (isEn ? "Style" : "視覺風格")}
                hasChevron
                onClick={() => setStyleDialogOpen(true)}
                disabled={submitting}
              />
            </>
          ) : (
            <>
              <DirectorDockPill
                accentBadge="SAM 3"
                label={
                  selectedElement
                    ? isEn
                      ? selectedElement.label
                      : selectedElement.labelZh || selectedElement.label
                    : isEn
                      ? "Pick Element"
                      : "點選元素"
                }
                disabled={submitting}
              />
              <DirectorDockPill
                label={
                  editMode === "swap_character"
                    ? isEn
                      ? "Swap Character"
                      : "替換角色"
                    : editMode === "replace_product"
                      ? isEn
                        ? "Replace Product"
                        : "替換產品"
                      : editMode === "remove"
                        ? isEn
                          ? "Remove Element"
                          : "無縫移除"
                        : isEn
                          ? "Modify Element"
                          : "局部重繪"
                }
                disabled={submitting}
              />
            </>
          )
        }
        rightSlot1={
          studioMode === "create" ? (
            <DirectorDockQuickTile
              label={isEn ? "Ref Layout" : "構圖參考"}
              badge={isEn ? "Opt" : "可選"}
              thumbUrl={referenceImageUrl || undefined}
              onClick={() => setPlusMenuOpen(true)}
              onClear={
                referenceImageUrl ? () => setReferenceImageUrl("") : undefined
              }
              disabled={submitting}
            />
          ) : (
            <DirectorDockQuickTile
              label={
                selectedElement?.category === "person"
                  ? isEn
                    ? "Character"
                    : "替換角色"
                  : selectedElement?.category === "object"
                    ? isEn
                      ? "Product"
                      : "替換產品"
                    : isEn
                      ? "Base Post"
                      : "目前海報"
              }
              thumbUrl={
                selectedElement?.category === "person"
                  ? swapLookUrl || undefined
                  : selectedElement?.category === "object"
                    ? products.find((p) => p.id === replaceProductId)?.blueprintUrl
                    : activePost?.currentImageUrl
              }
              onClick={() => {
                if (selectedElement?.category === "person" && characters.length > 0) {
                  const ids = characters.map((c) => c.id);
                  const nextId = cycleOption(ids, swapCharacterId, 1);
                  setSwapCharacterId(nextId);
                  setSwapLookUrl(
                    defaultCharacterLookUrl(characters.find((c) => c.id === nextId)),
                  );
                } else if (selectedElement?.category === "object" && products.length > 0) {
                  const ids = products.map((p) => p.id);
                  setReplaceProductId(cycleOption(ids, replaceProductId, 1));
                }
              }}
              disabled={submitting}
            />
          )
        }
        rightSlot2={
          studioMode === "create" ? (
            <DirectorDockQuickTile
              label={isEn ? "Source Post" : "現有海報"}
              badge={isEn ? "SAM" : "直接分割"}
              thumbUrl={sourceImageUrl || undefined}
              onClick={() => setPlusMenuOpen(true)}
              onClear={sourceImageUrl ? () => setSourceImageUrl("") : undefined}
              disabled={submitting}
            />
          ) : (
            <DirectorDockQuickTile
              label={isEn ? "Donor Image" : "自訂參考圖"}
              badge={isEn ? "Opt" : "可選"}
              thumbUrl={editReferenceUrl || undefined}
              onClick={() => setPlusMenuOpen(true)}
              onClear={
                editReferenceUrl ? () => setEditReferenceUrl("") : undefined
              }
              disabled={submitting}
            />
          )
        }
        onGenerate={() => {
          if (studioMode === "create") {
            void handleCreatePost();
          } else {
            void handleEditElement();
          }
        }}
        generateDisabled={
          studioMode === "create" ? !canSubmitCreate : !canSubmitEdit
        }
        generating={submitting}
        generateLabel={
          studioMode === "create"
            ? sourceImageUrl && !createPrompt.trim()
              ? isEn
                ? "Scan SAM"
                : "SAM 分割"
              : isEn
                ? "Generate"
                : "生成海報"
            : isEn
              ? "Regenerate"
              : "重繪元素"
        }
        creditBadge={
          studioMode === "create" && sourceImageUrl && !createPrompt.trim()
            ? 0
            : FRAME_COST
        }
        error={error}
      />

      {styleDialogOpen ? (
        <StyleSelectDialog
          styles={styles}
          selectedIds={selectedStyleId ? [selectedStyleId] : []}
          maxSelect={1}
          isMulti={false}
          onPick={(id) => {
            setSelectedStyleId(id);
            setStyleDialogOpen(false);
          }}
          onClose={() => setStyleDialogOpen(false)}
        />
      ) : null}

      {characterDialogOpen ? (
        <CharacterSelectDialog
          characters={characters}
          styleId={selectedStyleId}
          value={selectedCharacterIds}
          selections={characterSelections}
          max={2}
          required={0}
          onChange={setSelectedCharacterIds}
          onSelectionsChange={setCharacterSelections}
          onClose={() => setCharacterDialogOpen(false)}
        />
      ) : null}

      <PostHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        posts={posts}
        activePostId={activePost?.id ?? null}
        onSelectPost={(post) => {
          setActivePost(post);
          setActiveElementId(post.detectedElements[0]?.id ?? null);
          setStudioMode("edit");
        }}
        onDeletePost={(id) => void handleDeletePost(id)}
      />
    </DirectorDockStage>
  );
}
