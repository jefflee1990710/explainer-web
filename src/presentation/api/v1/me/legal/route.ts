import { acceptCurrentPolicies } from "@/presentation/actions/legal";
import { fromResult, readJson, withApiUser } from "@/service/api/respond";

// Accept the current Terms + Privacy versions from the app's first-login dialog.
export const POST = withApiUser(async ({ request }) => {
  const body = await readJson<{ terms?: boolean; privacy?: boolean }>(request);
  return fromResult(
    await acceptCurrentPolicies({ terms: Boolean(body.terms), privacy: Boolean(body.privacy) }),
  );
});
