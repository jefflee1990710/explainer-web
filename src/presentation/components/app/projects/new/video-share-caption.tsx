"use client";

// Opt-in AI caption plus a box to tweak / recopy the last draft.
export function VideoShareCaption({
  checked,
  caption,
  copied,
  onChecked,
  onCaption,
  onCopy,
}: {
  checked: boolean;
  caption: string;
  copied: boolean;
  onChecked: (checked: boolean) => void;
  onCaption: (value: string) => void;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-4 text-[var(--studio-ink)]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChecked(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--studio-teal)]"
        />
        <span>
          用 AI 起草文案
          <span className="mt-0.5 block text-[var(--studio-muted)]">
            依分鏡標題、對白與畫面，為該平台寫貼文，並複製到剪貼簿。
          </span>
        </span>
      </label>
      {checked && caption ? (
        <div className="space-y-1.5">
          <textarea
            value={caption}
            rows={5}
            onChange={(event) => onCaption(event.target.value)}
            className="w-full resize-y rounded-lg border border-[var(--studio-line)] bg-white px-2 py-1.5 text-xs leading-5 text-[var(--studio-ink)]"
          />
          <button
            type="button"
            onClick={onCopy}
            className="text-[11px] font-semibold text-[var(--studio-muted)] underline-offset-2 hover:underline"
          >
            {copied ? "已複製文案" : "複製文案"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
