// Hero player for the lesson clip, pinned above the markdown body.
export function AcademyLessonVideo({ src, title }: { src: string; title: string }) {
  return (
    <figure className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        className="h-auto w-full bg-black"
      >
        {title}
      </video>
    </figure>
  );
}
