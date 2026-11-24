"use client";

// Shown over a selected sidebar tile. The first click only selects; this button adds it.
export function CanvasAddButton({
  label,
  dense = false,
  onAdd,
}: {
  label: string;
  dense?: boolean;
  onAdd: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onAdd();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        onAdd();
      }}
      className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/50"
    >
      <span
        className={`max-w-[92%] rounded-full bg-[#c6f24b] text-center font-bold text-[#11141b] shadow-[0_8px_24px_rgba(0,0,0,0.45)] ${
          dense ? "px-1.5 py-1 text-[9px] leading-tight" : "px-2.5 py-1.5 text-[11px] leading-tight"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
