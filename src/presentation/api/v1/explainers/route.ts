import { readFormData } from "@/service/api/form";
import { fromResult, withApiUser } from "@/service/api/respond";
import { createVideoAction } from "@/service/project/actions";

// POST /api/v1/explainers — Create an Explainer video project (defaults to cartoon-explainer-video-director + doodle).
export const POST = withApiUser(async ({ request }) => {
  const form = await readFormData(request);
  if (!form.get("skillSlug")) {
    form.set("skillSlug", "cartoon-explainer-video-director");
  }
  if (!form.get("styleId")) {
    form.set("styleId", "doodle");
  }
  return fromResult(await createVideoAction(form), 201);
});
