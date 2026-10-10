"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { SceneChatChange, SceneChatField } from "@/model/project";

// One production-chat bubble. The regenerate control sits inside the latest AI reply.
export function SceneChatMessage({
  role,
  content,
  changedPaths,
  changedClips,
  changedNote,
  variant = "normal",
  regenerating = false,
  redrawAt,
  credits = 0,
  onRegenerate,
}: {
  role: "user" | "assistant";
  content?: string;
  changedPaths?: SceneChatField[];
  changedClips?: SceneChatChange[];
  changedNote?: string;
  variant?: "normal" | "pending" | "error";
  regenerating?: boolean;
  redrawAt?: string;
  credits?: number;
  onRegenerate?: () => void;
}) {
  const { t, locale } = useI18n();
  const redrawDate = redrawAt
    ? new Date(redrawAt).toLocaleString(locale, {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  function fieldLabel(field: SceneChatField) {
    if (field === "startScene") return t("production.sceneChat.fieldStart");
    if (field === "endScene") return t("production.sceneChat.fieldEnd");
    if (field === "englishVo") return t("production.sceneChat.fieldVo");
    return t("production.sceneChat.fieldMotion");
  }

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent-ink px-3 py-2.5 text-sm leading-6 text-paper">
          {content}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {variant === "pending" ? (
        <p className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-accent-ink/10 bg-paper px-4 py-2.5 text-sm text-muted">
          <Spinner className="h-4 w-4" />
        </p>
      ) : (
        <div
          role={variant === "error" ? "alert" : undefined}
          className={`max-w-[92%] rounded-2xl rounded-bl-md border bg-paper px-3 py-2.5 ${
            variant === "error" ? "border-accent/30 text-accent" : "border-accent-ink/10"
          }`}
        >
          {content ? <p className="whitespace-pre-wrap text-sm leading-6">{content}</p> : null}
          {onRegenerate && variant === "normal" ? (
            regenerating ? (
              <p
                role="status"
                aria-live="polite"
                className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-accent-ink/15 bg-accent-ink/[0.06] px-3 text-xs font-semibold text-muted"
              >
                <Spinner className="h-3.5 w-3.5" />
                {t("production.sceneChat.regenerating")}
              </p>
            ) : redrawDate ? (
              <p className="mt-2 inline-flex min-h-11 items-center rounded-full border border-[var(--studio-line)] bg-[var(--studio-fill)] px-3 text-xs font-semibold text-muted">
                {t("production.sceneChat.regenerated", { date: redrawDate })}
              </p>
            ) : (
              <button
                type="button"
                onClick={onRegenerate}
                className="mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-accent px-3 text-left text-xs font-semibold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("production.sceneChat.regenerate", { credits })}
              </button>
            )
          ) : null}
        </div>
      )}
      {changedClips && changedClips.length > 0 ? (
        <p className="px-1 text-xs text-muted">
          {changedClips.length > 1
            ? t("production.sceneChat.changedClips", {
                clips: changedClips.map((item) => item.clipNumber).join("、"),
                fields: [...new Set(changedClips.flatMap((item) => item.fields))].map(fieldLabel).join("、"),
              })
            : t("production.sceneChat.changed", {
                fields: (changedClips[0]?.fields ?? changedPaths ?? []).map(fieldLabel).join("、"),
              })}
        </p>
      ) : changedPaths && changedPaths.length > 0 ? (
        <p className="px-1 text-xs text-muted">
          {t("production.sceneChat.changed", {
            fields: changedPaths.map(fieldLabel).join("、"),
          })}
        </p>
      ) : changedNote ? (
        <p className="px-1 text-xs text-muted">{changedNote}</p>
      ) : null}
    </div>
  );
}
