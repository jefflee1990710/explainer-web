// Run draws the blueprint. Save stores that image as a library character.

import { Loader2, Play, RotateCcw, UserRound } from "lucide-react";

type Props = {
  isZh: boolean;
  busy: boolean;
  canRun: boolean;
  isRerun: boolean;
  canSave: boolean;
  saved: boolean;
  saving: boolean;
  runTitle?: string;
  saveTitle?: string;
  onRun: () => void;
  onSave: () => void;
};

export function CharacterBlueprintActions({
  isZh,
  busy,
  canRun,
  isRerun,
  canSave,
  saved,
  saving,
  runTitle,
  saveTitle,
  onRun,
  onSave,
}: Props) {
  return (
    <div className="space-y-2 p-2.5">
      <button
        type="button"
        disabled={!canRun}
        title={runTitle}
        onClick={onRun}
        className={`nodrag flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-bold transition ${
          !canRun
            ? "cursor-not-allowed bg-white/8 text-white/40"
            : isRerun
              ? "border border-sky-400/40 bg-sky-500/12 text-sky-200 hover:bg-sky-500/20"
              : "bg-[#c6f24b] text-[#11141b] shadow-[0_6px_18px_rgba(198,242,75,0.2)] hover:brightness-105"
        }`}
      >
        {busy ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{isZh ? "執行中…" : "Running…"}</span>
          </>
        ) : isRerun ? (
          <>
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Re-run</span>
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Run</span>
          </>
        )}
      </button>
      <p className="text-center text-[10px] tracking-wide text-white/40">Seedream 5.0 Pro</p>
      <button
        type="button"
        disabled={!canSave}
        title={saveTitle}
        onClick={onSave}
        data-save-character={saved ? "saved" : canSave ? "ready" : "need-blueprint"}
        className="nodrag flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-white/15 bg-white/5 px-3 py-1.5 text-[11.5px] font-semibold text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserRound className="h-3.5 w-3.5" />}
        <span>
          {saving
            ? isZh
              ? "儲存中…"
              : "Saving…"
            : saved
              ? isZh
                ? "已儲存為角色"
                : "Saved as character"
              : isZh
                ? "儲存為角色"
                : "Save as character"}
        </span>
      </button>
    </div>
  );
}
