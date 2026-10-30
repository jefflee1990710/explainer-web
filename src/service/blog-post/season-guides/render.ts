import type { SeasonGuideSpec } from "@/service/blog-post/season-guides/types";

// Turn one seasonal guide into markdown. The related link stays inside the same batch.
export function renderSeasonGuide(
  spec: SeasonGuideSpec,
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
  return `${spec.answer}

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
