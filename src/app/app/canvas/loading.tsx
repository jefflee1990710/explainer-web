export default function CanvasLoading() {
  return (
    <div className="flex h-full min-h-[70vh] w-full flex-col bg-[#0b0e13]">
      <div className="h-13 shrink-0 animate-pulse border-b border-white/8 bg-[#0e121a]" />
      <div className="flex min-h-0 flex-1">
        <div className="w-[276px] shrink-0 animate-pulse border-r border-white/8 bg-[#0e121a]/80" />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-32 w-64 animate-pulse rounded-2xl border border-white/8 bg-[#12161f]" />
        </div>
      </div>
    </div>
  );
}
