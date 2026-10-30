import { CANTONESE_EXTRA } from "@/service/blog-post/image-tips/cantonese-extra";
import type { ImageTipSpec } from "@/service/blog-post/image-tips/types";

// Turn one tip into markdown. A figure is its own block so the post renderer shows it.
export function renderImageTip(
  spec: ImageTipSpec,
  related: { slug: string; title: string },
  figureUrls: Record<string, string> = {},
): string {
  const cantonese = spec.locale === "zh-Hant";
  const examples = cantonese ? "/examples?hl=zh-Hant" : "/examples";
  const points = spec.points.map((point) => `## ${point.h}\n\n${point.p}`).join("\n\n");
  const checks = spec.checks.map((line) => `- ${line}`).join("\n");
  const exampleHeading = cantonese ? "一個例子" : "A worked example";
  const checkHeading = cantonese ? "定格先對一次" : "Check the still";
  const bridgeHeading = cantonese ? "Scro 點配合" : "Where Scro fits";
  const samples = cantonese
    ? `成品樣本喺 [例子頁](${examples})。`
    : `Finished samples are on the [examples page](${examples}).`;
  const relatedLabel = cantonese ? "下一篇" : "Related";
  const figure = spec.figure
    ? `\n\n![${spec.figure.alt}](${figureUrls[spec.figure.key] ?? "https://example.com/pending.webp"})`
    : "";
  const extra = CANTONESE_EXTRA[spec.id];
  const extraBlock = extra ? `\n\n${extra}` : "";
  return `${spec.answer}${figure}${extraBlock}

${points}

## ${exampleHeading}

${spec.example}

## ${checkHeading}

${checks}

## ${bridgeHeading}

${spec.bridge}

[${spec.cta}](${spec.landingPath}). ${samples}

${relatedLabel}: [${related.title}](/posts/${related.slug}).
`;
}
