import { readFormData } from "@/service/api/form";
import { fromResult, withApiUser } from "@/service/api/respond";
import { createVideoAction } from "@/service/project/actions";

// POST /api/v1/stories — Create a Story short-film video project (defaults to story-short-director + realistic).
export const POST = withApiUser(async ({ request }) => {
  const form = await readFormData(request);
  if (!form.get("skillSlug")) {
    form.set("skillSlug", "story-short-director");
  }
  if (!form.get("styleId")) {
    form.set("styleId", "realistic");
  }
  return fromResult(await createVideoAction(form), 201);
});
