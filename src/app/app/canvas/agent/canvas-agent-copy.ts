// UI strings and op summaries for the canvas agent dock (zh / en, like the rest of /app/canvas).

import type { CanvasAgentLanguage, CanvasAgentOp } from "@/service/canvas-agent/types";
import type { LocaleId } from "@/util/i18n/locales";

export type CanvasAgentCopy = ReturnType<typeof canvasAgentCopy>;

export function canvasAgentCopy(isZh: boolean) {
  return isZh
    ? {
        title: "Scro 畫布助手",
        subtitle: "說出你想做的作品，我幫你接好節點並解釋。不會自動執行或扣款。",
        language: "對話語言",
        clear: "清除對話",
        clearConfirm: "確定要清除這個畫布的對話紀錄嗎？",
        clearHint: "只會清除助手對話，畫布上的節點會保留。",
        clearAction: "清除",
        clearing: "清除中…",
        clearError: "暫時無法清除對話，請再試一次。",
        cancel: "取消",
        collapse: "收合",
        expand: "展開",
        hide: "隱藏助手",
        show: "顯示助手",
        moveRight: "移到右側",
        moveBottom: "移到底部",
        placeholder: "例如：幫我做一條 9:16 的狐狸奔跑短片…（Enter 送出，Shift+Enter 換行，可拖入圖片）",
        send: "送出",
        addImage: "加入圖片",
        removeImage: "移除圖片",
        dropImage: "放開以加入圖片",
        imageOnly: "只可以加入 PNG、JPEG 或 WebP 圖片",
        imageLimit: "最多 4 張圖片",
        imageFailed: "圖片上傳失敗，請再試一次",
        thinking: "正在規劃節點…",
        applying: "正在畫上畫布…",
        undo: "復原",
        undone: "已復原",
        retry: "重試",
        error: "助手暫時無法回覆，請再試一次。",
        skipped: (n: number) => `${n} 個步驟因畫布已變動而略過`,
        pickOne: "選一個",
        pickMany: "可多選",
        otherPlaceholder: "補充說明或其他答案（選填）",
        submitAnswer: "送出答案",
        answered: "已回答",
        answerText: (labels: string[], extra: string) =>
          [labels.length > 0 ? `我選：${labels.join("、")}` : "", extra ? `補充：${extra}` : ""]
            .filter(Boolean)
            .join("\n"),
        suggestions: [
          "幫我做一個文字 → 圖片 → 影片的 9:16 流程",
          "用 Seedream 生 4 張不同角度的產品照",
          "解釋目前畫布上每個節點在做什麼",
        ],
      }
    : {
        title: "Scro Canvas Assistant",
        subtitle: "Describe what you want. I'll wire the nodes and explain them. Nothing runs or charges automatically.",
        language: "Chat language",
        clear: "Clear chat",
        clearConfirm: "Clear this canvas's chat history?",
        clearHint: "This only clears the assistant chat. Nodes on the canvas stay.",
        clearAction: "Clear",
        clearing: "Clearing…",
        clearError: "Could not clear the chat. Please try again.",
        cancel: "Cancel",
        collapse: "Collapse",
        expand: "Expand",
        hide: "Hide assistant",
        show: "Show assistant",
        moveRight: "Move to the right",
        moveBottom: "Move to the bottom",
        placeholder: "e.g. Build a 9:16 clip of a fox running… (Enter to send, Shift+Enter for a new line, or drop an image)",
        send: "Send",
        addImage: "Add image",
        removeImage: "Remove image",
        dropImage: "Drop an image",
        imageOnly: "Only PNG, JPEG, or WebP images",
        imageLimit: "Up to 4 images",
        imageFailed: "Could not upload the image. Please try again.",
        thinking: "Planning nodes…",
        applying: "Drawing on the canvas…",
        undo: "Undo",
        undone: "Undone",
        retry: "Retry",
        error: "The assistant could not answer. Please try again.",
        skipped: (n: number) => `${n} step(s) skipped because the canvas changed`,
        pickOne: "Pick one",
        pickMany: "Pick any",
        otherPlaceholder: "Add details or another answer (optional)",
        submitAnswer: "Send answer",
        answered: "Answered",
        answerText: (labels: string[], extra: string) =>
          [labels.length > 0 ? `My choice: ${labels.join(", ")}` : "", extra ? `More: ${extra}` : ""]
            .filter(Boolean)
            .join("\n"),
        suggestions: [
          "Build a text → image → video flow in 9:16",
          "Make 4 product shots from different angles with Seedream",
          "Explain what each node on this canvas does",
        ],
      };
}

// Picks the chat language that matches the site locale.
export function defaultCanvasAgentLanguage(locale: LocaleId): CanvasAgentLanguage {
  if (locale === "zh-Hant" || locale === "zh-Hans" || locale === "en" || locale === "ja" || locale === "ko") {
    return locale;
  }
  return "en";
}

// Short chips such as "+3 nodes · 2 links" under an assistant reply.
export function summarizeCanvasAgentOps(ops: readonly CanvasAgentOp[], isZh: boolean): string[] {
  const count = (kind: CanvasAgentOp["kind"]) => ops.filter((op) => op.kind === kind).length;
  const added = count("add_node");
  const updated = count("update_node");
  const removed = count("remove_node");
  const linked = count("add_edge");
  const unlinked = count("remove_edge");
  const chips: string[] = [];
  if (added) chips.push(isZh ? `新增 ${added} 個節點` : `+${added} node${added > 1 ? "s" : ""}`);
  if (linked) chips.push(isZh ? `連接 ${linked} 條線` : `+${linked} link${linked > 1 ? "s" : ""}`);
  if (updated) chips.push(isZh ? `修改 ${updated} 處` : `${updated} edit${updated > 1 ? "s" : ""}`);
  if (removed) chips.push(isZh ? `刪除 ${removed} 個節點` : `−${removed} node${removed > 1 ? "s" : ""}`);
  if (unlinked) chips.push(isZh ? `移除 ${unlinked} 條線` : `−${unlinked} link${unlinked > 1 ? "s" : ""}`);
  if (count("move_node")) chips.push(isZh ? "整理排版" : "Tidied layout");
  const grouped = count("add_group");
  if (grouped) chips.push(isZh ? `新增 ${grouped} 個群組` : `+${grouped} group${grouped > 1 ? "s" : ""}`);
  if (count("update_group")) chips.push(isZh ? "更新群組" : "Updated group");
  const ungrouped = count("remove_group");
  if (ungrouped) chips.push(isZh ? `移除 ${ungrouped} 個群組` : `−${ungrouped} group${ungrouped > 1 ? "s" : ""}`);
  return chips;
}
