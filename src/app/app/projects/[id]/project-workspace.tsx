"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NewProjectForm } from "../new/new-project-form";
import type { PublicCharacter, PublicFolder, PublicSkill } from "@/lib/serialize";
import { VideoList } from "./video-list";

// Split folder workspace: video list on the left, create/stepper form on the right.
export function ProjectWorkspace({
  folder,
  skills,
  characters,
  credits,
  subscribed,
}: {
  folder: PublicFolder;
  skills: PublicSkill[];
  characters: PublicCharacter[];
  credits: number;
  subscribed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const videoParam = searchParams.get("video");
  const selectedVideo = videoParam
    ? folder.videos.find((video) => video.id === videoParam) || null
    : null;
  const selectedId = selectedVideo?.id ?? null;

  function onSelect(id: string) {
    router.replace(`${pathname}?video=${id}`);
  }

  function onCreate() {
    router.replace(pathname);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/app"
            className="text-sm font-semibold text-muted transition hover:text-foreground"
          >
            ← 回到專案
          </Link>
          <h1 className="font-display mt-2 text-3xl font-bold">{folder.name}</h1>
        </div>
        <p className="text-sm text-muted">{folder.videoCount} 支影片</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[17.5rem_minmax(0,1fr)] md:items-start">
        <VideoList
          videos={folder.videos}
          selectedId={selectedId}
          onSelect={onSelect}
          onCreate={onCreate}
        />
        <NewProjectForm
          key={selectedId ?? "new"}
          projectId={folder.id}
          skills={skills}
          characters={characters}
          initialVideo={selectedVideo}
          credits={credits}
          subscribed={subscribed}
        />
      </div>
    </div>
  );
}
