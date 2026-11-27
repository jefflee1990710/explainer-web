import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { libraryCharacterChoices } from "@/app/app/canvas/nodes/character-menu-options";
import { ComposedInput } from "@/app/app/canvas/nodes/composed-text-field";
import { CanvasPreviewSelect } from "@/app/app/canvas/nodes/canvas-preview-select";
import { PromptVarsHint } from "@/app/app/canvas/nodes/prompt-vars-hint";
import { ConcatVideoOrder } from "@/app/app/canvas/nodes/concat-video-order";
import { ConcatToSequenceButton } from "@/app/app/canvas/nodes/concat-to-sequence-button";
import { SequenceNodeSummary } from "@/app/app/canvas/nodes/sequence-node-summary";
import { SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";
import { PromptEditorDialog } from "@/app/app/canvas/nodes/prompt-editor-dialog";
import { SwapLightLookField } from "@/app/app/canvas/nodes/swap-light-look-field";
import { CaptionNodeFields } from "@/app/app/canvas/nodes/caption-node-fields";
import { FfmpegEditFields } from "@/app/app/canvas/nodes/ffmpeg-edit-fields";
import { FfmpegParamFields } from "@/app/app/canvas/nodes/ffmpeg-param-fields";
import {
  OutdatedBanner,
} from "@/app/app/canvas/nodes/outdated-notice";
import type { ModelNodeCardView } from "@/app/app/canvas/nodes/model-node-card-view";
import { WiredPromptField } from "@/app/app/canvas/nodes/wired-prompt-field";
import { readConnectedPromptText } from "@/service/canvas/core/graph";

const ASPECT_OPTIONS = ["16:9", "9:16", "1:1", "3:4"] as const;
const RESOLUTION_OPTIONS = ["1k", "2k", "4k"] as const;


export function ModelNodeCardFields(view: ModelNodeCardView) {
  const { id, data, nodes, edges, characterOptions, onUpdateNodeData, showAdvanced, setShowAdvanced, promptEditorOpen, setPromptEditorOpen, isZh, spec, promptPort, isPromptWired, status, durationSeconds, activePreset, outdated, templateVars, toolParams, updateToolParam } = view;
  const promptEdited = data.toolParams?.promptEdited === true;
  const wiredPrompt = isPromptWired ? readConnectedPromptText(id, nodes, edges) : undefined;
  const shownPrompt = isPromptWired && !promptEdited ? (wiredPrompt ?? "") : (data.prompt ?? "");
  const savePrompt = (prompt: string) => {
    onUpdateNodeData(
      id,
      isPromptWired ? { prompt, toolParams: { ...toolParams, promptEdited: true } } : { prompt },
    );
  };
  return (
    <>
{/* Inline prompt & compact model parameters */}
  {promptPort && spec.id !== SEQUENCE_MODEL_ID ? (
    <WiredPromptField
      isZh={isZh}
      value={shownPrompt}
      wired={isPromptWired}
      onEdit={savePrompt}
      onOpenEditor={() => setPromptEditorOpen(true)}
    />
  ) : null}
  {promptEditorOpen && promptPort ? (
    <PromptEditorDialog
      initial={shownPrompt}
      isZh={isZh}
      onCancel={() => setPromptEditorOpen(false)}
      onSave={(prompt) => {
        savePrompt(prompt);
        setPromptEditorOpen(false);
      }}
    />
  ) : null}
  {promptPort && spec.id !== SEQUENCE_MODEL_ID ? (
    <PromptVarsHint isZh={isZh} text={shownPrompt} vars={templateVars} missingBlocksRun />
  ) : null}

  {/* Provider-specific compact controls */}
  {spec.provider === "mentalok" ? (
    <div className="flex items-center justify-between gap-2">
      <label className="text-[10.5px] font-medium text-white/55">
        Preset
      </label>
      <select
        value={activePreset}
        onChange={(e) => onUpdateNodeData(id, { presetId: e.target.value })}
        className="nodrag max-w-[205px] flex-1 cursor-pointer rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
      >
        {spec.presets.map((preset) => (
          <option key={preset} value={preset}>
            {preset}
          </option>
        ))}
      </select>
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-2">
      {spec.supportsAspectRatio ? (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/50">
            {isZh ? "比例" : "Ratio"}
          </label>
          <select
            value={data.aspectRatio ?? "16:9"}
            onChange={(e) =>
              onUpdateNodeData(id, {
                aspectRatio: e.target.value as CanvasNodeData["aspectRatio"],
              })
            }
            className="nodrag disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
          >
            {(spec.provider === "google"
              ? ASPECT_OPTIONS.filter((ratio) => spec.presets.includes(ratio))
              : ASPECT_OPTIONS
            ).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {spec.supportsResolution ? (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/50">
            {isZh ? "解析度" : "Resolution"}
          </label>
          <select
            value={data.resolution ?? "2k"}
            onChange={(e) =>
              onUpdateNodeData(id, {
                resolution: e.target.value as CanvasNodeData["resolution"],
              })
            }
            className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
          >
            {RESOLUTION_OPTIONS.map((res) => (
              <option key={res} value={res}>
                {res.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {spec.category === "video" ||
      spec.id === "scro:talking-head" ||
      spec.id === "scro:swap" ||
      spec.id === "scro:teleport" ||
      spec.id === "scro:swap-render" ||
      spec.id === "scro:teleport-render" ? (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/50">
            {isZh ? "秒數" : "Duration"} ({durationSeconds}s)
          </label>
          <input
            type="number"
            min={spec.minDurationSeconds ?? 5}
            max={spec.maxDurationSeconds ?? 15}
            value={durationSeconds}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed)) {
                onUpdateNodeData(id, { durationSeconds: parsed });
              }
            }}
            className="nodrag disabled:cursor-not-allowed disabled:opacity-50 rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
          />
        </div>
      ) : null}
    </div>
  )}

  {/* Scro Tool & FFmpeg Node Controls */}
  {spec.provider === "scro" &&
  spec.id !== "scro:explainer-frame" &&
  spec.id !== "scro:director-frame" &&
  spec.id !== "scro:teleport-render" ? (
    <div className="space-y-2 rounded-[10px] border border-white/8 bg-[#0b0e14]/80 p-2">
      <CaptionNodeFields
        modelId={spec.id}
        isZh={isZh}
        language={String(toolParams.captionLanguage ?? data.presetId ?? "yue")}
        text={data.text}
        onLanguage={(captionLanguage) =>
          onUpdateNodeData(id, {
            presetId: captionLanguage,
            toolParams: { ...toolParams, captionLanguage },
          })
        }
        onText={(text) => onUpdateNodeData(id, { text })}
      />
      {(spec.id === "scro:talking-head" ||
        spec.id === "scro:explainer" ||
        spec.id === "scro:swap" ||
        spec.id === "scro:life" ||
        spec.id === "scro:poster" ||
        spec.id === "scro:tts") && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/50">
            {isZh ? "角色 Character" : "Character"}
          </span>
          <CanvasPreviewSelect
            value={String(toolParams.characterId ?? "")}
            ariaLabel={isZh ? "角色" : "Character"}
            options={libraryCharacterChoices(
              characterOptions,
              isZh ? "（不指定 / 使用連線圖片）" : "(None / Use wired image)",
            )}
            onChange={(characterId) => updateToolParam("characterId", characterId || undefined)}
          />
        </div>
      )}

      {(spec.id === "scro:talking-head" ||
        spec.id === "scro:explainer" ||
        spec.id === "scro:tts") && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-white/50">
              {isZh ? "語言" : "Language"}
            </label>
            <select
              value={String(toolParams.language ?? "yue")}
              onChange={(e) => updateToolParam("language", e.target.value)}
              className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
            >
              <option value="yue">廣東話 (yue)</option>
              <option value="zh">國語 (zh)</option>
              <option value="en">English (en)</option>
            </select>
          </div>

          {spec.id === "scro:tts" ? (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50">
                {isZh ? "預設聲線" : "Voice"}
              </label>
              <select
                value={String(toolParams.voicePreset ?? "cathy")}
                onChange={(e) => updateToolParam("voicePreset", e.target.value)}
                className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
              >
                <option value="cathy">Cathy (粵語女)</option>
                <option value="alan">Alan (粵語男)</option>
                <option value="una">Una (國語女)</option>
                <option value="yu">Yu (國語男)</option>
                <option value="bella">Bella (EN Female)</option>
                <option value="brian">Brian (EN Male)</option>
              </select>
            </div>
          ) : spec.id === "scro:explainer" ? (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50">
                {isZh ? "片長預設" : "Target"}
              </label>
              <select
                value={String(toolParams.durationPreset ?? "30s")}
                onChange={(e) => {
                  const preset = e.target.value;
                  const secs =
                    preset === "15s" ? 15 : preset === "45s" ? 45 : preset === "60s" ? 60 : 30;
                  onUpdateNodeData(id, {
                    durationSeconds: secs,
                    toolParams: { ...toolParams, durationPreset: preset },
                  });
                }}
                className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
              >
                <option value="15s">15s</option>
                <option value="30s">30s</option>
                <option value="45s">45s</option>
                <option value="60s">60s</option>
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50">
                {isZh ? "取景" : "Framing"}
              </label>
              <select
                value={String(toolParams.framing ?? "collarbone-close")}
                onChange={(e) => updateToolParam("framing", e.target.value)}
                className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
              >
                <option value="collarbone-close">{isZh ? "鎖骨特寫" : "Close"}</option>
                <option value="waist-up">{isZh ? "半身" : "Waist-up"}</option>
                <option value="handheld-selfie">{isZh ? "手持自拍" : "Selfie"}</option>
                <option value="full-body">{isZh ? "全身" : "Full body"}</option>
              </select>
            </div>
          )}
        </div>
      )}

      {spec.id === "scro:tts" ? (
        <div className="flex items-center justify-between gap-2">
          <label className="text-[10px] text-white/50">
            {isZh ? "語速" : "Speed"} ({Number(toolParams.ttsSpeed ?? 1).toFixed(2)}x)
          </label>
          <input
            type="range"
            min={0.8}
            max={1.5}
            step={0.05}
            value={Number(toolParams.ttsSpeed ?? 1)}
            onChange={(e) => updateToolParam("ttsSpeed", Number(e.target.value))}
            className="nodrag w-28 accent-[#c6f24b]"
          />
        </div>
      ) : null}

      {spec.id === "scro:explainer" ? (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/50">
            {isZh ? "解說風格" : "Director Style"}
          </label>
          <select
            value={String(toolParams.skillSlug ?? "cartoon-explainer-video-director")}
            onChange={(e) => updateToolParam("skillSlug", e.target.value)}
            className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
          >
            <option value="cartoon-explainer-video-director">白板手繪解說 (Whiteboard)</option>
            <option value="paper-cutout-explainer-video-director">剪紙拼貼解說 (Paper Cutout)</option>
            <option value="papercraft-diorama-director">3D 摺紙微縮 (Papercraft)</option>
          </select>
        </div>
      ) : null}

      {spec.id === "scro:swap" || spec.id === "scro:swap-render" ? (
        <div className="space-y-1.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-white/50">
              {isZh ? "換角模式" : "Swap Mode"}
            </label>
            <select
              value={String(toolParams.swapMode ?? "character")}
              onChange={(e) => updateToolParam("swapMode", e.target.value)}
              className="nodrag disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
            >
              <option value="character">{isZh ? "角色替換 (Character)" : "Character Swap"}</option>
              <option value="object">{isZh ? "物件／穿搭替換 (Object)" : "Object / Outfit"}</option>
              <option value="relight">{isZh ? "電影打光 (Relight)" : "Relight Video"}</option>
              {spec.id === "scro:swap" ? (
                <option value="colorfix">{isZh ? "H3 Soft 調色" : "H3 Soft Color Fix"}</option>
              ) : null}
            </select>
          </div>
          {toolParams.swapMode === "object" ? (
            <div className="grid grid-cols-2 gap-1.5">
              <ComposedInput
                type="text"
                value={String(toolParams.objectTarget ?? "")}
                onValue={(objectTarget) => updateToolParam("objectTarget", objectTarget)}
                placeholder={isZh ? "目標物 (e.g. jacket)" : "Target (e.g. jacket)"}
                className="nodrag disabled:cursor-not-allowed disabled:opacity-50 rounded-[7px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
              />
              <select
                value={String(toolParams.objectEditMode ?? "change")}
                onChange={(e) => updateToolParam("objectEditMode", e.target.value)}
                className="nodrag disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer rounded-[7px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
              >
                <option value="change">Change</option>
                <option value="add">Add</option>
                <option value="remove">Remove</option>
              </select>
            </div>
          ) : null}
          {toolParams.swapMode === "relight" ? (
            <SwapLightLookField
              isZh={isZh}
              value={typeof toolParams.lightLookId === "string" ? toolParams.lightLookId : undefined}
              onChange={(lightLookId) => updateToolParam("lightLookId", lightLookId)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  ) : null}

  {spec.provider === "ffmpeg" ? (
    <div className="space-y-2 rounded-[10px] border border-white/8 bg-[#0b0e14]/80 p-2">
      {spec.id === "ffmpeg:concat" ? (
        <>
          <ConcatVideoOrder nodeId={id} isZh={isZh} />
          <ConcatToSequenceButton nodeId={id} isZh={isZh} />
        </>
      ) : null}
      {spec.id === SEQUENCE_MODEL_ID ? <SequenceNodeSummary nodeId={id} isZh={isZh} /> : null}
      {spec.id === "ffmpeg:audio-concat" ? <ConcatVideoOrder nodeId={id} isZh={isZh} port="audios" /> : null}

      {spec.id === "ffmpeg:audio-mux" ? (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-white/50">
              {isZh ? "混音模式" : "Mix Mode"}
            </label>
            <select
              value={String(toolParams.ffmpegMixMode ?? "replace")}
              onChange={(e) => updateToolParam("ffmpegMixMode", e.target.value)}
              className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
            >
              <option value="replace">{isZh ? "替換音軌" : "Replace"}</option>
              <option value="mix-ducking">{isZh ? "壓低原聲混音" : "Mix + Duck"}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-white/50">
              {isZh ? "音量" : "Gain"} ({Number(toolParams.ffmpegAudioGainDb ?? 0)}dB)
            </label>
            <input
              type="number"
              min={-24}
              max={12}
              value={Number(toolParams.ffmpegAudioGainDb ?? 0)}
              onChange={(e) => updateToolParam("ffmpegAudioGainDb", Number(e.target.value))}
              className="nodrag rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
            />
          </div>
        </div>
      ) : null}

      {spec.id === "ffmpeg:trim-speed" ? (
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            <input
              type="number"
              min={0}
              step={0.1}
              value={Number(toolParams.ffmpegStartSec ?? 0)}
              onChange={(e) => updateToolParam("ffmpegStartSec", Number(e.target.value))}
              placeholder="Start s"
              className="nodrag disabled:cursor-not-allowed disabled:opacity-50 rounded-[7px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
            />
            <input
              type="number"
              min={0}
              step={0.1}
              value={toolParams.ffmpegEndSec !== undefined ? Number(toolParams.ffmpegEndSec) : ""}
              onChange={(e) =>
                updateToolParam(
                  "ffmpegEndSec",
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
              placeholder="End s"
              className="nodrag disabled:cursor-not-allowed disabled:opacity-50 rounded-[7px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
            />
            <input
              type="number"
              min={0.25}
              max={4}
              step={0.05}
              value={Number(toolParams.ffmpegSpeed ?? 1)}
              onChange={(e) => updateToolParam("ffmpegSpeed", Number(e.target.value))}
              placeholder="Speed"
              className="nodrag rounded-[7px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-white/70">
            <input
              type="checkbox"
              checked={Boolean(toolParams.ffmpegTrimSilence)}
              onChange={(e) => updateToolParam("ffmpegTrimSilence", e.target.checked)}
              className="nodrag accent-[#c6f24b]"
            />
            {isZh ? "自動裁走頭尾靜音" : "Trim leading/trailing silence"}
          </label>
        </div>
      ) : null}

      {spec.id === "ffmpeg:transform" ? (
        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={String(toolParams.ffmpegCropMode ?? "center-crop")}
            onChange={(e) => updateToolParam("ffmpegCropMode", e.target.value)}
            className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
          >
            <option value="center-crop">{isZh ? "置中裁切" : "Center Crop"}</option>
            <option value="fit-pad">{isZh ? "等比留黑邊" : "Fit Pad"}</option>
          </select>
          <select
            value={String(toolParams.ffmpegColorGrade ?? "none")}
            onChange={(e) => updateToolParam("ffmpegColorGrade", e.target.value)}
            className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
          >
            <option value="none">{isZh ? "原色" : "Original Color"}</option>
            <option value="h3-soft">H3 Soft</option>
          </select>
        </div>
      ) : null}

      <FfmpegEditFields
        modelId={spec.id}
        isZh={isZh}
        toolParams={toolParams}
        onToolParam={updateToolParam}
        prompt={data.prompt}
        promptWired={isPromptWired}
        onPrompt={(prompt) => onUpdateNodeData(id, { prompt })}
      />
      <FfmpegParamFields modelId={spec.id} isZh={isZh} toolParams={toolParams} onToolParam={updateToolParam} />
      {spec.id === "ffmpeg:color-grade" ? (
        <select
          value={String(toolParams.gradeLook ?? "jutsu")}
          onChange={(e) => updateToolParam("gradeLook", e.target.value)}
          className="nodrag disabled:cursor-not-allowed disabled:opacity-50 w-full cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
        >
          <option value="jutsu">{isZh ? "H3 Soft（換角／換場）" : "H3 Soft (Swap / Teleport)"}</option>
          <option value="talking-head">{isZh ? "口播膠片質感" : "Talking head sensor texture"}</option>
          <option value="talking-head-selfie">
            {isZh ? "口播自拍手機質感" : "Talking head selfie texture"}
          </option>
        </select>
      ) : null}
    </div>
  ) : null}

  {/* Collapsible Advanced options (Mentalok negativePrompt & seed) */}
  {spec.provider === "mentalok" && promptPort ? (
    <div>
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="nodrag flex cursor-pointer items-center gap-1 text-[10.5px] text-white/45 transition hover:text-white/75"
      >
        {showAdvanced ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {isZh ? "進階參數（負向詞 / Seed）" : "Advanced (Negative / Seed)"}
      </button>
      {showAdvanced ? (
        <div className="mt-2 space-y-1.5 rounded-[10px] border border-white/6 bg-[#0b0e14]/70 p-2">
          <ComposedInput
            type="text"
            value={data.negativePrompt ?? ""}
            onValue={(negativePrompt) => onUpdateNodeData(id, { negativePrompt })}
            placeholder="Negative prompt (optional)"
            className="nodrag w-full rounded-[7px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/85 placeholder:text-white/30 focus:border-[#c6f24b]/50 focus:outline-none"
          />
          <input
            type="number"
            value={data.seed ?? ""}
            onChange={(e) => {
              const raw = e.target.value.trim();
              onUpdateNodeData(id, {
                seed: raw === "" ? undefined : Number(raw),
              });
            }}
            placeholder="Seed (random if blank)"
            className="nodrag w-full rounded-[7px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/85 placeholder:text-white/30 focus:border-[#c6f24b]/50 focus:outline-none"
          />
        </div>
      ) : null}
    </div>
  ) : null}

  {/* Error banner */}
  {status === "failed" && data.lastError ? (
    <div className="flex items-start gap-1.5 rounded-[10px] border border-rose-500/35 bg-rose-500/10 p-2 text-[11px] text-rose-200">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
      <span className="line-clamp-3">{data.lastError}</span>
    </div>
  ) : null}

  {outdated ? <OutdatedBanner reason={outdated} isZh={isZh} /> : null}
    </>
  );
}
