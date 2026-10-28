# Scro Pipeline 與全導演模型對照表

最後更新日期：2026-10-28

> **同步規則（Sync Contract）**：只要系統中任何導演流程、LLM、圖片生成、影片生成、語音合成（TTS / STS / Forced Alignment）、解析度或後處理邏輯有變更，**必須同步更新本檔案**，確保本表與系統設計 100% 一致。

---

## 一、`talking-head-director`（坐定對嘴）完整 Pipeline 模型流程

| 階段 | 步驟說明 | 供應商 (Provider) | 模型 ID (Model) | 輸入 → 輸出與規格 | 單價參考 | 對應程式碼 |
|---|---|---|---|---|---|---|
| **1. 分鏡規劃 (Phase A)** | 講稿 ≤ 120 秒直接合為 **1 個完整 Clip**（單段上限 `120 秒`、總長上限 `240 秒`） | Google AI Studio | **`gemini-4-argon`** (`thinkingLevel: "low"`) | 講稿 + 場景提示 → `phaseA.clips[]`（單段 `5–120s`） | Gemini Token 計費 | `src/service/director/model.ts`<br>`src/service/director/talking-head.ts` |
| **2. 場景鎖 / 背景板 (Background Plate)** | 產生空景九宮格鎖定房間與光線 | OpenRouter (`/api/v1/images`) | **`bytedance-seed/seedream-5-0-pro`** | 場景描述 → `2K` 場景鎖圖片（免費，不扣用戶 Credits） | ~`$0.04 / 張` | `src/service/higgsfield/video-locks-pipeline.ts`<br>`src/service/generation/image-backend.ts` |
| **3. 分鏡畫格 (Scene Frames)** | 畫出每段起點 `start`（`heygen/avatar-iv` 只需起始畫格 `startImageUrl`） | OpenRouter (`/api/v1/images`) | **`bytedance-seed/seedream-5-0-pro`** | 角色藍圖 (`blueprintUrl`) + 背景板 → `2K` 畫格（每張收 `4 credits`） | ~`$0.04 / 張` | `src/service/higgsfield/pipeline.ts` (`sendFrame`)<br>`src/service/generation/image-backend.ts` |
| **4. 預先語音合成 (Pre-Video VO)** | 在送出影片前一次合成整段講稿語音（自動於句間加入 `...` 自然換氣停頓），並依語音實際秒數（最長 `120 秒`）決定影片長度 | ElevenLabs | **`eleven_v4`** (`/v1/text-to-speech/{voiceId}/with-timestamps`) | 台詞 `englishVo` + 角色 `elevenVoiceId` → `voUrl` (`.mp3`, 對鏡讀稿採用 `TALKING_HEAD_TTS_VOICE_SETTINGS`: `stability: 0.42`, `similarity_boost: 0.95`, `style: 0.35` 呈現真人抑揚頓挫與自然換氣；其餘對嘴導演採用 `stability: 0.7`, `similarity_boost: 1.0`) | ElevenLabs 字元計費 | `src/service/voice/elevenlabs.ts`<br>`src/service/higgsfield/pipeline.ts` (`sendClipVideo`) |
| **5. 影片單次直出 (1-Pass Lip-Sync Video)** | 由單張起始畫格 + ElevenLabs 音軌單次生成完整對嘴影片（最長 `120 秒`） | **OpenRouter (`/api/v1/videos`)** | **`heygen/avatar-iv`** | `input_references`: `image_url` (`start`) + `audio_url` (`voUrl`) → 預設 **`1080p`** 對嘴成片（秒數完全跟隨 `voUrl`）。用戶扣 **`4 credits / 秒`**（最少 5 秒；語音已包含，不再另加每秒 1 credit） | 供應商 **`$0.05 / 秒`** | `src/service/openrouter/generate.ts` (`openRouterHeyGenAudioVideoBody`)<br>`src/service/higgsfield/pipeline.ts` (`sendClipVideo`)<br>`src/service/credit-costs.ts` (`talkingHeadVideoCost`) |
| **6. 後處理：去空白 + 感光元件微紋理** | 1. 保留 `heygen/avatar-iv` 原生同步音軌（跳過二次 `swapClipVoice`）<br>2. `trimClipSmoothSilence` 裁掉頭尾空白<br>3. `gradeTalkingHeadSensorTextureBuffer` 疊加 iPhone CMOS 高頻微紋理（`unsharp=3:3:0.25,noise=c0s=1.8:c0f=t+u`）並保持明亮 Smart HDR 高光與 `yuv420p` | 本機 FFmpeg | **FFmpeg (`libx264`)** | `heygen/avatar-iv` 輸出影片 → 最終 `blobUrl` (`.mp4`) | 內含 | `src/service/voice/smooth-silence.ts`<br>`src/service/style/realistic-grade.ts`<br>`src/service/higgsfield/pipeline.ts` (`applyJobStatus`) |

> **小結**：`talking-head-director` 現將 `<= 120 秒` 的講稿合為 **1 個完整 Clip**，並透過 OpenRouter **`heygen/avatar-iv`（供應商 `$0.05 / 秒`，用戶 `4 credits / 秒`）** 直接從起始畫格與 ElevenLabs 音軌產出對嘴影片。

---

## 二、所有其他導演（All Other Directors）的模型對照表

