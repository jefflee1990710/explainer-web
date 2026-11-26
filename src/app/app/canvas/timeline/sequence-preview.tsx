"use client";

// Proxy preview of a Sequence: one <video> hops between the wired clips at their in points,
// layers are drawn as DOM on top, and audio items play in sync. Transitions show as cuts here;
// the render draws them.

import { useCallback, useEffect, useRef } from "react";
import type { CanvasSequence } from "@/model/canvas-sequence";
import { audioItemSec, type PlacedClip } from "@/service/canvas/core/sequence";
import type { SequenceSource } from "@/app/app/canvas/timeline/use-sequence-sources";

const TEXT_COLORS: Record<string, string> = {
  white: "#ffffff",
  yellow: "#ffd60a",
  black: "#000000",
  lime: "#c6f24b",
  red: "#ff4d4f",
};

function clipAt(placed: readonly PlacedClip[], t: number): number {
  for (let i = placed.length - 1; i >= 0; i -= 1) if (t >= placed[i]!.start) return i;
  return 0;
}

// Keeps a secondary media element at its expected local time while its window is active.
function syncMedia(el: HTMLMediaElement | null, active: boolean, local: number, playing: boolean) {
  if (!el) return;
  if (!active) {
    if (!el.paused) el.pause();
    return;
  }
  if (Math.abs(el.currentTime - local) > 0.3) el.currentTime = Math.max(0, local);
  if (playing && el.paused) void el.play().catch(() => {});
  if (!playing && !el.paused) el.pause();
}

export function SequencePreview({
  seq,
  placed,
  sources,
  totalSec,
  time,
  playing,
  onTime,
  onStop,
}: {
  seq: CanvasSequence;
  placed: readonly PlacedClip[];
  sources: Record<string, SequenceSource>;
  totalSec: number;
  time: number;
  playing: boolean;
  onTime: (sec: number) => void;
  onStop: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const indexRef = useRef(0);
  const sideRefs = useRef(new Map<string, HTMLMediaElement>());
  const timeRef = useRef(time);
  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  // Points the main <video> at the clip under `t`.
  const loadClip = useCallback(
    (t: number) => {
      const video = videoRef.current;
      const i = clipAt(placed, t);
      const p = placed[i];
      if (!video || !p) return;
      indexRef.current = i;
      const url = sources[p.clip.ref]?.url;
      if (!url) return;
      if (video.getAttribute("src") !== url) video.src = url;
      video.muted = Boolean(p.clip.muted);
      video.playbackRate = p.clip.speed || 1;
      video.currentTime = p.inSec + (t - p.start) * (p.clip.speed || 1);
    },
    [placed, sources],
  );

  const syncSide = useCallback(
    (t: number, isPlaying: boolean) => {
      for (const layer of seq.tracks.overlay) {
        if (layer.kind !== "video") continue;
        const end = layer.endSec ?? totalSec;
        syncMedia(sideRefs.current.get(layer.id) ?? null, t >= layer.startSec && t < end, t - layer.startSec, isPlaying);
      }
      for (const item of seq.tracks.audio) {
        const el = sideRefs.current.get(item.id) ?? null;
        const len = audioItemSec(item, sources[item.ref]?.durationSec, totalSec);
        const srcLen = sources[item.ref]?.durationSec;
        let local = item.inSec + (t - item.startSec);
        if (item.loop && srcLen) local = item.inSec + ((t - item.startSec) % Math.max(0.1, srcLen - item.inSec));
        if (el) el.volume = Math.min(1, Math.pow(10, item.gainDb / 20));
        syncMedia(el, t >= item.startSec && t < item.startSec + len, local, isPlaying);
      }
    },
    [seq.tracks.audio, seq.tracks.overlay, sources, totalSec],
  );

  // Paused: follow the playhead.
  useEffect(() => {
    if (playing) return;
    loadClip(time);
    syncSide(time, false);
    videoRef.current?.pause();
  }, [loadClip, playing, syncSide, time]);

  // Playing: the clip's own clock drives the playhead, hopping to the next clip at its out point.
  useEffect(() => {
    if (!playing) return;
    const video = videoRef.current;
    if (!video) return;
    if (timeRef.current >= totalSec - 0.05) timeRef.current = 0;
    loadClip(timeRef.current);
    void video.play().catch(() => {});
    let raf = 0;
    const tick = () => {
      const p = placed[indexRef.current];
      if (!p) return onStop();
      let t = p.start + (video.currentTime - p.inSec) / (p.clip.speed || 1);
      if (t >= p.end - 0.03 || video.ended) {
        const next = placed[indexRef.current + 1];
        if (!next) {
          onTime(totalSec);
          syncSide(totalSec, false);
          return onStop();
        }
        t = next.start + Math.max(0, p.end - next.start);
        loadClip(t);
        void video.play().catch(() => {});
      }
      onTime(Math.min(totalSec, t));
      syncSide(t, true);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      video.pause();
      syncSide(timeRef.current, false);
    };
  }, [loadClip, onStop, onTime, placed, playing, syncSide, totalSec]);

  const [aw, ah] = seq.aspectRatio.split(":").map(Number);
  const media = (id: string) => (el: HTMLMediaElement | null) => {
    if (el) sideRefs.current.set(id, el);
    else sideRefs.current.delete(id);
  };

  return (
    <div className="flex h-full items-center justify-center bg-black/60 p-2">
      <div
        className="relative h-full max-w-full overflow-hidden rounded-md bg-black"
        style={{ aspectRatio: `${aw} / ${ah}`, containerType: "size" }}
      >
        <video ref={videoRef} playsInline className="absolute inset-0 h-full w-full object-contain" />
        {seq.tracks.overlay.map((layer) => {
          const end = layer.endSec ?? totalSec;
          const visible = time >= layer.startSec && time < end;
          if (layer.kind === "text") {
            if (!visible || !layer.text?.trim()) return null;
            const place =
              layer.position === "top" ? "top-[6%]" : layer.position === "center" ? "top-1/2 -translate-y-1/2" : "bottom-[6%]";
            return (
              <div key={layer.id} className={`absolute inset-x-[4%] ${place} text-center`}>
                <span
                  className="font-bold whitespace-pre-wrap"
                  style={{
                    fontSize: `${layer.sizePct}cqh`,
                    color: TEXT_COLORS[layer.color] ?? "#fff",
                    background: layer.box ? "rgba(0,0,0,0.55)" : undefined,
                    padding: layer.box ? "0.1em 0.35em" : undefined,
                    textShadow: layer.box ? undefined : "0 0 0.15em #000, 0 0 0.15em #000",
                  }}
                >
                  {layer.text}
                </span>
              </div>
            );
          }
          const url = layer.ref ? sources[layer.ref]?.url : undefined;
          if (!url) return null;
          const style = {
            left: `${layer.x}%`,
            top: `${layer.y}%`,
            width: `${layer.scalePct}%`,
            opacity: visible ? layer.opacity : 0,
          };
          return layer.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote canvas media, no optimisation needed
            <img key={layer.id} src={url} alt="" className="pointer-events-none absolute h-auto" style={style} />
          ) : (
            <video key={layer.id} ref={media(layer.id)} src={url} muted playsInline className="pointer-events-none absolute h-auto" style={style} />
          );
        })}
        {seq.tracks.audio.map((item) => {
          const url = sources[item.ref]?.url;
          return url ? <audio key={item.id} ref={media(item.id)} src={url} preload="auto" /> : null;
        })}
      </div>
    </div>
  );
}
