import { readFormData } from "@/service/api/form";
import { fromResult, withApiUser } from "@/service/api/respond";
import {
  deleteVideoAction,
  getVideoAction,
  updateVideoBriefAction,
} from "@/service/project/actions";

type Params = { id: string };

// Full editor payload (PublicVideo). Also the poll target while Phase A runs.
export const GET = withApiUser<Params>(async ({ params }) => {
  return fromResult(await getVideoAction(params.id));
});

// Rewrite the brief and re-run Phase A. Same body as POST /videos.
export const PUT = withApiUser<Params>(async ({ request, params }) => {
  const form = await readFormData(request, { videoId: params.id });
  return fromResult(await updateVideoBriefAction(form));
});

// Delete the video, its jobs, and stored media.
export const DELETE = withApiUser<Params>(async ({ params }) => {
  return fromResult(await deleteVideoAction(params.id));
});
