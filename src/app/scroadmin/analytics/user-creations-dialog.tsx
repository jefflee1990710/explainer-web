"use client";

import { useEffect, useState } from "react";
import { getAdminUserCreationsAction } from "@/presentation/actions/analytics";
import type { AdminUserCreationsDetail } from "@/service/analytics/user-creations";
import type { UserDiagnosticRow } from "@/service/analytics/ux-diagnostics";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() <= 0) return "—";
  return date.toLocaleString("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusPillClass(status: string): string {
  if (status === "ready" || status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "failed" || status === "nsfw") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

// Large modal dialog in `/scroadmin/analytics` showing all creations (Videos, Characters, Life Photos, Failed Jobs) of a selected user.
export function UserCreationsDialog({
  user,
  onClose,
}: {
  user: Pick<UserDiagnosticRow, "clerkUserId" | "email" | "name" | "credits"> | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserCreationsDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "characters" | "life" | "failed">("videos");
  const [lightboxMedia, setLightboxMedia] = useState<{
    type: "image" | "video";
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    void getAdminUserCreationsAction(user.clerkUserId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDetail(res.data);
      if (res.data.videos.length > 0) {
        setActiveTab("videos");
      } else if (res.data.characters.filter((c) => !c.starterGift).length > 0) {
        setActiveTab("characters");
      } else if (res.data.lifeShots.length > 0) {
        setActiveTab("life");
      } else if (res.data.failedJobs.length > 0) {
        setActiveTab("failed");
      } else {
        setActiveTab("videos");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (lightboxMedia) {
          setLightboxMedia(null);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [user, lightboxMedia, onClose]);

  if (!user) return null;

  const customCharacters = detail?.characters.filter((c) => !c.starterGift) ?? [];
  const starterCharacters = detail?.characters.filter((c) => c.starterGift) ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${user.name || user.email} 的創作紀錄`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-xs sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[min(92dvh,64rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border-2 border-[#12141c] bg-[#f8f9fb] shadow-[8px_8px_0_0_#12141c]"
      >
        {/* Dialog Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="truncate font-display text-xl font-bold text-[#12141c]">
                {detail?.name || user.name || "User"}
              </h2>
              <span className="rounded-full bg-[#12141c] px-3 py-0.5 font-mono text-xs font-semibold text-[#c6f24b]">
                剩餘 {detail?.credits ?? user.credits} Credits
              </span>
            </div>
            <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">
              {detail?.email || user.email} · UID: {user.clerkUserId}
              {detail?.createdAtIso ? ` · 註冊時間：${formatDateTime(detail.createdAtIso)}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="關閉視窗"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white text-sm font-bold text-zinc-600 transition hover:border-[#12141c] hover:text-[#12141c]"
          >
            ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-6 py-3">
          <button
            type="button"
            onClick={() => setActiveTab("videos")}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeTab === "videos"
                ? "bg-[#12141c] text-[#c6f24b]"
                : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            🎬 影片專案 Videos ({detail?.videos.length ?? "…"})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("characters")}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeTab === "characters"
                ? "bg-[#12141c] text-[#c6f24b]"
                : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            👤 角色定裝板 Characters ({customCharacters.length} 自訂
            {starterCharacters.length > 0 ? ` + ${starterCharacters.length} 預設` : ""})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("life")}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeTab === "life"
                ? "bg-[#12141c] text-[#c6f24b]"
                : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            📸 Life 日常照 ({detail?.lifeShots.length ?? "…"})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("failed")}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeTab === "failed"
                ? "bg-rose-600 text-white"
                : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            ⚠️ 失敗任務 Failed Jobs ({detail?.failedJobs.length ?? "…"})
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-zinc-500">
              <div className="h-7 w-7 animate-spin rounded-full border-3 border-zinc-300 border-t-[#12141c]" />
              <p>正在讀取 {user.name || user.email} 的所有創作紀錄…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : !detail ? null : activeTab === "videos" ? (
            detail.videos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500">
                此用戶尚未建立任何影片專案。
              </div>
            ) : (
              <div className="space-y-4">
                {detail.videos.map((v) => {
                  const primaryVideoUrl = v.finalUrl || v.reelUrl || v.clipVideoUrls[0] || null;
                  return (
                    <div
                      key={v.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${statusPillClass(v.status)}`}
                            >
                              {v.status}
                            </span>
                            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700">
                              {v.skillSlug}
                            </span>
                            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-[11px] text-zinc-600">
                              {v.styleId} · {v.aspectRatio} · {v.language}
                            </span>
                            <span className="text-xs text-zinc-400">
                              資料夾：{v.folderName}
                            </span>
                          </div>
                          <h3 className="mt-2 font-display text-base font-bold text-[#12141c]">
                            {v.title}
                          </h3>
                          <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                            Video ID: {v.id} · 建立於 {formatDateTime(v.createdAtIso)} · 更新於{" "}
                            {formatDateTime(v.updatedAtIso)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-xl bg-zinc-50 px-3 py-1.5 font-mono text-xs text-zinc-700">
                            分鏡 {v.clipCount} 段 · 畫格 {v.framesReadyCount} 張 · 影片{" "}
                            <strong className="text-emerald-700">{v.clipsReadyCount}</strong> 段
                          </span>
                        </div>
                      </div>

                      {v.source || v.spokenScript ? (
                        <div className="mt-3 grid gap-2 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 sm:grid-cols-2">
                          {v.source ? (
                            <div>
                              <span className="font-bold text-zinc-900">導演指示 (Instruction)：</span>
                              <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap">{v.source}</p>
                            </div>
                          ) : null}
                          {v.spokenScript ? (
                            <div>
                              <span className="font-bold text-zinc-900">對鏡講稿 (Spoken Script)：</span>
                              <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap">
                                {v.spokenScript}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {v.error ? (
                        <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                          錯誤訊息：{v.error}
                        </p>
                      ) : null}

                      {/* Media Strip: Videos + Keyframes */}
                      {primaryVideoUrl || v.clipVideoUrls.length > 0 || v.frameUrls.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {v.clipVideoUrls.length > 0 || v.reelUrl || v.finalUrl ? (
                            <div>
                              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                已生成影片片段 / 成片
                              </p>
                              <div className="flex flex-wrap gap-3">
                                {v.finalUrl ? (
                                  <div className="w-36 shrink-0 overflow-hidden rounded-xl border border-emerald-300 bg-black">
                                    <video
                                      src={v.finalUrl}
                                      controls
                                      preload="metadata"
                                      className="aspect-[9/16] w-full object-contain"
                                    />
                                    <div className="bg-emerald-950 px-2 py-1 text-center text-[10px] font-bold text-emerald-300">
                                      Final 匯出成片
                                    </div>
                                  </div>
                                ) : null}
                                {v.reelUrl && v.reelUrl !== v.finalUrl ? (
                                  <div className="w-36 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-black">
                                    <video
                                      src={v.reelUrl}
                                      controls
                                      preload="metadata"
                                      className="aspect-[9/16] w-full object-contain"
                                    />
                                    <div className="bg-zinc-900 px-2 py-1 text-center text-[10px] font-bold text-white">
                                      合成 Reel
                                    </div>
                                  </div>
                                ) : null}
                                {v.clipVideoUrls.map((url, idx) => (
                                  <div
                                    key={`${v.id}-vid-${idx}`}
                                    className="w-36 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-black"
                                  >
                                    <video
                                      src={url}
                                      controls
                                      preload="metadata"
                                      className="aspect-[9/16] w-full object-contain"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setLightboxMedia({
                                          type: "video",
                                          url,
                                          title: `${v.title} · Clip ${idx + 1}`,
                                        })
                                      }
                                      className="block w-full cursor-pointer bg-zinc-900 px-2 py-1 text-center text-[10px] font-semibold text-zinc-200 hover:bg-black hover:text-[#c6f24b]"
                                    >
                                      Clip {idx + 1} (放大檢視)
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {v.frameUrls.length > 0 ? (
                            <div>
                              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                已生成分鏡畫格 (Keyframes · {v.frameUrls.length})
                              </p>
                              <div className="flex flex-wrap gap-2.5">
                                {v.frameUrls.map((url, idx) => (
                                  <button
                                    key={`${v.id}-frame-${idx}`}
                                    type="button"
                                    onClick={() =>
                                      setLightboxMedia({
                                        type: "image",
                                        url,
                                        title: `${v.title} · Frame ${idx + 1}`,
                                      })
                                    }
                                    className="group relative h-28 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={url}
                                      alt=""
                                      className="h-full w-full object-cover transition group-hover:scale-105"
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === "characters" ? (
            detail.characters.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500">
                此用戶尚無任何角色資料。
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {detail.characters.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-base font-bold text-[#12141c]">
                              {c.name}
                            </h3>
                            {c.starterGift ? (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                                系統預設角色
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                用戶自訂角色
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                            Style: {c.styleId} · 版本：{c.completedVersionCount}/{c.versionCount}
                          </p>
                        </div>
                      </div>

                      {c.versionThumbs.length > 0 ? (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {c.versionThumbs.map((ver) => (
                            <button
                              key={ver.id}
                              type="button"
                              disabled={!ver.url}
                              onClick={() =>
                                ver.url &&
                                setLightboxMedia({
                                  type: "image",
                                  url: ver.url,
                                  title: `${c.name} (${ver.styleId})`,
                                })
                              }
                              title={ver.editInstruction || ver.styleId}
                              className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 disabled:cursor-default"
                            >
                              {ver.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={ver.url}
                                  alt={c.name}
                                  className="h-full w-full object-cover object-top transition group-hover:scale-105"
                                />
                              ) : (
                                <span className="grid h-full w-full place-items-center text-[10px] text-zinc-400">
                                  {ver.status}
                                </span>
                              )}
                              <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                {ver.styleId}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <p className="mt-3 font-mono text-[10px] text-zinc-400">
                      更新於 {formatDateTime(c.updatedAtIso)}
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === "life" ? (
            detail.lifeShots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500">
                此用戶尚未生成任何 Life 日常照。
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {detail.lifeShots.map((s) => (
                  <div
                    key={s.id}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs"
                  >
                    <div className="relative aspect-[3/4] bg-zinc-100">
                      {s.resultUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxMedia({
                              type: "image",
                              url: s.resultUrl!,
                              title: `${s.characterName} · ${s.place}`,
                            })
                          }
                          className="block h-full w-full cursor-pointer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.resultUrl}
                            alt={s.place}
                            className="h-full w-full object-cover object-top"
                          />
                        </button>
                      ) : (
                        <div className="grid h-full w-full place-items-center p-4 text-center text-xs text-zinc-400">
                          {s.error || s.status}
                        </div>
                      )}
                      <span
                        className={`absolute top-2 left-2 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusPillClass(s.status)}`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs font-bold text-[#12141c]">
                        {s.characterName} · {s.kind}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-600">{s.place}</p>
                      <p className="mt-1 font-mono text-[10px] text-zinc-400">
                        {formatDateTime(s.createdAtIso)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : detail.failedJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500">
              此用戶沒有失敗的生成任務紀錄。
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
              {detail.failedJobs.map((job) => (
                <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs">
                  <div>
                    <span className="rounded-full bg-rose-50 px-2.5 py-0.5 font-mono font-bold text-rose-700">
                      {job.kind}
                    </span>
                    {job.model ? (
                      <span className="ml-2 font-mono text-zinc-500">{job.model}</span>
                    ) : null}
                    <p className="mt-1.5 font-medium text-zinc-800">
                      {job.error || "未知錯誤"}
                    </p>
                  </div>
                  <span className="font-mono text-zinc-400">
                    {formatDateTime(job.createdAtIso)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox for Image / Video preview */}
      {lightboxMedia ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxMedia(null);
          }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90dvh] max-w-4xl flex-col items-center"
          >
            <div className="mb-2 flex w-full items-center justify-between gap-4 text-white">
              <span className="truncate text-sm font-bold">{lightboxMedia.title}</span>
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                className="cursor-pointer rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white hover:bg-white/30"
              >
                關閉 ✕
              </button>
            </div>
            {lightboxMedia.type === "video" ? (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                className="max-h-[82dvh] max-w-full rounded-2xl bg-black"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.title}
                className="max-h-[82dvh] max-w-full rounded-2xl object-contain"
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
