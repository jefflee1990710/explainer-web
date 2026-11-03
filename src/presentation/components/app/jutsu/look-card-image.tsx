// Standing figures are 9:16. A square cover crop cuts off the head or the shoes.
export function LookCardImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="aspect-[9/16] w-full overflow-hidden rounded-lg bg-zinc-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </div>
  );
}
