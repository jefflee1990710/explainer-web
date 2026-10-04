import type { TranslateFn } from "@/util/i18n/translate";

// Map known server error strings (zh / en) to errors.* message keys.
const EXACT: Record<string, string> = {
  "請提供導演指示": "errors.instructionRequired",
  "請輸入導演指示。": "errors.instructionRequired",
  "請輸入角色要讀的講稿。": "errors.spokenScriptRequired",
  "請選擇對白語言": "errors.dialogueLanguageRequired",
  "請選擇旁白語言": "errors.voiceRequired",
  "建立專案失敗": "errors.createProjectFailed",
  "請輸入專案名稱": "errors.folderNameRequired",
  "重新命名失敗": "errors.genericRetry",
  "請先同意服務條款與私隱政策": "errors.acceptPolicies",
  "讀取任務失敗": "errors.loadTasksFailed",
  "建立角色失敗，請再試一次": "errors.createCharacterFailed",
  "操作失敗，請再試一次": "errors.characterActionFailed",
  "下載失敗，請再試一次": "errors.downloadFailed",
  "請輸入角色名稱": "errors.characterNameRequired",
  "請選擇風格": "errors.styleRequired",
  "請描述這個角色，或上傳參考圖": "errors.characterDescribeOrUpload",
  "角色不存在": "errors.characterNotFound",
  "版本不存在": "errors.versionNotFound",
  "只能從已完成的版本編輯": "errors.editFromCompletedOnly",
  "只有失敗的版本可以重試": "errors.retryFailedVersionOnly",
  "只有完成的版本可以設為預設": "errors.defaultVersionCompletedOnly",
  "專案不存在": "errors.projectNotFound",
  "分鏡尚未完成": "errors.storyboardNotReady",
  "找不到這段分鏡": "errors.clipNotFound",
  "這一段的分鏡圖還在產生中，請稍後再重畫": "errors.framesStillGenerating",
  "沒有需要補齊的段落": "errors.nothingToProcess",
  "未知的產生類型": "errors.unknownGenerateKind",
  "沒有可產生的分鏡圖": "errors.noFramesToGenerate",
  "沒有可產生的段落": "errors.noClipsToGenerate",
  "找不到影片": "errors.videoNotFound",
  "成片合成中，完成後再匯出": "errors.reelBusy",
  "先加入圖層或開頭結尾": "errors.addLayersFirst",
  "找不到樣板": "errors.templateNotFound",
  "已有同名樣板": "errors.duplicateTemplateName",
  "檔案是空的": "errors.fileEmpty",
  "圖片不可超過 5MB": "errors.imageTooLarge",
  "請選擇圖片": "errors.pickImage",
  "尚未設定 Vercel Blob": "errors.blobNotConfigured",
  "請輸入訊息": "errors.styleChatMessageRequired",
  "影片不可超過 50MB": "errors.videoTooLarge",
  "只支援 PNG、JPG、WebP 圖片或 MP4、MOV 影片": "errors.unsupportedMedia",
  "請輸入樣板名稱": "errors.templateNameRequired",
  "沒有收到檔案": "errors.noFileReceived",
  "圖層設定格式錯誤": "errors.layerSettingsInvalid",
  "素材網址無效，請重新上傳": "errors.assetUrlInvalid",
  "找不到 Director": "errors.directorNotFound",
  "請輸入 Director 名稱": "errors.directorNameRequired",
  "找不到模板": "errors.directorTemplateNotFound",
  "欄位內容過長": "errors.directorFieldTooLong",
  "AI 修改了不存在的欄位": "errors.directorUnknownField",
  "AI 沒有修改任何欄位": "errors.directorChatNoEdits",
  "訊息過長": "errors.directorChatTooLong",
  "需要訂閱才能使用 AI 修改": "errors.directorChatSubscribe",
  "AI 修改失敗，請再試一次": "errors.directorChatFailed",
  "AI 修改太頻繁，請稍後再試": "errors.directorChatRateLimited",
  "建立 Director 失敗": "errors.directorCreateFailed",
  "儲存 Director 失敗": "errors.directorSaveFailed",
  "刪除 Director 失敗": "errors.directorDeleteFailed",
  "找不到 Style": "errors.styleNotFound",
  "invalid name": "errors.styleNameInvalid",
  "invalid description": "errors.styleDescriptionInvalid",
  "invalid canvasColor": "errors.styleCanvasColorInvalid",
  "建立 Style 失敗": "errors.styleCreateFailed",
  "儲存 Style 失敗": "errors.styleSaveFailed",
  "刪除 Style 失敗": "errors.styleDeleteFailed",
  "預覽生成失敗": "errors.stylePreviewFailed",
  "預覽排隊失敗": "errors.stylePreviewFailed",
  "預覽生成中": "errors.stylePreviewBusy",
  "封面生成失敗": "errors.coverFailed",
  "封面排隊失敗": "errors.coverFailed",
  "封面生成中": "errors.coverBusy",
  "還沒有分鏡內容，無法產生封面": "errors.coverFailed",
  "封面補充需求最多 500 字": "errors.coverPromptTooLong",
};

const PATTERNS: Array<{ re: RegExp; key: string; params?: (m: RegExpMatchArray) => Record<string, string | number> }> = [
  {
    re: /^這個導演需要正好 (\d+) 個角色$/,
    key: "errors.castNeedExact",
    params: (m) => ({ n: m[1] }),
  },
  {
    re: /^樣板名稱最多 (\d+) 字$/,
    key: "errors.templateNameTooLong",
    params: (m) => ({ max: m[1] }),
  },
  {
    re: /^Director 名稱最多 (\d+) 字$/,
    key: "errors.directorNameTooLong",
    params: (m) => ({ max: m[1] }),
  },
  {
    re: /^Director 描述最多 (\d+) 字$/,
    key: "errors.directorDescriptionTooLong",
    params: (m) => ({ max: m[1] }),
  },
];

/** Show server errors in the user's UI locale when we recognize the message. */
export function translateAppError(message: string, t: TranslateFn): string {
  const trimmed = message.trim();
  if (!trimmed) return t("errors.genericRetry");
  const exact = EXACT[trimmed];
  if (exact) return t(exact);
  for (const { re, key, params } of PATTERNS) {
    const match = trimmed.match(re);
    if (match) return t(key, params?.(match));
  }
  return trimmed;
}
