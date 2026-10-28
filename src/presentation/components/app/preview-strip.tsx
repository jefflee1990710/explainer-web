// 16:9 card that shows stills lined up left to right; when <= 2 stills exist, each cell zooms in (object-cover) to fill the placeholder without side gaps.
export function PreviewStrip({
  urls,
  alt = "",
}: {
  urls: string[];
  alt?: string;
}) {
  if (urls.length === 0) return null;

  const fillPlaceholder = urls.length <= 2;

  return (
    <span className="flex h-full w-full justify-center overflow-hidden bg-accent-ink/5 transition-transform duration-300 group-hover:scale-[1.03]">
      {urls.map((url, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${url}-${index}`}
          src={url}
          alt={index === 0 ? alt : ""}
          loading="lazy"
          className={
            fillPlaceholder
              ? "h-full min-w-0 flex-1 object-cover object-top"
              : "h-full w-auto max-w-none object-contain"
          }
        />
      ))}
    </span>
  );
}
