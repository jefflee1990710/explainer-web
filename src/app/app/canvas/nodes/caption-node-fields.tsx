// Language picker and the editable SRT produced by the auto-captions node.

import { CanvasTextDialogField } from "@/app/app/canvas/nodes/canvas-text-dialog-field";

const fieldClass =
  "nodrag w-full rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90";

type Props = {
  modelId: string;
  isZh: boolean;
  language: string;
  text?: string;
  onLanguage: (language: string) => void;
  onText: (text: string) => void;
};

export function CaptionNodeFields({ modelId, isZh, language, text, onLanguage, onText }: Props) {
  if (modelId !== "scro:auto-captions") return null;
  return (
    <div className="space-y-1.5">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-white/50">{isZh ? "語言" : "Language"}</span>
        <select value={language} onChange={(e) => onLanguage(e.target.value)} className={`${fieldClass} cursor-pointer`}>
          <option value="yue">{isZh ? "廣東話（繁體）" : "Cantonese (Traditional)"}</option>
          <option value="zh">{isZh ? "國語" : "Mandarin"}</option>
          <option value="en">English</option>
          <option value="auto">{isZh ? "自動" : "Auto"}</option>
        </select>
      </label>
      {text ? (
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-white/50">{isZh ? "字幕稿（可改，不會重跑辨識）" : "Subtitles (edit without re-transcribing)"}</span>
          <CanvasTextDialogField
            value={text}
            onValue={onText}
            rows={6}
            dialogLabel={isZh ? "編輯字幕稿" : "Edit subtitles"}
            className={`${fieldClass} resize-y font-mono`}
          />
        </label>
      ) : (
        <p className="text-[10px] text-white/40">
          {isZh ? "接上有聲影片後按 Run，會寫出可修改的字幕稿。" : "Wire a video with audio, then Run. The transcript stays editable."}
        </p>
      )}
    </div>
  );
}
