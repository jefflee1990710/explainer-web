"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getProjectAction } from "@/presentation/actions/projects";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicFolder,
  PublicSkill,
  PublicStyle,
  PublicVideo,
} from "@/presentation/serialize";
import { NewProjectForm } from "@/presentation/components/app/projects/new/new-project-form";
import { DeleteVideoDialog } from "@/presentation/components/app/projects/[id]/delete-video-dialog";
import { VIDEO_RAIL_COLS } from "@/presentation/components/app/projects/[id]/video-rail";
import { VideoList } from "@/presentation/components/app/projects/[id]/video-list";

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
  // Client-owned selection so the right pane can flip before any RSC navigation.
  const [activeVideoId, setActiveVideoId] = useState<string | null>(videoParam);
  const [freshById, setFreshById] = useState<Record<string, PublicVideo>>({});
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [optimisticVideo, setOptimisticVideo] = useState<PublicVideo | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);

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
    if (!activeVideoId || hiddenIds.has(activeVideoId)) return null;
    return (
      freshById[activeVideoId] ??
      folder.videos.find((video) => video.id === activeVideoId) ??
      (optimisticVideo?.id === activeVideoId ? optimisticVideo : null)
    );
  }, [activeVideoId, freshById, folder.videos, optimisticVideo, hiddenIds]);

  const videoLoading = Boolean(
    activeVideoId && !selectedVideo && !hiddenIds.has(activeVideoId),
  );
  const videoSyncing = Boolean(activeVideoId && fetchingId === activeVideoId && selectedVideo);

  const videos = useMemo(() => {
    const list =
      !selectedVideo || folder.videos.some((video) => video.id === selectedVideo.id)
        ? folder.videos
        : [selectedVideo, ...folder.videos];
    return list.filter((video) => !hiddenIds.has(video.id));
  }, [folder.videos, selectedVideo, hiddenIds]);

  function onSelect(id: string) {
    setActiveVideoId(id);
    replaceVideoQuery(id);
  }

  function onCreate() {
    setActiveVideoId(null);
    replaceVideoQuery(null);
  }

  function onVideoDeleted(id: string) {
    setHiddenIds((prev) => new Set(prev).add(id));
    setFreshById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (optimisticVideo?.id === id) setOptimisticVideo(null);
    setDeleteOpen(false);
    onCreate();
    router.refresh();
  }

  return (
    <>
      {deleteOpen && selectedVideo ? (
        <DeleteVideoDialog
          video={selectedVideo}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => onVideoDeleted(selectedVideo.id)}
        />
      ) : null}
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
          <p className="text-sm text-muted">{videos.length} 支影片</p>
        </header>

        <div className={`grid gap-6 md:items-start ${VIDEO_RAIL_COLS}`}>
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
            <div className="relative min-w-0 space-y-3">
              {selectedVideo ? (
                <div className="flex items-center justify-end gap-2">
                  {videoSyncing ? (
                    <p className="inline-flex items-center gap-1.5 rounded-full border border-accent-ink/10 bg-paper/95 px-2.5 py-1 text-[11px] font-semibold text-muted">
                      <Spinner className="h-3.5 w-3.5" />
                      同步中
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-accent/30 px-4 text-sm font-semibold text-accent transition hover:-translate-y-0.5"
                  >
                    刪除影片
                  </button>
                </div>
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
    </>
  );
}
