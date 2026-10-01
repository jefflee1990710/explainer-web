"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { pageVideos, pauseOtherVideos } from "@/presentation/components/project/exclusive-video";
import { PlayIcon } from "@/presentation/components/project/production-icons";

// Bumps when a clip is selected, so the preview can start with sound.
const ClipPlaybackContext = createContext(0);

export function ClipPlaybackProvider({
  token,
  children,
}: {
  token: number;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onPlay(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLVideoElement)) return;
      pauseOtherVideos(target, pageVideos());
    }
    document.addEventListener("play", onPlay, true);
    return () => document.removeEventListener("play", onPlay, true);
  }, []);
  return <ClipPlaybackContext.Provider value={token}>{children}</ClipPlaybackContext.Provider>;
}

// Pause every other <video> on the page, then start with sound.
// If the browser blocks unmuted play, start muted and unmute.
async function playWithSound(video: HTMLVideoElement) {
  pauseOtherVideos(video, pageVideos());
  video.muted = false;
  video.volume = 1;
  try {
    video.currentTime = 0;
  } catch {
    // Metadata may not be ready; play() still starts at the beginning.
  }
  try {
    await video.play();
  } catch {
    video.muted = true;
    await video.play();
    video.muted = false;
  }
}

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
  const autoplayToken = useContext(ClipPlaybackContext);

  useEffect(() => {
    if (autoplayToken === 0) return;
    const video = videoRef.current;
    if (!video) return;
    void playWithSound(video).catch(() => {
      // Native controls can still start playback.
    });
  }, [autoplayToken, src]);

  async function play() {
    const video = videoRef.current;
    if (!video) return;
    try {
      await playWithSound(video);
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
        onPlay={(event) => {
          pauseOtherVideos(event.currentTarget, pageVideos());
          setPlaying(true);
        }}
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
