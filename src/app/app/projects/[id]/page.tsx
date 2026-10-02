import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { charactersCollection, projectsCollection, videosCollection } from "@/dao";
import { listSelectableSkills } from "@/service/director/selectable-skills";
import { toPublicCharacter, toPublicFolder, toPublicSkill, VIDEO_LIST_PROJECTION } from "@/presentation/serialize";
import { listPublicStyles } from "@/service/style/list";
import type { Character } from "@/model/character";
import type { Folder } from "@/model/folder";
import type { Project } from "@/model/project";
import { ProjectWorkspace } from "@/presentation/components/app/projects/[id]/project-workspace";

// Revise / approve / export actions run background jobs via after(); export renders with ffmpeg.
export const maxDuration = 300;

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
  const charactersCol = await charactersCollection();

  const [videoDocs, skillDocs, styles, characterDocs, sub] = await Promise.all([
    videos
      .find({ projectId: folder._id }, { projection: VIDEO_LIST_PROJECTION })
      .sort({ createdAt: -1 })
      .toArray() as Promise<Project[]>,
    listSelectableSkills(user.clerkUserId),
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
        creditLimit={user.creditLimit || 0}
        subscribed={subscribed}
      />
    </Suspense>
  );
}

function WorkspaceFallback() {
  return (
    <div className="space-y-6">
      <div className="h-16 rounded-2xl bg-accent-ink/5" />
      <div className="h-80 rounded-[1.5rem] bg-accent-ink/5" />
    </div>
  );
}
