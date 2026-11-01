"use client";

import { useEffect, useRef, useState } from "react";
import type { VoLanguage } from "@/model/project";
import { uploadTalkingHeadVoAction } from "@/presentation/actions/vo-upload";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";

const AUDIO_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/m4a,audio/webm,audio/ogg";

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function VoAudioRecorderControls({
  voUrl,
  voDurationSeconds,
  language,
  disabled,
  onUploaded,
  onClear,
  onError,
}: {
  voUrl?: string;
  voDurationSeconds?: number;
  language?: VoLanguage;
  disabled?: boolean;
  onUploaded: (payload: {
    url: string;
    durationSeconds: number;
    transcript: string;
  }) => void;
  onClear: () => void;
  onError?: (message: string) => void;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function processAudioFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      if (language) formData.set("language", language);
      const res = await uploadTalkingHeadVoAction(formData);
      if (!res.ok) {
        onError?.(res.error);
        return;
      }
      onUploaded({
        url: res.url,
        durationSeconds: res.durationSeconds,
        transcript: res.transcript,
      });
    } catch {
      onError?.(isEn ? "Failed to upload voice audio." : "上傳 VO 語音失敗，請重試");
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    if (disabled || uploading || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);

        const blobType = recorder.mimeType || "audio/webm";
        const ext = blobType.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        if (blob.size > 0) {
          const file = new File([blob], `recorded-vo-${Date.now()}.${ext}`, {
            type: blobType,
          });
          void processAudioFile(file);
        }
      };

      recorderRef.current = recorder;
      setElapsedSec(0);
      setRecording(true);
      recorder.start(250);
      timerRef.current = window.setInterval(() => {
        setElapsedSec((prev) => {
          if (prev + 1 >= 120) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      onError?.(
        isEn
          ? "Microphone permission denied or unavailable."
          : "無法開啟麥克風，請允許瀏覽器麥克風權限或直接上傳音訊檔",
      );
    }
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
  }

  const busy = disabled || uploading;

  return (
    <div className="rounded-xl border border-accent-ink/15 bg-paper/75 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-ink text-xs font-bold text-lime">
            🎙
          </span>
          <div>
            <p className="text-xs font-bold text-foreground">
              {isEn
                ? "Direct VO Audio (Upload or Record)"
                : "直接上傳／錄製真人 VO 語音（選填）"}
            </p>
            <p className="text-[11px] text-muted">
              {isEn
                ? "Uses your voice audio + character to generate lip-sync video directly and auto-fills subtitles."
                : "直接用你嘅真聲 + 角色生成對嘴影片（免 TTS），並自動識別文字產生無標點字幕。"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept={AUDIO_ACCEPT}
            className="hidden"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              ev.target.value = "";
              if (f) void processAudioFile(f);
            }}
          />

          {recording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-red-600 px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-700"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              <span>
                {isEn
                  ? `Stop (${formatTimer(elapsedSec)})`
                  : `停止錄音 (${formatTimer(elapsedSec)})`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void startRecording()}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-accent-ink px-3 text-xs font-bold text-lime transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>●</span>
              <span>
                {voUrl
                  ? isEn
                    ? "Re-record Mic"
                    : "重新錄音"
                  : isEn
                    ? "Record Mic"
                    : "麥克風錄音"}
              </span>
            </button>
          )}

          <button
            type="button"
            disabled={busy || recording}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border border-accent-ink/20 bg-white px-3 text-xs font-bold text-foreground transition hover:border-accent-ink/45 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? <Spinner className="h-3.5 w-3.5" /> : <span>↑</span>}
            <span>
              {uploading
                ? isEn
                  ? "Transcribing…"
                  : "AI 識別字幕中…"
                : voUrl
                  ? isEn
                    ? "Replace Audio"
                    : "更換音訊檔"
                  : isEn
                    ? "Upload MP3/WAV/M4A"
                    : "上傳音訊檔"}
            </span>
          </button>

          {voUrl && !recording && !uploading ? (
            <button
              type="button"
              disabled={busy}
              onClick={onClear}
              className="inline-flex h-8 cursor-pointer items-center rounded-full px-2.5 text-xs font-semibold text-muted transition hover:text-red-600"
            >
              {isEn ? "Remove" : "移除"}
            </button>
          ) : null}
        </div>
      </div>

      {voUrl ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5 rounded-lg border border-accent-ink/10 bg-white px-3 py-2">
          <audio src={voUrl} controls className="h-8 min-w-0 flex-1" />
          {voDurationSeconds ? (
            <span className="shrink-0 rounded-full bg-lime/35 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-accent-ink">
              {Math.round(voDurationSeconds)}s VO
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
