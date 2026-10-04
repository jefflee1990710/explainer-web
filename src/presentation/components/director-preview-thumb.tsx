// Card / picker still for a director. Falls back to the name when no image yet.
export function DirectorPreviewThumb({
  previewUrl,
  label,
  size = "md",
}: {
  previewUrl?: string;
  label: string;
  size?: "md" | "sm" | "cover" | "card";
}) {
  const box =
    size === "cover"
      ? "w-full"
      : size === "card"
        ? "aspect-[3/1] w-full"
        : size === "sm"
          ? "h-14 w-[5.5rem]"
          : "h-16 w-28";
  return (
    <span
      className={`${box} relative block shrink-0 overflow-hidden bg-accent-ink/[0.04] ${
        size === "cover" || size === "card" ? "" : "rounded-md border border-accent-ink/10"
      }`}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className={
            size === "cover"
              ? "block h-auto w-full"
              : size === "card"
                ? "h-full w-full object-cover"
                : "h-full w-full object-contain"
          }
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center px-1 text-center font-display text-[9px] font-bold leading-tight text-accent-ink/60">
          {label}
        </span>
      )}
    </span>
  );
}
