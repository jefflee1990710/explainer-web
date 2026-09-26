"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { PlayIcon } from "@/presentation/components/project/production-icons";

// Completed clip video. A large play button sits on the first frame so a
// paused 9:16 still does not look like a stuck generation.
export function ClipVideoPlayer({
  src,
  dimmed = false,
}: {
  src: string;
  dimmed?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  async function play() {
    const video = videoRef.current;
    if (!video) return;
    // Preview starts muted so the first tap is not blocked by autoplay rules.
    video.muted = true;
    try {
      await video.play();
    } catch {
      // A second tap or native controls can still start playback.
    }
  }

  return (
    <>
      <motion.video
        ref={videoRef}
        key={src}
        initial={{ opacity: 0 }}
        animate={{ opacity: dimmed ? 0.6 : 1 }}
        src={src}
        controls
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="absolute inset-0 h-full w-full bg-black"
      />
      {playing ? null : (
        <button
          type="button"
          onClick={play}
          aria-label="播放這段影片"
          className="absolute inset-0 z-10 grid cursor-pointer place-items-center bg-black/20"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-[var(--studio-ink)] shadow-md">
            <PlayIcon className="ml-0.5 h-7 w-7" />
          </span>
        </button>
      )}
    </>
  );
}
