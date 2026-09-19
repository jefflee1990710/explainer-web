"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const videoParam = searchParams.get("video");
  // Client-owned selection so the right pane can flip before any RSC navigation.
  const [activeVideoId, setActiveVideoId] = useState<string | null>(videoParam);
  const [freshById, setFreshById] = useState<Record<string, PublicVideo>>({});
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [optimisticVideo, setOptimisticVideo] = useState<PublicVideo | null>(null);

  // Keep in sync when navigation comes from router (e.g. after createVideo).
  useEffect(() => {
    setActiveVideoId(videoParam);
  }, [videoParam]);

  const replaceVideoQuery = useCallback(
    (id: string | null) => {
      const url = id ? `${pathname}?video=${encodeURIComponent(id)}` : pathname;
      window.history.replaceState(window.history.state, "", url);
    },
    [pathname],
  );

  // Pull the latest row after every switch; list snapshot renders immediately.
  useEffect(() => {
    if (!activeVideoId) return;
    let cancelled = false;
    setFetchingId(activeVideoId);
    void getProjectAction(activeVideoId).then((result) => {
      if (cancelled) return;
      setFetchingId((current) => (current === activeVideoId ? null : current));
      if (result.ok) {
        setFreshById((prev) => ({ ...prev, [activeVideoId]: result.project }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeVideoId]);

  const selectedVideo = useMemo(() => {
    if (!activeVideoId) return null;
    return (
      freshById[activeVideoId] ??
      folder.videos.find((video) => video.id === activeVideoId) ??
      (optimisticVideo?.id === activeVideoId ? optimisticVideo : null)
    );
  }, [activeVideoId, freshById, folder.videos, optimisticVideo]);

  const videoLoading = Boolean(activeVideoId && !selectedVideo);
  const videoSyncing = Boolean(activeVideoId && fetchingId === activeVideoId && selectedVideo);

  const videos = useMemo(() => {
    if (!selectedVideo || folder.videos.some((video) => video.id === selectedVideo.id)) {
      return folder.videos;
    }
    return [selectedVideo, ...folder.videos];
  }, [folder.videos, selectedVideo]);

  function onSelect(id: string) {
    setActiveVideoId(id);
    replaceVideoQuery(id);
  }

  function onCreate() {
    setActiveVideoId(null);
    replaceVideoQuery(null);
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
          selectedId={activeVideoId}
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
          <div className="relative min-w-0">
            {videoSyncing ? (
              <p className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-accent-ink/10 bg-paper/95 px-2.5 py-1 text-[11px] font-semibold text-muted shadow-sm">
                <Spinner className="h-3.5 w-3.5" />
                同步中
              </p>
            ) : null}
            <NewProjectForm
              key={activeVideoId ?? "new"}
              projectId={folder.id}
              skills={skills}
              styles={styles}
              characters={characters}
              initialVideo={selectedVideo}
              credits={credits}
              subscribed={subscribed}
              onVideoCreated={setOptimisticVideo}
            />
          </div>
        )}
      </div>
    </div>
  );
}
