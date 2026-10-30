import type { HalloweenGuideSpec } from "@/service/blog-post/halloween-guides/types";

// Turn one Halloween guide into markdown. A figure sits on its own line so the post page shows it.
export function renderHalloweenGuide(
  spec: HalloweenGuideSpec,
  related: { slug: string; title: string },
  figureUrls: Record<string, string> = {},
): string {
  const points = spec.points.map((point) => `## ${point.h}\n\n${point.p}`).join("\n\n");
  const checks = spec.checks.map((line) => `- ${line}`).join("\n");
  const figure = spec.figure
    ? `\n\n![${spec.figure.alt}](${figureUrls[spec.figure.key] ?? "https://example.com/pending.webp"})`
    : "";
  return `${spec.answer}${figure}

${points}

## 一個例子

${spec.example}

## 上載前對一次

${checks}

## Scro 點配合

${spec.bridge}

[${spec.cta}](${spec.landingPath}). 成品樣本喺 [例子頁](/examples?hl=zh-Hant)。

下一篇: [${related.title}](/posts/${related.slug}).
`;
}
