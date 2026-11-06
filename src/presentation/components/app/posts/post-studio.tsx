"use client";

import { useMemo, useRef, useState } from "react";
import { put } from "@vercel/blob/client";
import {
  POST_ASPECT_RATIOS,
  type PostAspectRatio,
  type PublicPost,
} from "@/model/post";
import { prepareBrandUploadAction } from "@/presentation/actions/brand-upload";
import {
  createPostJobAction,
  deletePostJobAction,
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
  DirectorDockStage,
  DirectorDockStepperCell,
  DirectorDockStyleButton,
  getAspectRatioIconSizeClass,
} from "@/presentation/components/app/director-dock";
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
import { checkBrandUpload, resolveBrandContentType } from "@/service/video-edit/edit-state";
import { translateAppError } from "@/util/i18n/translate-app-error";

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
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const historyLabel =
    locale === "zh-Hant"
      ? "歷史紀錄"
      : locale === "zh-Hans"
        ? "历史记录"
        : "History";

  const [posts, setPosts] = useState<PublicPost[]>(initialPosts);
  const [historyOpen, setHistoryOpen] = useState<boolean>(() =>
    Boolean(initialPostId && initialPosts.some((p) => p.id === initialPostId)),
  );
  const [editingPostId, setEditingPostId] = useState<string | null>(
    initialPostId && initialPosts.some((p) => p.id === initialPostId)
      ? initialPostId
      : null,
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const refInputRef = useRef<HTMLInputElement>(null);
  const sourcePostInputRef = useRef<HTMLInputElement>(null);

  async function uploadPostImage(
    file: File | undefined,
    onDone: (url: string) => void,
  ) {
    if (!file || submitting) return;
    const contentType = resolveBrandContentType(file);
    const checked = checkBrandUpload({ type: contentType, size: file.size }, { allowGif: false });
    if (!checked.ok) {
      setError(translateAppError(checked.error, t));
      return;
    }
    setError("");
    setUploadingAsset(true);
    try {
      const prepared = await prepareBrandUploadAction({
        contentType,
        size: file.size,
        allowGif: false,
      });
      if (!prepared.ok) {
        setError(translateAppError(prepared.error, t));
        return;
      }
      const blob = await put(prepared.pathname, file, {
        access: "public",
        token: prepared.token,
        contentType: prepared.contentType,
        multipart: file.size > 8 * 1024 * 1024,
      });
      if (prepared.kind === "image") {
        onDone(blob.url);
      }
    } catch {
      setError(t("errors.uploadFailed"));
    } finally {
      setUploadingAsset(false);
    }
  }

  const activeStyle = useMemo(
    () => styles.find((s) => s.id === selectedStyleId) ?? styles[0] ?? null,
    [styles, selectedStyleId],
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
    setPosts((prev) => [
      updated,
      ...prev.filter((item) => item.id !== updated.id),
    ]);
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
      setEditingPostId(res.post.id);
      setHistoryOpen(true);
      notifyTasksChanged();
    } catch {
      setError(isEn ? "Failed to generate post." : "生成貼文失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePost(id: string) {
    const res = await deletePostJobAction(id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPosts((prev) => prev.filter((item) => item.id !== id));
    if (editingPostId === id) {
      setEditingPostId(null);
    }
  }

  const canSubmitCreate =
    !submitting && Boolean(createPrompt.trim() || sourceImageUrl.trim());

  return (
    <DirectorDockStage
      topLeft={
        <div className="flex items-center gap-2">
          <span className="rounded-2xl bg-[#12141c] px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wider text-[#c6f24b]">
            POSTER
          </span>
          <span className="text-xs font-semibold text-zinc-600">
            {isEn ? "2K Poster Creator Studio" : locale === "zh-Hans" ? "2K 海报贴文工作室" : "2K 海報貼文工作室"}
          </span>
        </div>
      }
      topRight={
        <button
          type="button"
          onClick={() => {
            setEditingPostId(null);
            setHistoryOpen(true);
          }}
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
            {posts.length}
          </span>
        </button>
      }
    >
      <input
        ref={refInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={submitting}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void uploadPostImage(file, setReferenceImageUrl);
        }}
      />
      <input
        ref={sourcePostInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={submitting}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void uploadPostImage(file, setSourceImageUrl);
        }}
      />

      <DirectorDockHero kind="posts" />

      {/* Director Panel — All Post Settings */}
      <DirectorDockPanel
        title={isEn ? "Post Director Panel" : "海報導演面板"}
      >
        <DirectorDockStyleButton
          thumbUrl={activeStyle?.previewUrl}
          label={activeStyle?.name || (isEn ? "Realistic" : "寫實風格")}
          onClick={() => setStyleDialogOpen(true)}
          disabled={submitting}
        />
        <DirectorDockCastGroup
          badgeLabel={isEn ? "Cast" : "角色"}
          slots={castSlots}
          onOpenPicker={() => setCharacterDialogOpen(true)}
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
          icon={
            <span
              className={`inline-block rounded-[2px] border border-current ${getAspectRatioIconSizeClass(aspectRatio)}`}
            />
          }
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
        <DirectorDockDivider />
        <DirectorDockStepperCell
          thumbUrl={referenceImageUrl || undefined}
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
          label={isEn ? "Ref Layout" : "構圖參考圖"}
          value={
            referenceImageUrl
              ? isEn
                ? "Attached (Click to change)"
                : "已附加（點擊更換）"
              : isEn
                ? "Optional (Upload)"
                : "選填（點擊上傳）"
          }
          disabled={submitting || uploadingAsset}
          onClick={() => refInputRef.current?.click()}
        />
      </DirectorDockPanel>

      {/* Main Composer & Drag-and-Drop Stage */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!submitting) setDropZoneActive(true);
        }}
        onDragLeave={() => setDropZoneActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropZoneActive(false);
          const file = e.dataTransfer.files?.[0];
          void uploadPostImage(file, setSourceImageUrl);
        }}
        className={`w-full max-w-4xl rounded-2xl transition ${
          dropZoneActive ? "ring-2 ring-[#c6f24b]" : ""
        }`}
      >
        <DirectorDockComposer
          promptValue={createPrompt}
          onPromptChange={setCreatePrompt}
          promptPlaceholder={
            isEn
              ? "Describe your social post or drop an existing poster image to segment & edit in History…"
              : "描述你想生成的貼文或海報畫面，或直接拖放現有海報圖片以分離元素…"
          }
          topMediaSlot={
            sourceImageUrl || referenceImageUrl ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-[#f4f4f5] p-2.5 text-xs">
                {sourceImageUrl ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-white px-2.5 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sourceImageUrl}
                      alt="Source post"
                      className="h-9 w-9 rounded-xl object-cover"
                    />
                    <span className="font-bold text-[#12141c]">
                      {isEn ? "Source Poster" : "現有海報"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSourceImageUrl("")}
                      className="cursor-pointer px-1 text-zinc-500 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ) : null}
                {referenceImageUrl ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-white px-2.5 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={referenceImageUrl}
                      alt="Reference layout"
                      className="h-9 w-9 rounded-xl object-cover"
                    />
                    <span className="font-bold text-[#12141c]">
                      {isEn ? "Ref Layout" : "構圖參考圖"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReferenceImageUrl("")}
                      className="cursor-pointer px-1 text-zinc-500 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ) : null}
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
                      ? "Upload Existing Poster to Edit"
                      : "上傳現有海報直接編輯"
                  }
                  onUploaded={({ url }) => {
                    setSourceImageUrl(url);
                    setPlusMenuOpen(false);
                  }}
                  onError={(msg) => setError(msg)}
                />
              </div>
            </div>
          }
          pills={
            <DirectorDockPill
              icon={
                <svg
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              }
              label={
                sourceImageUrl
                  ? isEn
                    ? "Replace Poster"
                    : "更換現有海報"
                  : isEn
                    ? "Upload Existing Poster"
                    : "上傳現有海報改圖"
              }
              disabled={submitting || uploadingAsset}
              onClick={() => sourcePostInputRef.current?.click()}
            />
          }
          onGenerate={() => void handleCreatePost()}
          generateDisabled={!canSubmitCreate}
          generating={submitting}
          generateLabel={
            sourceImageUrl && !createPrompt.trim()
              ? isEn
                ? "Analyze Poster"
                : "解析海報"
              : isEn
                ? "Generate"
                : "生成海報"
          }
          creditBadge={sourceImageUrl && !createPrompt.trim() ? 0 : FRAME_COST}
          error={error}
        />
      </div>

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
          styles={styles}
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
        characters={characters}
        products={products}
        editingPostId={editingPostId}
        onSelectEditingPostId={setEditingPostId}
        onPostUpdated={syncUpdatedPost}
        onDeletePost={(id) => void handleDeletePost(id)}
      />
    </DirectorDockStage>
  );
}
