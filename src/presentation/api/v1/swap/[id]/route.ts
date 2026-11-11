import { fromResult, withApiUser } from "@/service/api/respond";
import { deleteJutsuJob, pollJutsuJobStatus } from "@/service/jutsu/pipeline";

type Params = { id: string };

// GET /api/v1/swap/[id] — Poll Scro Swap job status and output URLs.
export const GET = withApiUser<Params>(async ({ params }) => {
  return fromResult(await pollJutsuJobStatus(params.id));
});

// DELETE /api/v1/swap/[id] — Delete a Scro Swap job and its stored media.
export const DELETE = withApiUser<Params>(async ({ params }) => {
  return fromResult(await deleteJutsuJob(params.id));
});
