import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import {
  charactersCollection,
  projectsCollection,
  skillsCollection,
  videosCollection,
} from "@/lib/collections";
import { toPublicCharacter, toPublicFolder, toPublicSkill } from "@/lib/serialize";
import { listPublicStyles } from "@/lib/styles/list";
import type { Character } from "@/types/character";
import type { Folder } from "@/types/folder";
import type { Project } from "@/types/project";
import { ProjectWorkspace } from "./project-workspace";

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

  const folders = await projectsCollection();
  const folder = (await folders.findOne({
    _id: new ObjectId(id),
    clerkUserId: user.clerkUserId,
  })) as Folder | null;
  if (!folder?.name) notFound();

  const videos = await videosCollection();
  const videoDocs = (await videos
    .find({ projectId: folder._id })
    .sort({ createdAt: -1 })
    .toArray()) as Project[];
  const publicFolder = toPublicFolder(folder, videoDocs);

  const skillsCol = await skillsCollection();
  const skills = (await skillsCol.find({ isActive: true }).sort({ sortOrder: 1 }).toArray()).map(
    toPublicSkill,
  );

  // Visual styles in catalog order, with generated preview URLs when seeded.
  const styles = await listPublicStyles();

  const charactersCol = await charactersCollection();
  const characters = (
    (await charactersCol
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .toArray()) as Character[]
  ).map(toPublicCharacter);

  const sub = await getActiveSubscription(user.clerkUserId);
  const subscribed = isSubscriptionActive(sub);

  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <ProjectWorkspace
        folder={publicFolder}
        skills={skills}
        styles={styles}
        characters={characters}
        credits={user.credits}
        subscribed={subscribed}
      />
    </Suspense>
  );
}

function WorkspaceFallback() {
  return (
    <div className="space-y-6">
      <div className="h-16 rounded-2xl bg-accent-ink/5" />
      <div className="grid gap-6 md:grid-cols-[17.5rem_minmax(0,1fr)]">
        <div className="h-64 rounded-[1.5rem] bg-accent-ink/5" />
        <div className="h-64 rounded-[1.75rem] bg-accent-ink/5" />
      </div>
    </div>
  );
}
