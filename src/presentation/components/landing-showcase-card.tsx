"use client";

import { useEffect, useRef, useState } from "react";

type ShowcaseCardProps = {
  src: string;
  poster: string;
  widthClass: string;
  aspectClass: string;
};

// Soft-edged clip. The poster stays if the file is missing.
export function LandingShowcaseCard({
  src,
  poster,
  widthClass,
  aspectClass,
}: ShowcaseCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [play, setPlay] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const hide = () => setPlay(false);
    video.addEventListener("error", hide);
    if (video.error) hide();
    return () => video.removeEventListener("error", hide);
  }, []);

  // Fade only the outer rim so the frame stays readable.
  const edge =
    "[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent),linear-gradient(to_bottom,transparent,black_7%,black_93%,transparent)] [mask-composite:intersect] [-webkit-mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent),linear-gradient(to_bottom,transparent,black_7%,black_93%,transparent)] [-webkit-mask-composite:source-in]";

  return (
    <article className={`relative shrink-0 ${widthClass}`}>
      <img
        src={poster}
        alt=""
        className={`absolute inset-0 h-full w-full scale-105 object-cover opacity-50 blur-2xl ${aspectClass}`}
      />
      <div className={`relative ${aspectClass} ${edge}`}>
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {play ? (
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            onError={() => setPlay(false)}
          />
        ) : null}
      </div>
    </article>
  );
}
