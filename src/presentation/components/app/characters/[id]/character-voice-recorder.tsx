"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VOICE_SAMPLE_MIN_SECONDS,
  type VoiceSampleLanguage,
} from "@/model/character-voice-sample";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import {
  downsampleMonoFloat32,
  encodeMonoPcmWav,
  formatRecordingClock,
  RECORDER_TARGET_SAMPLE_RATE,
  VOICE_READING_SCRIPTS,
} from "@/presentation/components/app/characters/voice-recorder-wav";

const MAX_RECORD_SECONDS = 118;
const BAR_COUNT = 16;

type RecorderCopy = {
  title: string;
  scriptTitle: string;
  nextScript: string;
  startBtn: string;
  stopBtn: string;
  reRecordBtn: string;
  saveNewBtn: string;
  appendBtn: string;
  replaceBtn: string;
  cancelBtn: string;
  minSecondsHint: (min: number) => string;
  readyHint: (sec: number) => string;
  tooShortError: (min: number) => string;
  micDeniedError: string;
  micUnsupportedError: string;
  encodingHint: string;
};

function getRecorderCopy(locale: string): RecorderCopy {
  const isZh = locale.startsWith("zh");
  if (isZh) {
    return {
      title: "麥克風即時錄音",
      scriptTitle: "建議讀稿（照讀約 15–20 秒即可）",
      nextScript: "換一段讀稿",
      startBtn: "開始錄音",
      stopBtn: "停止錄音",
      reRecordBtn: "重新錄音",
      saveNewBtn: "儲存並建立聲線",
      appendBtn: "+ 加入此段錄音",
      replaceBtn: "取代現有示範聲音",
      cancelBtn: "關閉",
      minSecondsHint: (min) => `請自然朗讀至少 ${min} 秒（建議 15–30 秒）`,
      readyHint: (sec) => `已錄製 ${sec} 秒 ✓ 可隨時停止並儲存`,
      tooShortError: (min) => `錄音時間太短，請至少錄製 ${min} 秒以上。`,
      micDeniedError: "無法存取麥克風，請在瀏覽器網址列允許麥克風權限後再試。",
      micUnsupportedError: "此瀏覽器不支援麥克風錄音功能。",
      encodingHint: "正在處理錄音檔…",
    };
  }
  return {
    title: "Record with Microphone",
    scriptTitle: "Suggested reading prompt (~15–20s)",
    nextScript: "Next prompt",
    startBtn: "Start recording",
    stopBtn: "Stop recording",
    reRecordBtn: "Record again",
    saveNewBtn: "Save & clone voice",
    appendBtn: "+ Add this recording",
    replaceBtn: "Replace existing sample",
    cancelBtn: "Close",
    minSecondsHint: (min) => `Speak naturally for at least ${min}s (15–30s recommended)`,
    readyHint: (sec) => `Recorded ${sec}s ✓ Ready to stop & save`,
    tooShortError: (min) => `Recording is too short. Please record at least ${min} seconds.`,
    micDeniedError: "Microphone access was denied. Please allow microphone access in your browser.",
    micUnsupportedError: "Microphone recording is not supported in this browser.",
    encodingHint: "Preparing audio…",
  };
}

