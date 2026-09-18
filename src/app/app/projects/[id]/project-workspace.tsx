"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getProjectAction } from "@/lib/actions/projects";
import { Spinner } from "@/components/spinner";
import type {
  PublicCharacter,
  PublicFolder,
  PublicSkill,
  PublicStyle,
  PublicVideo,
} from "@/lib/serialize";
import { NewProjectForm } from "../new/new-project-form";
import { VideoList } from "./video-list";

// Split folder workspace: video list on the left, create/stepper form on the right.
export function ProjectWorkspace({
  folder,
  skills,
  styles,
  characters,
  credits,
  subscribed,
}: {
  folder: PublicFolder;
  skills: PublicSkill[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  credits: number;
  subscribed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const videoParam = searchParams.get("video");
  const listedVideo = videoParam
    ? folder.videos.find((video) => video.id === videoParam) ?? null
    : null;
  const [loadedVideo, setLoadedVideo] = useState<{
    param: string;
    video: PublicVideo;
  } | null>(null);
  const [optimisticVideo, setOptimisticVideo] = useState<PublicVideo | null>(null);

  // After create, ?video= may point at a row not yet in the SSR folder list.
  useEffect(() => {
    if (!videoParam || listedVideo) return;
    let cancelled = false;
    void getProjectAction(videoParam).then((result) => {
      if (cancelled || !result.ok) return;
      setLoadedVideo({ param: videoParam, video: result.project });
    });
    return () => {
      cancelled = true;
    };
  }, [videoParam, listedVideo]);

  const selectedVideo =
    listedVideo ??
    (optimisticVideo?.id === videoParam ? optimisticVideo : null) ??
    (loadedVideo?.param === videoParam ? loadedVideo.video : null);
  const videoLoading = Boolean(videoParam && !selectedVideo);
  const videos = useMemo(() => {
    if (!selectedVideo || folder.videos.some((video) => video.id === selectedVideo.id)) {
      return folder.videos;
    }
    return [selectedVideo, ...folder.videos];
  }, [folder.videos, selectedVideo]);

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
          videos={videos}
          selectedId={videoParam}
          onSelect={onSelect}
          onCreate={onCreate}
        />
        {videoLoading ? (
          <div className="grid min-h-[16rem] place-items-center rounded-[1.75rem] border border-accent-ink/10 bg-paper/85 p-6">
            <p className="inline-flex items-center gap-2 text-sm text-muted">
              <Spinner />
              載入影片中…
            </p>
          </div>
        ) : (
          <NewProjectForm
            key={videoParam ?? "new"}
            projectId={folder.id}
            skills={skills}
            styles={styles}
            characters={characters}
            initialVideo={selectedVideo}
            credits={credits}
            subscribed={subscribed}
            onVideoCreated={setOptimisticVideo}
          />
        )}
      </div>
    </div>
  );
}
