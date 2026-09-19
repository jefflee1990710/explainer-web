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
import { VIDEO_RAIL_COLS } from "./video-rail";
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
  const skillsCol = await skillsCollection();
  const charactersCol = await charactersCollection();

  const [videoDocs, skillDocs, styles, characterDocs, sub] = await Promise.all([
    videos.find({ projectId: folder._id }).sort({ createdAt: -1 }).toArray() as Promise<Project[]>,
    skillsCol.find({ isActive: true }).sort({ sortOrder: 1 }).toArray(),
    listPublicStyles(),
    charactersCol
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .toArray() as Promise<Character[]>,
    getActiveSubscription(user.clerkUserId),
  ]);

  const publicFolder = toPublicFolder(folder, videoDocs);
  const skills = skillDocs.map(toPublicSkill);
  const characters = characterDocs.map(toPublicCharacter);
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
      <div className={`grid gap-6 ${VIDEO_RAIL_COLS}`}>
        <div className="h-64 rounded-[1.5rem] bg-accent-ink/5" />
        <div className="h-64 rounded-[1.75rem] bg-accent-ink/5" />
      </div>
    </div>
  );
}
