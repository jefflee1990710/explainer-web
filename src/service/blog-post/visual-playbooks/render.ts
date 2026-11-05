import type { VisualPlaybookSpec } from "@/service/blog-post/visual-playbooks/types";

// Render one 5-example visual playbook into Markdown with an inline <figure> block per example.
export function renderVisualPlaybook(
  spec: VisualPlaybookSpec,
  related: { slug: string; title: string },
  imageUrls: Record<string, string> = {},
): string {
  const cantonese = spec.locale === "zh-Hant";
  const examplesPage = cantonese ? "/examples?hl=zh-Hant" : "/examples";
  const sections = spec.examples
    .map((item) => {
      const url = imageUrls[`${spec.slug}::${item.key}`] ?? "https://example.com/pending.webp";
      return `## ${item.h}\n\n![${item.alt}](${url})\n\n${item.p}`;
    })
    .join("\n\n");
  const checks = spec.checks.map((line) => `- ${line}`).join("\n");
  const exampleHeading = cantonese ? "實戰應用案例" : "A worked production example";
  const checkHeading = cantonese ? "生成動態前檢查清單" : "Before you generate motion";
  const bridgeHeading = cantonese ? "Scro 點樣配合" : "Where Scro fits";
  const samples = cantonese
    ? `更多成品樣本喺 [例子頁](${examplesPage})。`
    : `Finished samples are on the [examples page](${examplesPage}).`;
  const relatedLabel = cantonese ? "下一篇" : "Related";

  return `${spec.answer}

${sections}

## ${exampleHeading}

${spec.workedExample}

## ${checkHeading}

${checks}

## ${bridgeHeading}

${spec.bridge}

[${spec.cta}](${spec.landingPath}). ${samples}

${relatedLabel}: [${related.title}](/posts/${related.slug}).
`;
}
