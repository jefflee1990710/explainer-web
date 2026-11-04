"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type {
  DetectedPostElement,
  PostElementCategory,
  PostElementEditMode,
  PublicPost,
} from "@/model/post";
import {
  editPostElementJobAction,
  redetectPostElementsAction,
  selectPostRevisionAction,
} from "@/presentation/actions/posts";
import { LookCardImage } from "@/presentation/components/app/jutsu/look-card-image";
import {
  PostElementRleOverlay,
  PostElementTabsBar,
} from "@/presentation/components/app/posts/post-element-rle-mapper";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
  PublicProduct,
} from "@/presentation/serialize";
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

export function PostHistoryDialog({
  open,
  onClose,
  posts,
  characters,
  products,
  editingPostId,
  onSelectEditingPostId,
  onPostUpdated,
  onDeletePost,
}: {
  open: boolean;
  onClose: () => void;
  posts: PublicPost[];
  characters: PublicCharacter[];
  products: PublicProduct[];
  editingPostId: string | null;
  onSelectEditingPostId: (id: string | null) => void;
  onPostUpdated: (post: PublicPost) => void;
  onDeletePost: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const activePost = useMemo(
    () => (editingPostId ? posts.find((p) => p.id === editingPostId) ?? null : null),
    [posts, editingPostId],
  );

  const [categoryFilter, setCategoryFilter] = useState<"all" | PostElementCategory>("all");
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedElement: DetectedPostElement | null = useMemo(() => {
    if (!activePost || activePost.detectedElements.length === 0) return null;
    if (activeElementId) {
      const found = activePost.detectedElements.find((e) => e.id === activeElementId);
      if (found) return found;
    }
    return activePost.detectedElements[0] ?? null;
  }, [activePost, activeElementId]);

  const effectiveElementId = selectedElement?.id ?? null;

  const selectedSwapChar = useMemo(
    () => characters.find((c) => c.id === swapCharacterId) ?? characters[0] ?? null,
    [characters, swapCharacterId],
  );

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

  function openPostInSam(post: PublicPost) {
    onSelectEditingPostId(post.id);
    setCategoryFilter("all");
    setError("");
    const first = post.detectedElements[0];
    setActiveElementId(first?.id ?? null);
    if (first?.category === "person") {
      setEditMode("swap_character");
    } else if (first?.category === "object") {
      setEditMode(products.length > 0 ? "replace_product" : "change");
    } else {
      setEditMode("change");
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
      onPostUpdated(res.post);
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
      onPostUpdated(res.post);
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
      onPostUpdated(res.post);
      setActiveElementId(res.post.detectedElements[0]?.id ?? null);
    } finally {
      setSwitchingRevision(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  const host = document.getElementById("studio-dialog-root") ?? document.body;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[140] grid place-items-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-accent-ink/15 bg-paper shadow-2xl"
      >
        {/* Dialog Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div className="flex items-center gap-3">
            {activePost ? (
              <button
                type="button"
                onClick={() => {
                  onSelectEditingPostId(null);
                  setError("");
                }}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3 text-xs font-bold text-[#12141c] hover:border-[#12141c]"
              >
                <span>←</span>
                <span>{isEn ? "All Posts" : "返回列表"}</span>
              </button>
            ) : null}
            <h2 id={titleId} className="font-display text-lg font-bold">
              {activePost
                ? isEn
                  ? "Interactive Poster Editor"
                  : "海報元素互動編輯"
                : isEn
                  ? "Poster History"
                  : "海報貼文歷史紀錄 · Poster History"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {activePost?.currentImageUrl ? (
              <a
                href={activePost.currentImageUrl}
                download={`post-${activePost.id}.webp`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-2xl bg-[#12141c] px-3.5 text-xs font-bold text-[#c6f24b]"
              >
                <span>{isEn ? "Download 2K" : "下載 2K 海報"}</span>
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Dialog Body: Either SAM Editor for `activePost` OR Post History Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {activePost ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Interactive SAM 3 Canvas + Element Tabs + Revisions */}
              <div className="space-y-3 lg:col-span-7">
                {activePost.currentImageUrl ? (
                  <div className="relative mx-auto flex max-h-[480px] w-fit items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activePost.currentImageUrl}
                      alt={activePost.prompt}
                      className="max-h-[480px] w-auto object-contain select-none"
                    />
                    <PostElementRleOverlay
                      elements={activePost.detectedElements}
                      activeElementId={effectiveElementId}
                      categoryFilter={categoryFilter}
                      onSelectElement={handleSelectElement}
                      isEn={isEn}
                    />
                  </div>
                ) : null}

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

                {activePost.revisions.length > 1 ? (
                  <div className="flex items-center gap-2 overflow-x-auto pt-1">
                    <span className="text-[11px] font-bold text-zinc-500">
                      {isEn ? "Revisions:" : "版本紀錄:"}
                    </span>
                    {activePost.revisions.map((rev, idx) => {
                      const isCurrent = rev.imageUrl === activePost.currentImageUrl;
                      return (
                        <button
                          key={rev.revisionId}
                          type="button"
                          disabled={switchingRevision || submitting}
                          onClick={() => void handleSelectRevision(rev.revisionId)}
                          className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl border px-3 py-1 text-xs font-bold transition ${
                            isCurrent
                              ? "border-[#12141c] bg-[#12141c] text-[#c6f24b]"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                          }`}
                        >
                          <span>V{idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {/* Right Column: SAM Element Edit Inspector */}
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-200 bg-[#f4f4f5] p-5 lg:col-span-5">
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      {isEn ? "Selected Element" : "目前選取元素"}
                    </span>
                    <h3 className="mt-1 font-display text-base font-bold text-[#12141c]">
                      {selectedElement
                        ? isEn
                          ? selectedElement.label
                          : selectedElement.labelZh || selectedElement.label
                        : isEn
                          ? "Click any mask on the poster"
                          : "請點擊左側海報上的任意元素遮罩"}
                    </h3>
                  </div>

                  {selectedElement ? (
                    <>
                      {/* Action Mode Selector */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-zinc-600">
                          {isEn ? "Edit Action" : "修改方式"}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedElement.category === "person"
                            ? ([
                                { id: "swap_character", label: isEn ? "Swap Character" : "替換角色" },
                                { id: "change", label: isEn ? "Prompt Edit" : "指令修改" },
                                { id: "remove", label: isEn ? "Remove" : "移除人物" },
                              ] as const)
                            : selectedElement.category === "object"
                              ? ([
                                  { id: "replace_product", label: isEn ? "Replace Product" : "替換產品／圖片" },
                                  { id: "change", label: isEn ? "Prompt Edit" : "指令修改" },
                                  { id: "remove", label: isEn ? "Remove" : "移除物件" },
                                ] as const)
                              : ([
                                  { id: "change", label: isEn ? "Rewrite Text" : "原位改字" },
                                  { id: "remove", label: isEn ? "Remove Text" : "移除文字" },
                                ] as const)
                          ).map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setEditMode(m.id)}
                              className={`cursor-pointer rounded-2xl px-3 py-1.5 text-xs font-bold transition ${
                                editMode === m.id
                                  ? "bg-[#12141c] text-[#c6f24b]"
                                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Character selector for Person Swap */}
                      {selectedElement.category === "person" &&
                      editMode === "swap_character" &&
                      characters.length > 0 ? (
                        <div className="space-y-2 rounded-2xl bg-white p-3">
                          <label className="block text-xs font-bold text-zinc-700">
                            {isEn ? "Replacement Character" : "選擇替換角色"}
                          </label>
                          <select
                            value={swapCharacterId}
                            onChange={(e) => {
                              const nextId = e.target.value;
                              setSwapCharacterId(nextId);
                              const nextChar = characters.find((c) => c.id === nextId);
                              setSwapLookUrl(defaultCharacterLookUrl(nextChar));
                            }}
                            className="h-9 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-xs font-bold text-[#12141c]"
                          >
                            {characters.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>

                          {selectedSwapChar && (selectedSwapChar.presets?.length ?? 0) > 0 ? (
                            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                              {selectedSwapChar.presets!.slice(0, 5).map((preset) => {
                                const url = presetImageUrl(preset, selectedSwapChar);
                                if (!url) return null;
                                const active = swapLookUrl === url;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => setSwapLookUrl(url)}
                                    className={`relative h-12 w-9 shrink-0 cursor-pointer overflow-hidden rounded-xl border transition ${
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

                      {/* Product selector for Object Replace */}
                      {selectedElement.category === "object" &&
                      editMode === "replace_product" &&
                      products.length > 0 ? (
                        <div className="space-y-2 rounded-2xl bg-white p-3">
                          <label className="block text-xs font-bold text-zinc-700">
                            {isEn ? "Replacement Product" : "選擇替換產品"}
                          </label>
                          <select
                            value={replaceProductId}
                            onChange={(e) => setReplaceProductId(e.target.value)}
                            className="h-9 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-xs font-bold text-[#12141c]"
                          >
                            <option value="">
                              {isEn ? "Select a Product…" : "選擇要植入的產品…"}
                            </option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {/* Optional Reference Image Upload */}
                      <div className="space-y-1.5 rounded-2xl bg-white p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-700">
                            {isEn ? "Reference Image (Optional)" : "替換參考圖片（選填）"}
                          </span>
                          {editReferenceUrl ? (
                            <button
                              type="button"
                              onClick={() => setEditReferenceUrl("")}
                              className="cursor-pointer text-[11px] font-bold text-red-600"
                            >
                              {isEn ? "Clear" : "移除"}
                            </button>
                          ) : null}
                        </div>
                        <BrandUploadButton
                          accept="image/png,image/jpeg,image/webp"
                          label={
                            editReferenceUrl
                              ? isEn
                                ? "Replace Reference Image"
                                : "更換參考圖片"
                              : isEn
                                ? "Upload Reference Image"
                                : "上傳參考圖片"
                          }
                          onUploaded={({ url }) => setEditReferenceUrl(url)}
                          onError={(msg) => setError(msg)}
                        />
                      </div>

                      {/* Edit Instruction Textarea */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-700">
                          {selectedElement.category === "text" && editMode === "change"
                            ? isEn
                              ? "New Text Content"
                              : "輸入要替換的新文字內容"
                            : isEn
                              ? "Edit Instruction"
                              : "修改補充說明"}
                        </label>
                        <textarea
                          rows={3}
                          value={editInstruction}
                          disabled={submitting}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              !e.shiftKey &&
                              !e.nativeEvent.isComposing
                            ) {
                              e.preventDefault();
                              void handleEditElement();
                            }
                          }}
                          placeholder={
                            selectedElement.category === "text"
                              ? isEn
                                ? 'Type new text (e.g. "SUMMER SALE 50% OFF")…'
                                : "輸入新文字（保留原海報字體風格與排版）…"
                              : isEn
                                ? "Describe how to modify this element…"
                                : "描述你想如何修改此元素（選填）…"
                          }
                          className="w-full rounded-2xl border border-zinc-200 bg-white p-3 text-xs leading-5 text-[#12141c] focus:outline-none"
                        />
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {error ? (
                    <p
                      role="alert"
                      className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                    >
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    disabled={submitting || !selectedElement}
                    onClick={() => void handleEditElement()}
                    className="director-dock-generate flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#c6f24b] px-4 font-display text-sm font-extrabold text-[#12141c] transition hover:bg-[#b6e23a] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {submitting ? (
                      <Spinner className="h-4 w-4 text-[#12141c]" />
                    ) : null}
                    <span>
                      {submitting
                        ? isEn
                          ? "Applying Edit…"
                          : "元素重繪中…"
                        : isEn
                          ? "Apply Element Edit"
                          : "執行元素重繪"}
                    </span>
                    <span className="rounded-xl bg-[#12141c]/10 px-2 py-0.5 text-xs font-bold">
                      ✦ {FRAME_COST}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-accent-ink/20 py-14 text-center text-sm text-muted">
              {isEn ? "No generated posts yet." : "尚無生成的海報貼文紀錄。"}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-accent-ink/15 bg-white p-3 transition hover:border-accent-ink/40"
                >
                  <div>
                    <button
                      type="button"
                      onClick={() => openPostInSam(post)}
                      className="relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-2xl bg-zinc-900"
                    >
                      {post.currentImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.currentImageUrl}
                          alt={post.prompt}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                          {post.status === "rendering"
                            ? isEn
                              ? "Generating…"
                              : "生成中…"
                            : isEn
                              ? "No image"
                              : "無圖片"}
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className="rounded-2xl bg-black/75 px-2 py-0.5 text-[10px] font-bold text-[#c6f24b]">
                          V{Math.max(1, post.revisions.length)}
                        </span>
                        <span className="rounded-2xl bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">
                          {post.aspectRatio}
                        </span>
                      </div>
                    </button>
                    <p className="mt-2 line-clamp-2 text-xs font-semibold text-foreground">
                      {post.prompt || (isEn ? "Untitled Post" : "未命名貼文")}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {isEn
                        ? `${post.detectedElements.length} editable elements`
                        : `已偵測 ${post.detectedElements.length} 個可編輯元素`}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-accent-ink/10 pt-2">
                    <button
                      type="button"
                      onClick={() => openPostInSam(post)}
                      className="cursor-pointer rounded-2xl bg-accent-ink px-3 py-1 text-xs font-bold text-[#c6f24b]"
                    >
                      {isEn ? "Edit Poster" : "編輯海報"}
                    </button>
                    <div className="flex items-center gap-1.5">
                      {post.currentImageUrl ? (
                        <a
                          href={post.currentImageUrl}
                          download={`post-${post.id}.webp`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-accent-ink/20 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-accent-ink"
                        >
                          {isEn ? "Download" : "下載"}
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onDeletePost(post.id)}
                        className="cursor-pointer rounded-2xl border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        {isEn ? "Delete" : "刪除"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    host,
  );
}
