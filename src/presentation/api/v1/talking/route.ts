import { readFormData } from "@/service/api/form";
import { fromResult, withApiUser } from "@/service/api/respond";
import { createVideoAction } from "@/service/project/actions";

// POST /api/v1/talking — Create a Talking-Head lip-sync video project (defaults to talking-head-director + realistic).
export const POST = withApiUser(async ({ request }) => {
  const form = await readFormData(request);
  if (!form.get("skillSlug")) {
    form.set("skillSlug", "talking-head-director");
  }
  if (!form.get("styleId")) {
    form.set("styleId", "realistic");
  }
  if (!form.get("source") && form.get("spokenScript")) {
    form.set("source", String(form.get("spokenScript")));
  }
  return fromResult(await createVideoAction(form), 201);
});
