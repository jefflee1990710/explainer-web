import { EXAMPLE_ITEMS, exampleVideoJsonLd } from "@/presentation/components/example-catalog";
import { getSiteUrl } from "@/util/app-url";
import { createTranslate, getMessages, type LocaleId } from "@/util/i18n";

// Crawlable video markup for /examples. The player itself is in the gallery.
export function ExamplesJsonLd({ locale }: { locale: LocaleId }) {
  const t = createTranslate(getMessages(locale));
  const data = exampleVideoJsonLd(
    getSiteUrl(),
    EXAMPLE_ITEMS.map((item) => ({
      ...item,
      name: t(item.titleKey),
      description: t(item.bodyKey),
    })),
  );
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
