"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  HeadphonesIcon,
  MusicNote03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioHint } from "@/presentation/studio/studio-hint";
import { useScroSubtitleCatalog } from "@/opencut/embed/scro-subtitle-store";
import { useScroVideos } from "@/opencut/embed/scro-video-store";
import { SmoothSilenceAuto } from "@/presentation/components/app/projects/new/smooth-silence-auto";
import type { PublicVideo } from "@/presentation/serialize";

type ToolBusyKey = "sfx" | "bgm" | null;

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

// Compact AI automation actions (SFX, BGM) on the right of the OpenCut status bar.
// Smooth Silence is applied on the server when a lip-sync clip finishes.
export function OpenCutAiToolbarActions({ project }: { project?: PublicVideo }) {
  const { t } = useI18n();
  const catalog = useScroSubtitleCatalog();
  const scroVideos = useScroVideos();
  const [busy, setBusy] = useState<ToolBusyKey>(null);

  const lines = catalog?.lines ?? [];
  const hasLines = lines.length > 0;
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

      <SmoothSilenceAuto project={project} />
    </div>
  );
}
