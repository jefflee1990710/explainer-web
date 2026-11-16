# Explainer 只出首幀，動作跟導演規劃走

## 目的

三個 Explainer 導演現在每一格都畫首幀（State A）和尾幀（State B），再把兩張圖交給 MiniMax H3 補中間動作。尾幀多一次畫格費用，也把動作鎖死在兩張靜幀之間。

改成：分鏡仍寫出起點和結尾定格，只畫首幀。影片用這一格的內容、`endScene` 和 `motionCamera` 從首幀演到文字裡的落地狀態。

範圍只有這三個導演：

- `cartoon-explainer-video-director`
- `paper-cutout-explainer-video-director`
- `papercraft-diorama-director`

`stickman-video-director`、`listicle-director`、`comparison-card-director`、`workflow-promo-director`、`style-switch-director`、Talking Head、Story 維持現狀。

## 做法

沿用現成的 `keyframeMode: "start-only"`。`dualBeat` 維持 `true`。`workflow-promo-director` 已經是這個組合：分鏡寫 `startScene` / `endScene`，產圖和送片只看首幀。

`clipSkipsEndStill` 在 `keyframeMode === "start-only"` 時為真。因此這三個導演改模式之後，現有的畫格規劃、畫格計費、產片前置檢查，以及 `endUrlForVideo` 會一起停用尾幀，不必再加一種 keyframe 模式。

## 產片流程

1. Phase A 仍寫 `startScene`、`endScene`、`explainerScene`、`motionCamera`。`endScene` 是動作要到達的文字落地狀態，不是一張要生成的靜幀。
2. 每一格只建立首幀任務。Explainer 首幀仍走 Google AI Studio `gemini-nano-banana-2.1`。不再呼叫 `gemini-3.8-flash` 寫終點圖提示詞，也不再為終點圖呼叫 Nano Banana。
3. 每一格新的畫格費用是一張首幀（`FRAME_COST`，4 credits）。
4. 產片只等首幀。`submitClipVideo` 只送 `startImageUrl`。`endImageUrl` 不送。
5. Phase B 寫出的動作提示詞就是 Hailuo 收到的動作。提示詞依照 `motionCamera` 的時間拍，把首幀演向 `endScene`。

缺首幀時產片仍停止。缺尾幀不再擋產片。

## 動作提示詞

`phaseBSystemPrompt` 裡 Explainer 的分支改成和現有 `start-only` 合約一致：只附上核准的首幀；沒有尾幀圖；`endScene` 寫進動作，不能當成模型看得到的圖。

`clipPhaseBUserPrompt` 的 Explainer OUTPUT CONTRACT 改成同一句：只附首幀，依 `motionCamera` 從首幀走到文字裡的 `endScene`。長度維持 350–800 字、最長 1,000。角色嘴保持閉上，眼睛和手留在教學物件上。

三個導演檔各自改自己的 `phaseBMotionRules` 和 `phaseBDetailRules`。物理規則不互相複製。

### 白板 `cartoon-explainer-video-director`

鏡頭鎖在平面畫布上。手勢、目光和每一塊圖示依 `motionCamera` 從首幀走到 `endScene`。軸線、格子、標題板留在原位。`「」` 標籤保持首幀的字形；`endScene` 要換字時，在片中用翻轉或撕開換字。

### 剪紙 `paper-cutout-explainer-video-director`

鏡頭鎖死正面。剪紙塊以滑入、攤開、撕開、描線、翻邊走到 `endScene`，紙片保持剛性。底板和沒有改字的標籤留在原位。

### 摺紙 `papercraft-diorama-director`

微縮鏡頭保持穩定。`motionCamera` 點名的卡紙機關從 `startScene` 走到 `endScene`，卡紙不融化、不變形。建立時選過的滿版底色繼續鎖住。

`phaseBLetteringLock` 對這三個導演改成：字以首幀為準；`endScene` 指定要換的短標籤才在片中翻轉或撕開。沒有尾幀圖可以照抄。

`cartoonNarratorVideoLock` 的白板、剪紙、摺紙分支改成同一套「只附首幀、演向文字落地狀態」的句子，讓管理預覽和測試與 Phase B 一致。Hailuo 收到的仍是 Phase B 寫出的那一段，不會再把這段 lock 重複貼上。

Phase A 的場景規則保留雙拍。其中「`endScene` 是動作結束後的開場靜幀」改成「`endScene` 是動作要到達的文字落地狀態，不生成那張靜幀」。

## 既有資料與編輯器

已完成的尾幀留在影片文件裡，Hailuo 不再接收。已經在排隊的尾幀任務讓它跑完，這次改動不取消、不退那筆 credits。之後的規劃不再建立尾幀任務。

OpenCut 檢視器對這三個導演收起「重畫結尾」卡片，只留重畫首幀。後端 `clipDrawsNoEndStill` 已會拒絕 `start-only` 的尾幀重畫，這次讓按鈕和後端一致。

## 文件

同一輪更新：

- `pipeline-models.md`：三個 Explainer 改為只畫首幀。拿掉終點圖的 `gemini-3.8-flash` 900 字提示詞，以及 MiniMax 收首尾雙幀的描述。動作改為 Phase B 寫入 `minimax/hailuo-3`，只附首幀。
- `AGENTS.md` 裡對應的 Explainer 畫格與雙關鍵幀句子，改成同一件事。

## 測試

只用 `node:test` 與 prompt 斷言。不呼叫 Higgsfield、OpenRouter、Google 生圖。

- 三個導演 `keyframeMode` 為 `start-only`，`dualBeat` 仍為 `true`。
- `clipDrawsNoEndStill` 對這三個導演為真，每格畫格費用是 `FRAME_COST`。
- Phase B 系統提示與 user prompt 寫入 `endScene` 和 `motionCamera`，並說明沒有尾幀圖。
- 三個導演的動作規則各自保留鏡頭和材質，且不再寫「首幀和尾幀兩張圖都附上」。
- 缺首幀時送片仍失敗；缺尾幀不再失敗。
- 其他導演的 `start-end` 與 `end-is-next-start` 測試維持原斷言。

## 不做

- 不取消這支片上已經排隊的尾幀任務，也不退已扣的尾幀 credits。
- 不改 Talking Head、Story、Simple、Scro Swap、Teleport。
- 不新增 keyframe 模式。
- 不讓三個導演共用同一段動作提示詞。
