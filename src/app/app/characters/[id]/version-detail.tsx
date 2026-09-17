"use client";

import { useState } from "react";
import { Spinner } from "@/components/spinner";
import type { PublicCharacter, PublicCharacterVersion } from "@/lib/serialize";

// Right pane: big preview + set-default / edit / retry actions.
export function VersionDetail({
  character,
  version,
  credits,
  subscribed,
  pending,
  error,
  onSetDefault,
  onEdit,
  onRetry,
}: {
  character: PublicCharacter;
  version: PublicCharacterVersion;
  credits: number;
  subscribed: boolean;
  pending: string;
  error: string;
  onSetDefault: () => void;
  onEdit: (instruction: string) => void;
  onRetry: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState("");
  const isDefault = version.id === character.defaultVersionId;
  const busy = version.status === "queued" || version.status === "in_progress";
  const canPay = subscribed && credits >= 1;

  function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instruction.trim()) return;
    onEdit(instruction.trim());
    setInstruction("");
    setEditing(false);
  }

  return (
    <section className="rounded-[1.75rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">
          v{version.number}
          {isDefault ? <span className="ml-2 rounded-full bg-lime px-2 py-0.5 text-xs font-bold">預設</span> : null}
        </h2>
        <p className="text-xs text-muted">
          {new Date(version.createdAt).toLocaleString("zh-Hant")}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-accent-ink/10 bg-white">
        {version.blueprintUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={version.blueprintUrl} alt={`${character.name} v${version.number} 藍圖`} className="aspect-video w-full object-contain" />
        ) : (
          <div className="grid aspect-video w-full place-items-center bg-accent-ink/5 text-sm text-muted">
            {busy ? (
              <span className="inline-flex items-center gap-2"><Spinner /> 藍圖生成中，約需一分鐘</span>
            ) : (
              <span className="text-accent">{version.error || "這個版本沒有成功"}</span>
            )}
          </div>
        )}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {version.editInstruction ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">這次的變更</dt>
            <dd className="mt-1">{version.editInstruction}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">角色描述</dt>
          <dd className="mt-1 whitespace-pre-wrap text-muted">{version.prompt}</dd>
        </div>
      </dl>

      {error ? <p role="alert" className="mt-4 text-sm font-medium text-accent">{error}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-accent-ink/10 pt-5">
        {version.status === "completed" && !isDefault ? (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={pending !== ""}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {pending === "default" ? <Spinner className="h-4 w-4" /> : null}
            設為預設
          </button>
        ) : null}
        {version.status === "completed" ? (
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            disabled={pending !== ""}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            從此版本編輯
          </button>
        ) : null}
        {version.status === "failed" ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={pending !== "" || !canPay}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-4 text-sm font-semibold text-lime transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {pending === "retry" ? <Spinner className="h-4 w-4" /> : null}
            重試・1 credit
          </button>
        ) : null}
        <p className="text-xs text-muted">
          {subscribed ? `剩餘 ${credits} credits` : "需要有效訂閱才能產生新版本"}
        </p>
      </div>

      {editing ? (
        <form onSubmit={submitEdit} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">要改什麼？</span>
            <textarea
              rows={3}
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="例如：把睡衣換成紅色，加一頂棒球帽。"
              className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!instruction.trim() || pending !== "" || !canPay}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "edit" ? <Spinner className="h-4 w-4" /> : null}
              產生新版本・1 credit
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-[44px] cursor-pointer rounded-full px-3 text-sm font-semibold text-muted hover:text-foreground"
            >
              取消
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
