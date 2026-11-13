// Muted loop of the sample clip for one creation tool. The poster covers the gap before playback.
export function HomeToolPreview({
  videoUrl,
  posterUrl,
  title,
}: {
  videoUrl: string;
  posterUrl: string;
  title: string;
}) {
  return (
    <video
      src={videoUrl}
      poster={posterUrl}
      aria-label={title}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
    />
  );
}
