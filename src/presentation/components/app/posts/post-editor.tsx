"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/presentation/components/i18n-provider";
import { retryPostPreviewAction, savePostLayersAction } from "@/presentation/actions/posts";
import { PostCanvas, rasterizePoster } from "@/presentation/components/app/posts/post-canvas";
import type { PosterLayer, PosterTextLayer, PublicPost } from "@/model/post-layers";

const ACTION_CLASS =
  "inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--studio-ink)] px-5 text-sm font-semibold text-[var(--studio-teal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)] disabled:cursor-not-allowed disabled:opacity-50";

// Layer editor. Preview status is a label; the canvas does not paint the model image.
export function PostEditor({ post }: { post: PublicPost }) {
  const { t } = useI18n();
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [layers, setLayers] = useState(post.layers);
  const [selectedId, setSelectedId] = useState<string | null>(
    post.layers.find((layer) => layer.type === "text")?.id ?? post.layers[0]?.id ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const status = post.previewStatus;

  useEffect(() => {
    if (status !== "generating") return;
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [status, router]);

  const selected = layers.find((layer) => layer.id === selectedId);
  const selectedText: PosterTextLayer | null = selected?.type === "text" ? selected : null;

  function changeText(text: string) {
    if (!selectedText) return;
    setSaved(false);
    setLayers(layers.map((layer) => (layer.id === selectedText.id ? { ...layer, text } : layer)));
  }

  async function pngBlob() {
    if (!svgRef.current) throw new Error("canvas");
    return rasterizePoster(svgRef.current);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const blob = await pngBlob();
      const file = new File([blob], "poster.png", { type: "image/png" });
      const result = await savePostLayersAction(post.id, layers, file);
      if (!result.ok) {
        setError(t(`post.error.${result.error}`));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("post.error.save"));
    } finally {
      setSaving(false);
    }
  }

  async function download() {
    const blob = await pngBlob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "poster.png";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function retry() {
    setRetrying(true);
    const result = await retryPostPreviewAction(post.id);
    setRetrying(false);
    if (!result.ok) setError(t(`post.error.${result.error}`));
    else router.refresh();
  }

  const statusLabel =
    status === "generating"
      ? t("post.editor.previewGenerating")
      : status === "failed"
        ? t("post.editor.previewFailed")
        : t("post.editor.previewReady");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/app/posts" className="text-sm font-semibold text-muted hover:text-foreground">
            {t("post.editor.back")}
          </Link>
          <p className="mt-2 text-sm text-muted">{statusLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "failed" ? (
            <button type="button" className={ACTION_CLASS} disabled={retrying} onClick={() => void retry()}>
              {t("post.editor.retry")}
            </button>
          ) : null}
          <button type="button" className={ACTION_CLASS} onClick={() => void download()}>
            {t("post.editor.download")}
          </button>
          <button type="button" className={ACTION_CLASS} disabled={saving} onClick={() => void save()}>
            {saving ? t("post.editor.saving") : saved ? t("post.editor.saved") : t("post.editor.save")}
          </button>
        </div>
      </header>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(16rem,1fr)]">
        <PostCanvas
          layers={layers}
          selectedId={selectedId}
          label={t("post.editor.canvasLabel")}
          svgRef={svgRef}
          onSelect={setSelectedId}
          onChange={(next: PosterLayer[]) => {
            setSaved(false);
            setLayers(next);
          }}
        />
        {selectedText ? (
          <label className="block text-sm font-semibold">
            {t("post.editor.textLabel")}
            <textarea
              value={selectedText.text}
              onChange={(event) => changeText(event.target.value)}
              rows={4}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--studio-line)] bg-white px-3 py-3 text-base font-normal"
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
