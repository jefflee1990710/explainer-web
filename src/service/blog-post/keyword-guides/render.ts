import type { KeywordGuideSpec } from "@/service/blog-post/keyword-guides/types";
import { CANTONESE_EXTRA } from "@/service/blog-post/keyword-guides/cantonese-extra";

// Turn one spec into the markdown post. Related is another guide in this batch.
export function renderKeywordGuide(
  spec: KeywordGuideSpec,
  related: { slug: string; title: string },
): string {
  const cantonese = spec.locale === "zh-Hant";
  const examples = cantonese ? "/examples?hl=zh-Hant" : "/examples";
  const points = spec.points.map((point) => `## ${point.h}\n\n${point.p}`).join("\n\n");
  const checks = spec.checks.map((line) => `- ${line}`).join("\n");
  const exampleHeading = cantonese ? "一個例子" : "A worked example";
  const checkHeading = cantonese ? "上載前對一次" : "Before you post";
  const bridgeHeading = cantonese ? "Scro 點配合" : "Where Scro fits";
  const samples = cantonese
    ? `成品樣本喺 [例子頁](${examples})。`
    : `Finished samples are on the [examples page](${examples}).`;
  const relatedLabel = cantonese ? "下一篇" : "Related";
  const extra = CANTONESE_EXTRA[spec.id];
  const extraBlock = extra ? `\n\n## 點樣先算做完\n\n${extra}` : "";
  return `${spec.answer}${extraBlock}

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
