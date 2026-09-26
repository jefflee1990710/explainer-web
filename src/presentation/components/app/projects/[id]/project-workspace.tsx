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
import {
  EditorStepSwitch,
  type EditorStepNav,
} from "@/presentation/components/app/projects/[id]/editor-step-switch";
import { VideoEditorDialog } from "@/presentation/components/app/projects/[id]/video-editor-dialog";
import { VideoTable } from "@/presentation/components/app/projects/[id]/video-table";

// Folder page: paged video table; create/edit opens a full-page editor dialog.
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
  const [activeVideoId, setActiveVideoId] = useState<string | null>(videoParam);
  const [editorOpen, setEditorOpen] = useState(() => Boolean(videoParam));
  const [freshById, setFreshById] = useState<Record<string, PublicVideo>>({});
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [optimisticVideo, setOptimisticVideo] = useState<PublicVideo | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stepNav, setStepNav] = useState<EditorStepNav | null>(null);
  const onStepNav = useCallback((nav: EditorStepNav | null) => {
    setStepNav((current) => {
      if (current === nav) return current;
      if (!current || !nav) return nav;
      if (
        current.status === nav.status &&
        current.viewing === nav.viewing &&
        current.clipsReady === nav.clipsReady &&
        current.failedAtStep === nav.failedAtStep
      ) {
        if (current.onSelectStep === nav.onSelectStep) return current;
        return { ...current, onSelectStep: nav.onSelectStep };
      }
      return nav;
    });
  }, []);

  // Keep in sync when navigation comes from router (e.g. after createVideo).
  useEffect(() => {
    setActiveVideoId(videoParam);
    if (videoParam) setEditorOpen(true);
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
    setEditorOpen(true);
    replaceVideoQuery(id);
  }

  function onCreate() {
    setActiveVideoId(null);
    setEditorOpen(true);
    replaceVideoQuery(null);
  }

  function onCloseEditor() {
    setEditorOpen(false);
    setActiveVideoId(null);
    setStepNav(null);
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
    onCloseEditor();
    router.refresh();
  }

  const editorTitle = selectedVideo?.phaseA?.localizedTitle || (activeVideoId ? "影片" : "新增影片");

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
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">{videos.length} 支影片</p>
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent-ink px-5 text-sm font-semibold text-lime shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5"
            >
              新增影片
            </button>
          </div>
        </header>

        <VideoTable videos={videos} onSelect={onSelect} />
      </div>

      {editorOpen ? (
        <VideoEditorDialog
          title={editorTitle}
          nav={stepNav ? <EditorStepSwitch {...stepNav} /> : null}
          syncing={videoSyncing}
          canDelete={Boolean(selectedVideo)}
          onExport={
            stepNav?.clipsReady && stepNav.viewing !== 2
              ? () => stepNav.onSelectStep(2)
              : undefined
          }
          onClose={onCloseEditor}
          onDelete={() => setDeleteOpen(true)}
        >
          {videoLoading ? (
            <div className="grid min-h-[16rem] place-items-center p-6">
              <p className="inline-flex items-center gap-2 text-sm text-muted">
                <Spinner />
                載入影片中…
              </p>
            </div>
          ) : (
            <NewProjectForm
              key={activeVideoId ?? "new"}
              projectId={folder.id}
              skills={skills}
              styles={styles}
              characters={characters}
              initialVideo={selectedVideo}
              credits={credits}
              subscribed={subscribed}
              onVideoCreated={(video) => {
                setOptimisticVideo(video);
                setActiveVideoId(video.id);
                replaceVideoQuery(video.id);
              }}
              onStepNav={onStepNav}
            />
          )}
        </VideoEditorDialog>
      ) : null}
    </>
  );
}