// Inline microphone voice recorder with live waveform meter, reading prompt, and 16-bit PCM WAV export.
export function CharacterVoiceRecorder({
  language,
  hasExistingSample,
  uploading,
  onUploadFile,
  onClose,
}: {
  language: VoiceSampleLanguage;
  hasExistingSample: boolean;
  uploading: boolean;
  onUploadFile: (file: File, mode: "append" | "replace") => void;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const copy = getRecorderCopy(locale);
  const scripts = VOICE_READING_SCRIPTS[language] ?? VOICE_READING_SCRIPTS.yue;

  const [scriptIndex, setScriptIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "recording" | "encoding" | "preview">("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.12));
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startMsRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const pcmRateRef = useRef<number>(48000);

  // Clean up media streams, timers, and object URLs on unmount.
  const stopHardware = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        // Ignore stop errors on cleanup
      }
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopHardware();
    };
  }, [stopHardware]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Convert recorded audio into a clean 16-bit PCM WAV File for reliable server duration probing.
  const buildWavFileFromRecording = useCallback(
    async (rawBlob: Blob, fallbackChunks: Float32Array[], fallbackRate: number): Promise<File> => {
      let monoSamples: Float32Array | null = null;
      let sampleRate = fallbackRate;

      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx && rawBlob.size > 0) {
          const decodeCtx = new Ctx();
          try {
            const arrayBuf = await rawBlob.arrayBuffer();
            const audioBuf = await decodeCtx.decodeAudioData(arrayBuf.slice(0));
            sampleRate = audioBuf.sampleRate;
            const length = audioBuf.length;
            const chCount = audioBuf.numberOfChannels;
            const mixed = new Float32Array(length);
            for (let ch = 0; ch < chCount; ch++) {
              const chData = audioBuf.getChannelData(ch);
              for (let i = 0; i < length; i++) {
                mixed[i] += chData[i] / chCount;
              }
            }
            monoSamples = mixed;
          } finally {
            await decodeCtx.close().catch(() => undefined);
          }
        }
      } catch {
        // Fallback to live-captured PCM chunks below if decodeAudioData fails
      }

      if (!monoSamples && fallbackChunks.length > 0) {
        const totalLength = fallbackChunks.reduce((sum, arr) => sum + arr.length, 0);
        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of fallbackChunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        monoSamples = merged;
      }

      if (monoSamples && monoSamples.length > 0) {
        const downsampled = downsampleMonoFloat32(
          monoSamples,
          sampleRate,
          RECORDER_TARGET_SAMPLE_RATE,
        );
        const wavBuffer = encodeMonoPcmWav(downsampled.samples, downsampled.sampleRate);
        return new File([wavBuffer], `mic-${language}-${Date.now()}.wav`, {
          type: "audio/wav",
        });
      }

      // Final fallback if neither decode nor PCM buffer exists
      return new File([rawBlob], `mic-${language}-${Date.now()}.wav`, {
        type: "audio/wav",
      });
    },
    [language],
  );

  const finalizeRecording = useCallback(async () => {
    const durationSec = Math.max(
      1,
      Math.round((Date.now() - startMsRef.current) / 1000),
    );
    setElapsedSeconds(durationSec);

    if (durationSec < VOICE_SAMPLE_MIN_SECONDS) {
      setLocalError(copy.tooShortError(VOICE_SAMPLE_MIN_SECONDS));
      setStatus("idle");
      return;
    }

    setStatus("encoding");
    const rawBlob = new Blob(chunksRef.current, {
      type: chunksRef.current[0]?.type || "audio/webm",
    });
    const wavFile = await buildWavFileFromRecording(
      rawBlob,
      pcmChunksRef.current,
      pcmRateRef.current,
    );
    const nextUrl = URL.createObjectURL(wavFile);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextUrl;
    });
    setRecordedFile(wavFile);
    setStatus("preview");
  }, [buildWavFileFromRecording, copy]);

  const stopRecording = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopHardware();
      void finalizeRecording();
    }
  }, [finalizeRecording, stopHardware]);

  async function startRecording() {
    setLocalError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setLocalError(copy.micUnsupportedError);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      pcmChunksRef.current = [];

      // Set up Web Audio AnalyserNode for live level bars + PCM backup capture
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const audioCtx = new Ctx();
        audioCtxRef.current = audioCtx;
        pcmRateRef.current = audioCtx.sampleRate;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        // Also capture mono PCM frames via ScriptProcessorNode as a fallback for WAV encoding
        if (typeof audioCtx.createScriptProcessor === "function") {
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (event) => {
            const input = event.inputBuffer.getChannelData(0);
            pcmChunksRef.current.push(new Float32Array(input));
          };
          source.connect(processor);
          processor.connect(audioCtx.destination);
        }

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const tickMeter = () => {
          analyser.getByteFrequencyData(freqData);
          const nextBars: number[] = [];
          for (let i = 0; i < BAR_COUNT; i++) {
            const val = freqData[i % freqData.length] ?? 0;
            nextBars.push(Math.max(0.12, Math.min(1, val / 220)));
          }
          setLevels(nextBars);
          rafRef.current = window.requestAnimationFrame(tickMeter);
        };
        rafRef.current = window.requestAnimationFrame(tickMeter);
      }

      const preferredMime =
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : typeof MediaRecorder !== "undefined" &&
              MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "";

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopHardware();
        void finalizeRecording();
      };

      startMsRef.current = Date.now();
      setElapsedSeconds(0);
      setRecordedFile(null);
      setStatus("recording");
      recorder.start(250);

      timerRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - startMsRef.current) / 1000);
        setElapsedSeconds(sec);
        if (sec >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch (error: unknown) {
      stopHardware();
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setLocalError(copy.micDeniedError);
      } else {
        setLocalError(copy.micUnsupportedError);
      }
    }
  }

  function resetToIdle() {
    stopHardware();
    setRecordedFile(null);
    setElapsedSeconds(0);
    setLocalError("");
    setStatus("idle");
  }

  const reachedMin = elapsedSeconds >= VOICE_SAMPLE_MIN_SECONDS;

  return (
    <div className="mt-3 rounded-2xl border border-accent-ink/15 bg-[var(--studio-fill,rgba(18,20,28,0.03))] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status === "recording"
                ? "animate-pulse bg-red-500"
                : status === "preview"
                  ? "bg-emerald-500"
                  : "bg-accent-ink/40"
            }`}
          />
          <h4 className="text-xs font-bold uppercase tracking-wider text-accent-ink">
            {copy.title}
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={uploading || status === "recording"}
          className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold text-muted transition hover:text-accent-ink disabled:opacity-50"
        >
          {copy.cancelBtn}
        </button>
      </div>

      {/* Built-in Teleprompter / Reading Script */}
      <div className="mt-2.5 rounded-xl border border-accent-ink/10 bg-paper p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-muted">{copy.scriptTitle}</span>
          {scripts.length > 1 ? (
            <button
              type="button"
              onClick={() => setScriptIndex((idx) => (idx + 1) % scripts.length)}
              className="cursor-pointer text-[11px] font-semibold text-accent hover:underline"
            >
              {copy.nextScript} ↻
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-sm leading-6 font-medium text-accent-ink">
          「{scripts[scriptIndex % scripts.length]}」
        </p>
      </div>

      {/* Live Waveform & Timer during idle / recording */}
      {status === "idle" || status === "recording" ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {status === "recording" ? (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5"
              >
                <span className="h-2.5 w-2.5 rounded-xs bg-white" aria-hidden="true" />
                {copy.stopBtn}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={uploading}
                className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="7" y="2.5" width="6" height="9.5" rx="3" />
                  <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0" />
                  <path d="M10 15v2.5" />
                  <path d="M7 17.5h6" />
                </svg>
                {copy.startBtn}
              </button>
            )}

            {/* Live audio level bars */}
            <div className="flex h-8 items-center gap-1 px-1" aria-hidden="true">
              {levels.map((lvl, idx) => (
                <span
                  key={idx}
                  style={{ height: `${Math.round(lvl * 28)}px` }}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    status === "recording"
                      ? reachedMin
                        ? "bg-emerald-500"
                        : "bg-accent"
                      : "bg-accent-ink/20"
                  }`}
                />
              ))}
            </div>

            <span className="font-mono text-sm font-bold tabular-nums text-accent-ink">
              {formatRecordingClock(elapsedSeconds)}
              <span className="font-normal text-muted"> / 02:00</span>
            </span>
          </div>

          <span
            className={`text-xs font-medium ${
              status === "recording" && reachedMin ? "text-emerald-600" : "text-muted"
            }`}
          >
            {status === "recording" && reachedMin
              ? copy.readyHint(elapsedSeconds)
              : copy.minSecondsHint(VOICE_SAMPLE_MIN_SECONDS)}
          </span>
        </div>
      ) : null}

      {status === "encoding" ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Spinner className="h-4 w-4" />
          <span>{copy.encodingHint}</span>
        </div>
      ) : null}

      {/* Recorded Preview & Save Actions */}
      {status === "preview" && recordedFile && previewUrl ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <audio controls src={previewUrl} className="h-10 max-w-full flex-1" />
            <span className="text-xs font-semibold text-emerald-600">
              {formatRecordingClock(elapsedSeconds)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={uploading}
              onClick={() =>
                onUploadFile(recordedFile, hasExistingSample ? "append" : "replace")
              }
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full bg-accent px-4 text-xs font-bold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? <Spinner className="h-3.5 w-3.5" /> : null}
              {hasExistingSample ? copy.appendBtn : copy.saveNewBtn}
            </button>

            {hasExistingSample ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => onUploadFile(recordedFile, "replace")}
                className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-3.5 text-xs font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.replaceBtn}
              </button>
            ) : null}

            <button
              type="button"
              disabled={uploading}
              onClick={resetToIdle}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink/15 bg-paper px-3.5 text-xs font-semibold text-muted transition hover:text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copy.reRecordBtn}
            </button>
          </div>
        </div>
      ) : null}

      {localError ? (
        <p role="alert" className="mt-2.5 text-xs font-semibold text-accent">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
