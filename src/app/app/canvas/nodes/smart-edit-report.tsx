// Read-only report from a smart edit run: what Clean Speech cut, or how Smart Reframe framed.

const SMART_EDIT_IDS = new Set(["scro:clean-speech", "scro:smart-reframe"]);

type Props = {
  modelId: string;
  isZh: boolean;
  text?: string;
};

export function SmartEditReport({ modelId, isZh, text }: Props) {
  if (!SMART_EDIT_IDS.has(modelId)) return null;
  if (!text?.trim()) {
    return (
      <p className="text-[10px] text-white/40">
        {modelId === "scro:clean-speech"
          ? isZh
            ? "接上有聲影片後按 Run：Scribe 辨識每個字的時間，剪走語氣詞、重複句和長停頓（$0.20／小時）。"
            : "Wire a video with speech, then Run: Scribe times every word and cuts fillers, restarts, and long pauses ($0.20/hour)."
          : isZh
            ? "接上橫向影片後按 Run：每秒取一格，跟住講者的臉裁成直向。"
            : "Wire a wide video, then Run: about one frame a second is checked and the crop follows the speaker's face."}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-white/50">{isZh ? "結果" : "Result"}</span>
      <pre className="nodrag nowheel max-h-32 overflow-auto whitespace-pre-wrap rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 font-mono text-[10px] leading-snug text-white/80">
        {text}
      </pre>
    </div>
  );
}
