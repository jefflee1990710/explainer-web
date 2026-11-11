import { fromResult, withApiUser } from "@/service/api/respond";
import {
  deleteTeleportJob,
  pollTeleportJobStatus,
} from "@/service/teleport/pipeline";

type Params = { id: string };

// GET /api/v1/teleport/[id] — Poll Teleport job status and output video URL.
export const GET = withApiUser<Params>(async ({ params }) => {
  return fromResult(await pollTeleportJobStatus(params.id));
});

// DELETE /api/v1/teleport/[id] — Delete a Teleport job and its stored media.
export const DELETE = withApiUser<Params>(async ({ params }) => {
  return fromResult(await deleteTeleportJob(params.id));
});
