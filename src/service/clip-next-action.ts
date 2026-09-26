import { FRAMES_COST, VIDEO_COST } from "@/service/production-plan";
import type { ClipState } from "@/service/clip-stage";

export type ClipNextKind = "frames" | "video" | "busy" | "next" | "done";

// The one thing a clip needs next; drives the inspector's primary button.
export type ClipNextAction = {
  kind: ClipNextKind;
  label: string;
  hint: string;
  cost: number;
};

// `nextUnfinished` is the clip number the "下一段" button jumps to, if any.
export function clipNextAction(state: ClipState, nextUnfinished?: number): ClipNextAction {
  if (state.stage === "frames_generating") {
    return { kind: "busy", label: "畫格產生中…", hint: "約 30 秒，完成後會自動更新", cost: 0 };
  }
  if (state.stage === "video_generating") {
    return { kind: "busy", label: "影片產生中…", hint: "約 1–2 分鐘，完成後會自動更新", cost: 0 };
  }
  if (state.stale.frames) {
    return {
      kind: "frames",
      label: "重畫畫格",
      hint: "文字改過，畫格是舊版",
      cost: FRAMES_COST,
    };
  }
  if (state.stage === "no_frames") {
    return { kind: "frames", label: "畫這段畫格", hint: "先畫起始與結束兩張", cost: FRAMES_COST };
  }
  if (state.stage === "frames_failed") {
    return {
      kind: "frames",
      label: "重試畫格",
      hint: "有一張畫格失敗，credits 已退回",
      cost: FRAMES_COST,
    };
  }
  if (state.stage === "frames_ready") {
    return {
      kind: "video",
      label: "產這段影片",
      hint: "滿意畫格就產片；不滿意可點畫格標註重畫",
      cost: VIDEO_COST,
    };
  }
  if (state.stage === "video_failed") {
    return { kind: "video", label: "重試產片", hint: "產片失敗，credits 已退回", cost: VIDEO_COST };
  }
  if (state.stale.video) {
    return { kind: "video", label: "重產影片", hint: "畫格重畫過，影片是舊版", cost: VIDEO_COST };
  }
  if (nextUnfinished !== undefined) {
    return { kind: "next", label: `下一段 #${nextUnfinished}`, hint: "這段完成了", cost: 0 };
  }
  return { kind: "done", label: "全部完成", hint: "每一段都有影片了，可以成片", cost: 0 };
}
