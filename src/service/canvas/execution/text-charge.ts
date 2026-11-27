// Settles a finished text-model run: charge the measured tokens, then store the text.

import type { CanvasJob } from "@/model/canvas";
import { canvasTextUserRates, textTokenCostUsd } from "@/service/canvas/catalog/text-token-price";
import type { CanvasTextResult } from "@/service/canvas/execution/canvas-text";
import { completedResult } from "@/service/canvas/execution/providers/shared";
import type { CanvasDispatchContext } from "@/service/canvas/execution/providers/types";
import type { SubmitCanvasNodeJobResult } from "@/service/canvas/execution/jobs/deps";

// Charges input and output tokens, then marks the job completed with that amount.
export async function completeCanvasTextJob(
  ctx: CanvasDispatchContext,
  result: CanvasTextResult,
): Promise<SubmitCanvasNodeJobResult> {
  const rates = canvasTextUserRates(ctx.spec.id);
  const costUsd = textTokenCostUsd(rates, result.usage);
  let spendEventKey: string | undefined;
  if (costUsd > 0) {
    spendEventKey = await ctx.resolved.consumeCreditUsd(ctx.clerkUserId, costUsd);
  }
  const charged: CanvasJob = {
    ...ctx.initialJob,
    chargedUsd: costUsd,
    ...(spendEventKey ? { spendEventKey } : {}),
  };
  // Persist the charge before the text upload so a later failure refunds this amount.
  await ctx.resolved.updateCanvasJob(ctx.initialJob._id, ctx.clerkUserId, {
    $set: {
      chargedUsd: costUsd,
      ...(spendEventKey ? { spendEventKey } : {}),
    },
  });
  const outputUrl = await ctx.resolved.persistText(
    result.text,
    `canvas/${ctx.clerkUserId}/${ctx.jobIdHex}.txt`,
  );
  return completedResult(
    { ...ctx, initialJob: charged },
    {
      outputUrl,
      outputKind: "text",
      extraNodePatch: { text: result.text },
    },
  );
}
