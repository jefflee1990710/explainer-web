// 16:9 card that shows 9:16 stills in full, lined up left to right.
export function PreviewStrip({
  urls,
  alt = "",
}: {
  urls: string[];
  alt?: string;
}) {
  if (urls.length === 0) return null;

  return (
    <span className="flex h-full w-full justify-center overflow-hidden bg-accent-ink/5 transition-transform duration-300 group-hover:scale-[1.03]">
      {urls.map((url, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${url}-${index}`}
          src={url}
          alt={index === 0 ? alt : ""}
          loading="lazy"
          className="h-full w-auto max-w-none object-contain"
        />
      ))}
    </span>
  );
}
