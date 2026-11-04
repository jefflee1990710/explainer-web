"use client";

import { useState } from "react";
import type { PublicJutsuJob } from "@/model/jutsu-job";
import type { PublicTeleportJob } from "@/model/teleport-job";
import { deleteJutsuJobAction } from "@/presentation/actions/jutsu";
import { deleteTeleportJobAction } from "@/presentation/actions/teleport";
import { ScroSwapHistoryPanel } from "@/presentation/components/app/jutsu/scro-swap-history-panel";
import { VideoTable } from "@/presentation/components/app/projects/[id]/video-table";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { TeleportHistoryPanel } from "@/presentation/components/app/teleport/teleport-history-panel";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter, PublicVideoCard } from "@/presentation/serialize";

type VideoCategoryTab = "all" | "studio" | "scroswap" | "teleport";

export function AllVideosView({
  initialVideos,
  initialSwapJobs,
  initialTeleportJobs,
  characters,
}: {
  initialVideos: PublicVideoCard[];
  initialSwapJobs: PublicJutsuJob[];
  initialTeleportJobs: PublicTeleportJob[];
  characters: PublicCharacter[];
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";

  const [tab, setTab] = useState<VideoCategoryTab>("all");
  const [swapJobs, setSwapJobs] = useState<PublicJutsuJob[]>(initialSwapJobs);
  const [activeSwapId, setActiveSwapId] = useState<string | null>(
    initialSwapJobs[0]?.id ?? null,
  );
  const [teleportJobs, setTeleportJobs] =
    useState<PublicTeleportJob[]>(initialTeleportJobs);
  const [activeTeleportId, setActiveTeleportId] = useState<string | null>(
    initialTeleportJobs[0]?.id ?? null,
  );

  async function handleDeleteSwap(id: string) {
    const res = await deleteJutsuJobAction(id);
    if (res.ok) {
      setSwapJobs((prev) => prev.filter((item) => item.id !== id));
      notifyTasksChanged();
    }
  }

  async function handleDeleteTeleport(id: string) {
    const res = await deleteTeleportJobAction(id);
    if (res.ok) {
      setTeleportJobs((prev) => prev.filter((item) => item.id !== id));
      notifyTasksChanged();
    }
  }

  const totalCount =
    initialVideos.length + swapJobs.length + teleportJobs.length;

  const tabs: Array<{ id: VideoCategoryTab; label: string; count: number }> = [
    {
      id: "all",
      label: isEn ? "All Videos" : "全部影片",
      count: totalCount,
    },
    {
      id: "studio",
      label: isEn ? "Explainer & Talking Head" : "解說與開講影片",
      count: initialVideos.length,
    },
    {
      id: "scroswap",
      label: isEn ? "Scro Swap" : "Scro Swap 換角",
      count: swapJobs.length,
    },
    {
      id: "teleport",
      label: isEn ? "Teleport" : "Teleport 換場",
      count: teleportJobs.length,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#12141c]">
            {isEn ? "Videos" : "影片庫 Videos"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {isEn
              ? "All generated Explainer, Talking Head, Scro Swap, and Teleport videos."
              : "集中檢視、播放與下載所有已生成的解說、開講、Scro Swap 與 Teleport 影片。"}
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Video categories"
          className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white p-1.5"
        >
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
                  active
                    ? "bg-[#12141c] text-[#c6f24b]"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-[#12141c]"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`rounded-2xl px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                    active
                      ? "bg-white/15 text-[#c6f24b]"
                      : "bg-zinc-200/80 text-zinc-700"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center text-sm text-zinc-500">
          {isEn ? "No generated videos yet." : "尚無已生成的影片紀錄。"}
        </div>
      ) : (
        <div className="space-y-8">
          {(tab === "all" || tab === "studio") && initialVideos.length > 0 ? (
            <section className="space-y-3">
              {tab === "all" ? (
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[#12141c]">
                    {isEn ? "Explainer & Talking Head" : "解說與開講影片"}
                  </h2>
                  <span className="rounded-2xl bg-zinc-200/80 px-2.5 py-0.5 text-xs font-bold text-zinc-700">
                    {initialVideos.length}
                  </span>
                </div>
              ) : null}
              <VideoTable videos={initialVideos} />
            </section>
          ) : null}

          {(tab === "all" || tab === "scroswap") && swapJobs.length > 0 ? (
            <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
              <ScroSwapHistoryPanel
                jobs={swapJobs}
                characters={characters}
                activeJobId={activeSwapId}
                onSelectJob={(job) => setActiveSwapId(job.id)}
                onDeleteJob={(id) => void handleDeleteSwap(id)}
                layout="modal"
              />
            </section>
          ) : null}

          {(tab === "all" || tab === "teleport") && teleportJobs.length > 0 ? (
            <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
              <TeleportHistoryPanel
                jobs={teleportJobs}
                activeJobId={activeTeleportId}
                onSelectJob={(job) => setActiveTeleportId(job.id)}
                onDeleteJob={(id) => void handleDeleteTeleport(id)}
                layout="modal"
              />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
