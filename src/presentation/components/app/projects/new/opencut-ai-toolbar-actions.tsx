"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  HeadphonesIcon,
  Image02Icon,
  MagicWand05Icon,
  MusicNote03Icon,
  SubtitleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioHint } from "@/presentation/studio/studio-hint";
import {
  setScroSubtitleOpen,
  useScroSubtitleCatalog,
  useScroSubtitleVideoId,
} from "@/opencut/embed/scro-subtitle-store";
import { useScroVideos } from "@/opencut/embed/scro-video-store";

type ToolBusyKey = "broll" | "sfx" | "bgm" | "silence" | null;

// Single icon + text button with a hover-only tooltip for the OpenCut top toolbar.
function AiToolbarButton({
  icon,
  label,
  hint,
  align = "center",
  busy = false,
  disabled = false,
  onClick,
}: {
  icon: IconSvgElement;
  label: string;
  hint: string;
  align?: "center" | "end";
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <StudioHint hint={hint} align={align}>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={onClick}
        className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--studio-line)] bg-[var(--studio-canvas)] px-2.5 text-xs font-medium text-foreground transition hover:border-accent-ink/40 hover:bg-accent-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <HugeiconsIcon
          icon={icon}
          size={14}
          className={busy ? "animate-spin text-muted" : "text-foreground"}
        />
        <span>{label}</span>
      </button>
    </StudioHint>
  );
}

// Compact AI automation actions (Subtitles, B-Roll, SFX, BGM, Smooth Silence) on the right of the OpenCut status bar.
export function OpenCutAiToolbarActions() {
  const { t } = useI18n();
  const catalog = useScroSubtitleCatalog();
  const subtitleVideoId = useScroSubtitleVideoId();
  const scroVideos = useScroVideos();
  const [busy, setBusy] = useState<ToolBusyKey>(null);

  const lines = catalog?.lines ?? [];
  const hasLines = lines.length > 0;
  const videoId = subtitleVideoId ?? scroVideos?.videoId;
  const noDialogueHint = t("production.toolbar.aiTools.noDialogueHint");

  async function runTool(key: Exclude<ToolBusyKey, null>, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AiToolbarButton
        icon={SubtitleIcon}
        label={t("production.toolbar.aiTools.subtitlesLabel")}
        hint={t("production.toolbar.aiTools.subtitlesHint")}
        onClick={() => setScroSubtitleOpen(true)}
      />

      <AiToolbarButton
        icon={Image02Icon}
        label={
          busy === "broll"
            ? t("production.toolbar.aiTools.brollBusy")
            : t("production.toolbar.aiTools.brollLabel")
        }
        hint={hasLines ? t("production.toolbar.aiTools.brollHint") : noDialogueHint}
        busy={busy === "broll"}
        disabled={!hasLines}
        onClick={() =>
          void runTool("broll", async () => {
            const [{ EditorCore }, { runAutoInsertBrollOnTimeline }] = await Promise.all([
              import("@/opencut/core"),
              import("@/opencut/components/editor/panels/assets/views/stock-media-view"),
            ]);
            const editor = EditorCore.getInstance();
            const res = await runAutoInsertBrollOnTimeline({
              editor,
              lines,
              videoId,
              mediaType: "image",
            });
            if (res.error) toast.error(res.error);
            else {
              toast.success(
                t("production.toolbar.aiTools.brollDone", { n: res.insertedCount }),
              );
            }
          })
        }
      />

      <AiToolbarButton
        icon={HeadphonesIcon}
        label={
          busy === "sfx"
            ? t("production.toolbar.aiTools.sfxBusy")
            : t("production.toolbar.aiTools.sfxLabel")
        }
        hint={hasLines ? t("production.toolbar.aiTools.sfxHint") : noDialogueHint}
        busy={busy === "sfx"}
        disabled={!hasLines}
        onClick={() =>
          void runTool("sfx", async () => {
            const [{ EditorCore }, { runAutoInsertSfxOnTimeline }] = await Promise.all([
              import("@/opencut/core"),
              import("@/opencut/embed/scro-auto-audio"),
            ]);
            const editor = EditorCore.getInstance();
            const res = await runAutoInsertSfxOnTimeline({ editor, lines });
            if (res.error) toast.error(res.error);
            else {
              toast.success(
                t("production.toolbar.aiTools.sfxDone", { n: res.insertedCount }),
              );
            }
          })
        }
      />

      <AiToolbarButton
        icon={MusicNote03Icon}
        label={
          busy === "bgm"
            ? t("production.toolbar.aiTools.bgmBusy")
            : t("production.toolbar.aiTools.bgmLabel")
        }
        hint={hasLines ? t("production.toolbar.aiTools.bgmHint") : noDialogueHint}
        busy={busy === "bgm"}
        disabled={!hasLines}
        onClick={() =>
          void runTool("bgm", async () => {
            const [{ EditorCore }, { runAutoInsertBgmOnTimeline }] = await Promise.all([
              import("@/opencut/core"),
              import("@/opencut/embed/scro-auto-audio"),
            ]);
            const editor = EditorCore.getInstance();
            const firstClip = scroVideos?.clips?.[0];
            const res = await runAutoInsertBgmOnTimeline({
              editor,
              lines,
              title:
                firstClip?.englishVo?.slice(0, 40) || firstClip?.name?.slice(0, 40),
            });
            if (res.error) toast.error(res.error);
            else {
              const mood = res.selection?.mood ?? "ambient";
              toast.success(t("production.toolbar.aiTools.bgmDone", { mood }));
            }
          })
        }
      />

      <AiToolbarButton
        icon={MagicWand05Icon}
        label={
          busy === "silence"
            ? t("production.toolbar.aiTools.silenceBusy")
            : t("production.toolbar.aiTools.silenceLabel")
        }
        hint={t("production.toolbar.aiTools.silenceHint")}
        align="end"
        busy={busy === "silence"}
        onClick={() =>
          void runTool("silence", async () => {
            const [{ EditorCore }, { runSmoothSilenceGapsOnTimeline }] = await Promise.all([
              import("@/opencut/core"),
              import("@/opencut/embed/scro-smooth-silence"),
            ]);
            const editor = EditorCore.getInstance();
            const res = await runSmoothSilenceGapsOnTimeline({ editor });
            if (res.error) {
              toast.info(res.error);
              return;
            }
            toast.success(
              res.trimmedClipsCount > 0
                ? t("production.toolbar.aiTools.silenceDone", {
                    n: res.trimmedClipsCount,
                  })
                : t("production.toolbar.aiTools.silenceNone"),
            );
          })
        }
      />
    </div>
  );
}
