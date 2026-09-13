"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveAndGenerateAction } from "@/lib/actions/generation";
import { reviseProjectAction } from "@/lib/actions/projects";
import type { PublicProject } from "@/lib/serialize";

export function StoryboardReview({
  project,
  canGenerate,
}: {
  project: PublicProject;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"revise" | "approve" | "">("");
  const phaseA = project.phaseA;
  if (!phaseA) return null;

  async function revise(formData: FormData) {
    setPending("revise");
    setError("");
    formData.set("projectId", project.id);
    const result = await reviseProjectAction(formData);
    setPending("");
    if (!result.ok) setError(result.error);
    else router.refresh();
  }

  async function approve() {
    setPending("approve");
    setError("");
    const result = await approveAndGenerateAction(project.id);
    setPending("");
    if (!result.ok) {
      setError(result.error);
      if (result.error.includes("訂閱") || result.error.includes("credits")) {
        router.push("/app/billing");
      }
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="text-xl font-semibold">{phaseA.localizedTitle}</h2>
        <p className="text-sm text-muted">{phaseA.englishTitle}</p>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted">時長 / clips</dt>
            <dd>
              {phaseA.targetDuration} · {phaseA.clipCount} 段 · {phaseA.loopMode}
            </dd>
          </div>
          <div>
            <dt className="text-muted">核心訊息</dt>
            <dd>{phaseA.coreMessage}</dd>
          </div>
          <div>
            <dt className="text-muted">開場鉤子</dt>
            <dd>{phaseA.hookStrategy}</dd>
          </div>
          <div>
            <dt className="text-muted">旁白</dt>
            <dd>{phaseA.narrator}</dd>
          </div>
        </dl>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3">Clip</th>
              <th className="px-4 py-3">場景</th>
              <th className="px-4 py-3">英文 VO</th>
              <th className="px-4 py-3">中文對照</th>
            </tr>
          </thead>
          <tbody>
            {phaseA.clips.map((clip) => (
              <tr key={clip.clipNumber} className="border-b border-line align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  #{clip.clipNumber}
                  <div className="text-xs text-muted">{clip.timeRange}</div>
                </td>
                <td className="px-4 py-3">
                  <p>{clip.explainerScene}</p>
                  <p className="mt-1 text-xs text-muted">{clip.motionCamera}</p>
                </td>
                <td className="px-4 py-3">{clip.englishVo}</td>
                <td className="px-4 py-3">{clip.referenceTranslation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {project.status === "awaiting_approval" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <form action={revise} className="rounded-2xl border border-line bg-card p-5">
            <label className="block text-sm font-medium">改稿意見</label>
            <textarea
              name="note"
              rows={4}
              className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-sm"
              placeholder="例如：鉤子再強一點、最後加上 CTA"
            />
            <button
              disabled={pending !== ""}
              className="mt-3 rounded-full border border-line px-4 py-2 text-sm"
            >
              {pending === "revise" ? "重寫中…" : "重寫分鏡"}
            </button>
          </form>
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-sm">
              核准後會消耗 <strong>{project.creditCost} credits</strong>，並開始產片。
            </p>
            {!canGenerate ? (
              <p className="mt-2 text-sm text-muted">
                尚未訂閱或 credits 不足，按下後會導向訂閱頁。
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void approve()}
              disabled={pending !== ""}
              className="mt-4 rounded-full bg-accent px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {pending === "approve" ? "核准並產片中…" : "核准並產片"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
