import { renderVisualPlaybook } from "@/service/blog-post/visual-playbooks/render";
import { SPECS_A } from "@/service/blog-post/visual-playbooks/specs-a";
import { SPECS_B } from "@/service/blog-post/visual-playbooks/specs-b";
import { SPECS_C } from "@/service/blog-post/visual-playbooks/specs-c";
import { SPECS_D } from "@/service/blog-post/visual-playbooks/specs-d";
import type { VisualPlaybookSpec } from "@/service/blog-post/visual-playbooks/types";

export type { VisualExampleItem, VisualPlaybookSpec } from "@/service/blog-post/visual-playbooks/types";

// Forty 5-example visual showcase & explainer monetization articles.
// Each article has 1 hero still + 5 inline example stills generated via Seedream 5.0 Pro.
export const VISUAL_PLAYBOOK_SPECS: VisualPlaybookSpec[] = [
  ...SPECS_A,
  ...SPECS_B,
  ...SPECS_C,
  ...SPECS_D,
];

export function renderVisualPlaybookSpec(
  spec: VisualPlaybookSpec,
  imageUrls: Record<string, string> = {},
): string {
  const index = VISUAL_PLAYBOOK_SPECS.findIndex((item) => item.id === spec.id);
  const related = VISUAL_PLAYBOOK_SPECS[(index + 1) % VISUAL_PLAYBOOK_SPECS.length];
  return renderVisualPlaybook(spec, { slug: related.slug, title: related.title }, imageUrls);
}
