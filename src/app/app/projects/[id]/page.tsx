import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { projectsCollection } from "@/lib/collections";
import { toPublicProject } from "@/lib/serialize";
import { ClipPlayer } from "./clip-player";
import { GenerationProgress } from "./generation-progress";
import { StoryboardReview } from "./storyboard-review";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  if (!ObjectId.isValid(id)) notFound();

  const projects = await projectsCollection();
  const project = await projects.findOne({
    _id: new ObjectId(id),
    clerkUserId: user.clerkUserId,
  });
  if (!project) notFound();

  const sub = await getActiveSubscription(user.clerkUserId);
  const canGenerate =
    isSubscriptionActive(sub) && user.credits >= (project.creditCost || 0);
  const publicProject = toPublicProject(project);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">{project.skillSlug}</p>
        <h1 className="mt-1 text-3xl font-semibold">
          {project.phaseA?.localizedTitle || "導演提案"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {project.aspectRatio} · {project.durationPreset} · 狀態 {project.status}
        </p>
      </div>
      {project.status === "phase_a" ? (
        <p className="text-sm text-muted">導演正在撰寫分鏡…</p>
      ) : null}
      <StoryboardReview project={publicProject} canGenerate={canGenerate} />
      <GenerationProgress project={publicProject} />
      {project.status === "ready" ? <ClipPlayer project={publicProject} /> : null}
    </div>
  );
}
