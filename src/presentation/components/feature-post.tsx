export type FeaturePostProps = {
  eyebrow: string;
  title: string;
  lede: string;
  paragraphs: string[];
  imageSrc: string;
  imageAlt: string;
  igSrc: string;
  igLabel: string;
};

// One editorial post on a feature page, using the same studio card as the example gallery.
export function FeaturePost({
  eyebrow,
  title,
  lede,
  paragraphs,
  imageSrc,
  imageAlt,
  igSrc,
  igLabel,
}: FeaturePostProps) {
  return (
    <section id="post" className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-3xl">
        <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
          {eyebrow}
        </p>
        <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-base leading-7 text-[#5c6170]">{lede}</p>
        <article className="mt-10 overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white">
          <img src={imageSrc} alt={imageAlt} className="aspect-video w-full border-b border-[#e4e4e7] bg-[#12141c] object-cover" />
          <div className="space-y-5 p-6 sm:p-8">
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-base leading-7 text-[#3a3f4b]">
                {paragraph}
              </p>
            ))}
          </div>
        </article>
        <figure className="mx-auto mt-8 max-w-sm overflow-hidden rounded-2xl border border-[#e4e4e7] bg-[#0a0c10]">
          <img src={igSrc} alt={imageAlt} className="aspect-[4/5] w-full object-cover" />
          <figcaption className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {igLabel}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
