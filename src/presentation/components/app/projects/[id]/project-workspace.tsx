"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { toPublicVideoCardFromPublic } from "@/presentation/serialize";
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
  creditLimit,
  subscribed,
}: {
  folder: PublicFolder;
  skills: PublicSkill[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  credits: number;
  creditLimit: number;
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
  const [loadError, setLoadError] = useState("");
  const inflightLoad = useRef<Set<string>>(new Set());
  const activeVideoIdRef = useRef(activeVideoId);
  activeVideoIdRef.current = activeVideoId;
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

  // Full document for the editor; list cards are too light to render the form.
  const loadVideo = useCallback((id: string) => {
    if (freshById[id] || inflightLoad.current.has(id)) return;
    inflightLoad.current.add(id);
    setFetchingId(id);
    void getProjectAction(id).then((result) => {
      inflightLoad.current.delete(id);
      setFetchingId((current) => (current === id ? null : current));
      if (result.ok) {
        setFreshById((prev) => ({ ...prev, [id]: result.project }));
        if (activeVideoIdRef.current === id) setLoadError("");
        return;
      }
      if (activeVideoIdRef.current === id) setLoadError(result.error);
    });
  }, [freshById]);

  useEffect(() => {
    if (!activeVideoId) return;
    setLoadError("");
    loadVideo(activeVideoId);
  }, [activeVideoId, loadVideo]);

  const prefetchVideo = useCallback(
    (id: string) => {
      loadVideo(id);
    },
    [loadVideo],
  );

  const selectedVideo = useMemo(() => {
    if (!activeVideoId || hiddenIds.has(activeVideoId)) return null;
    return (
      freshById[activeVideoId] ??
      (optimisticVideo?.id === activeVideoId ? optimisticVideo : null)
    );
  }, [activeVideoId, freshById, optimisticVideo, hiddenIds]);

  const videoLoading = Boolean(
    editorOpen && activeVideoId && !selectedVideo && !hiddenIds.has(activeVideoId),
  );
  const videoSyncing = Boolean(activeVideoId && fetchingId === activeVideoId && selectedVideo);

  const videos = useMemo(() => {
    const cards = folder.videos.filter((video) => !hiddenIds.has(video.id));
    if (
      optimisticVideo &&
      !hiddenIds.has(optimisticVideo.id) &&
      !cards.some((video) => video.id === optimisticVideo.id)
    ) {
      return [toPublicVideoCardFromPublic(optimisticVideo), ...cards];
    }
    return cards;
  }, [folder.videos, optimisticVideo, hiddenIds]);

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

  const listTitle = videos.find((video) => video.id === activeVideoId)?.title;
  const editorTitle =
    selectedVideo?.phaseA?.localizedTitle || listTitle || (activeVideoId ? "影片" : "新增影片");

  return (
    <>
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

        <VideoTable videos={videos} onSelect={onSelect} onPrefetch={prefetchVideo} />
      </div>

      {editorOpen ? (
        <VideoEditorDialog
          title={editorTitle}
          videoId={selectedVideo?.id ?? activeVideoId ?? undefined}
          credits={credits}
          creditLimit={creditLimit}
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
              {loadError ? (
                <div className="max-w-sm space-y-3 text-center">
                  <p className="text-sm text-accent" role="alert">
                    {loadError}
                  </p>
                  <button
                    type="button"
                    className="cursor-pointer rounded-full border border-[var(--studio-line)] px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-[var(--studio-fill)]"
                    onClick={() => {
                      if (!activeVideoId) return;
                      setLoadError("");
                      loadVideo(activeVideoId);
                    }}
                  >
                    重試
                  </button>
                </div>
              ) : (
                <p className="inline-flex items-center gap-2 text-sm text-muted">
                  <Spinner />
                  載入影片中…
                </p>
              )}
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
      {deleteOpen && selectedVideo ? (
        <DeleteVideoDialog
          video={selectedVideo}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => onVideoDeleted(selectedVideo.id)}
        />
      ) : null}
    </>
  );
}
