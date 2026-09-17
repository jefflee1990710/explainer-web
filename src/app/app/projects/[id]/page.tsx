import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { projectsCollection, skillsCollection } from "@/lib/collections";
import { toPublicProject } from "@/lib/serialize";
import { ClipPlayer } from "./clip-player";
import { FramesStep } from "./frames-step";
import { GenerationProgress } from "./generation-progress";
import { ProjectHeader } from "./project-header";
import { StoryboardReview } from "./storyboard-review";

// Revise / approve actions here also run background jobs via after().
export const maxDuration = 120;

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

  const skills = await skillsCollection();
  const skill = await skills.findOne({ _id: project.skillId });

  const sub = await getActiveSubscription(user.clerkUserId);
  const subscribed = isSubscriptionActive(sub);
  // Storyboard approval charges 2 frames per clip.
  const framesCost = (project.phaseA?.clipCount || 0) * 2;
  const canGenerate = subscribed && user.credits >= framesCost;
  const publicProject = toPublicProject(project);

  return (
    <div className="space-y-6">
      <ProjectHeader project={publicProject} skillTitle={skill?.titleZh || "解說風格"} />
      <StoryboardReview project={publicProject} canGenerate={canGenerate} />
      <FramesStep
        project={publicProject}
        credits={user.credits}
        subscribed={subscribed}
      />
      <GenerationProgress project={publicProject} />
      {project.status === "ready" ? <ClipPlayer project={publicProject} /> : null}
    </div>
  );
}
