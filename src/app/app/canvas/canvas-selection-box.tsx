// Marquee shown while a modifier drag is selecting canvas nodes.

export function CanvasSelectionBox({
  box,
}: {
  box: { left: number; top: number; width: number; height: number };
}) {
  return (
    <div
      data-canvas-selection-box
      aria-hidden
      className="pointer-events-none absolute z-10 border border-[#c6f24b] bg-[#c6f24b]/15"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    />
  );
}
