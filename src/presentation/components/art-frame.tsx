type ArtFrameProps = {
  src: string;
  alt?: string;
  /** Frame shape + sizing, e.g. "aspect-[4/3] w-full rounded-2xl". */
  className?: string;
  /** Extra classes for the sharp image (e.g. object position). */
  imgClassName?: string;
};

// Fixed-ratio frame that never crops or stretches: the art is contained, and a blurred copy fills the bands.
export function ArtFrame({ src, alt = "", className = "", imgClassName = "" }: ArtFrameProps) {
  return (
    <div className={`relative isolate overflow-hidden bg-[#12141c] ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-70 blur-2xl"
      />
      <img src={src} alt={alt} className={`h-full w-full object-contain ${imgClassName}`} />
    </div>
  );
}
