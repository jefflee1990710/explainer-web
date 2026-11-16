// Solid cardstock chip shown when a director preset is a colour, not a photo.
export function DirectorBackgroundSwatch({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        backgroundColor: color,
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.2), transparent 46%), repeating-linear-gradient(135deg, rgba(18,20,28,0.07) 0 1px, transparent 1px 8px)",
      }}
    />
  );
}