所有其他導演在 **分鏡規劃 (`gemini-4-argon` / `gemini-3.8-flash`)** 與 **畫格生成 (`bytedance-seed/seedream-5-0-pro`)** 完全相同，差別在於 **畫格模式**、**影片模型（單次生成）** 與 **語音／對嘴方式**：

| 導演類別 | 包含的 `skillSlug` | 畫格模式 (Keyframes) | 影片模型 (OpenRouter 單次生成) | 語音與對嘴處理 (Voice & Lip-Sync) |
|---|---|---|---|---|
| **A. 其他畫面開口對嘴導演**<br>*(1 Pass 影片)* | • `talking-broll-director`（口播穿插 B-Roll）<br>• `story-short-director`（劇情短片）<br>• `dialogue-qa-director`（雙人對談 Q&A）<br>*（註：`full-body-talking-head-director` 與 `surprise-interview-director` 已設為 `hiddenInPicker: true` 從選擇器移除）* | 每段 `first_frame` + `last_frame` | • **寫實風格 (`realistic`)**：<br>OpenRouter **`minimax/hailuo-3`** (`2K`, `$0.13/s`)<br>• **非寫實風格**：<br>OpenRouter **`alibaba/wan-3.0`** (`480p`, `$0.05/s`) | 1. 送片前用 ElevenLabs **`eleven_v4`** 取得逐字時間軸，將 `EXACT LIP-SYNC TIMING SCHEDULE` 寫進影片 Prompt 讓模型直接開口對嘴。<br>2. 影片完成後用 **`/v1/forced-alignment`** 把 ElevenLabs 音軌對齊嘴型合成。<br>3. 自動執行 `trimClipSmoothSilence`。 |
| **B. 旁白解說片導演 (Narrated Explainers)**<br>*(角色閉口，畫外音旁白)* | • `cartoon-explainer-video-director`（白板手繪解說）<br>• `paper-cutout-explainer-video-director`（剪紙拼貼解說）<br>• `stickman-video-director`（火柴人解說）<br>• `listicle-director`（清單盤點）<br>• `comparison-card-director`（對比卡）<br>• `workflow-promo-director`（流程宣傳）<br>• `style-switch-director`（風格切換） | • 寫實白板：僅送 `first_frame` (`start-only`)<br>• 其餘：每段 `first_frame` + `last_frame` | • **非寫實風格（預設）**：<br>OpenRouter **`alibaba/wan-3.0`** (`480p`, `$0.05/s`)<br>• **寫實風格 (`realistic`)**：<br>OpenRouter **`minimax/hailuo-3`** (`2K`, `$0.13/s`) | 1. 畫面角色嘴巴全程閉合（不對嘴）。<br>2. 若語言為廣東話（`yue`）或角色有對應語言 `voiceSamples`，由 ElevenLabs **`eleven_v4`** 合成旁白（若旁白比影片長則自動凍結最後一幀補齊），否則使用影片模型原生語音。<br>3. 自動執行 `trimClipSmoothSilence` 裁除尾部多餘空白。 |
| **C. 無旁白／純動作與片頭片尾導演** | • `outfit-reel-director`（穿搭展示）<br>• `outfit-change-director`（換裝轉場）<br>• `follow-shot-director`（跟拍鏡頭）<br>• `opening-director`（片頭 Bookend）<br>• `ending-director`（片尾 Bookend） | 每段 `first_frame` + `last_frame` | • **寫實風格 (`realistic`)**：<br>OpenRouter **`minimax/hailuo-3`** (`2K`, `$0.13/s`)<br>• **非寫實風格**：<br>OpenRouter **`alibaba/wan-3.0`** (`480p`, `$0.05/s`) | • `outfit-reel` / `outfit-change`：無對白，僅保留模型原生環境音效（SFX）。<br>• `follow-shot` / `opening` / `ending`：預設 `(no dialogue)`，若有短台詞且為廣東話則走 ElevenLabs **`eleven_v4`**。 |

---

## 三、周邊功能使用的模型一覽

| 功能模組 | 供應商 (Provider) | 模型 ID (Model) | 用途 | 對應程式碼 |
|---|---|---|---|---|
| **角色定裝板 / 衣櫃試穿 / 生活照 (Character Board & Life Shots)** | OpenRouter (`/api/v1/images`) | **`bytedance-seed/seedream-5-0-pro`** | 角色正面特寫 + 全身定裝圖、換裝、生活照生成 | `src/service/character/generate.ts`<br>`src/service/life/generate.ts` |
| **姿勢編輯 (Pose Edit)** | Google AI Studio | **`google/gemini-3-pro-image`** (Nano Banana Pro) | 根據骨架／參考圖調整角色動作 | `src/service/google/studio-image.ts`<br>`src/service/pose-edit/send.ts` |
| **聲音複製 (Instant Voice Clone)** | ElevenLabs | **`/v1/voices/add`** | 從用戶錄音或上傳音檔建立 `elevenVoiceId` | `src/service/voice/elevenlabs.ts` (`createVoiceClone`) |
| **AI 音效生成 (Editor SFX)** | ElevenLabs | **`/v1/sound-generation`** | 編輯器內自動與手動生成轉場／動作音效 | `src/service/sound-effect/elevenlabs-sfx.ts` |
