import type { PublicStyle } from "@/presentation/serialize";

// One cell in the style dropdown grid: preview still, then name and blurb.
export function StylePickerOption({
  style,
  name,
  active,
  onPick,
}: {
  style: PublicStyle;
  name: string;
  active: boolean;
  onPick: (id: PublicStyle["id"]) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onPick(style.id)}
      className={`flex w-full cursor-pointer flex-col overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active
          ? "border-accent-ink bg-accent-ink text-paper"
          : "border-accent-ink/10 hover:border-accent-ink/25 hover:bg-accent-ink/5"
      }`}
    >
      <span
        className="relative aspect-video w-full overflow-hidden"
        style={{ backgroundColor: style.canvasColor }}
      >
        {style.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={style.previewUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center px-1 text-center font-display text-[9px] font-bold leading-tight text-accent-ink/60">
            {name}
          </span>
        )}
      </span>
      <span className="min-w-0 px-1.5 py-1.5">
        <span className="block truncate text-[11px] font-semibold leading-4">{name}</span>
        {style.description ? (
          <span className={`mt-0.5 line-clamp-2 text-[10px] leading-3 ${active ? "text-paper/75" : "text-muted"}`}>
            {style.description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
