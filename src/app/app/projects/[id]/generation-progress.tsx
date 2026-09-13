"use client";

import { useEffect, useState } from "react";
import { refreshGenerationAction } from "@/lib/actions/generation";
import type { PublicProject } from "@/lib/serialize";

export function GenerationProgress({
  project: initial,
}: {
  project: PublicProject;
}) {
  const [polled, setPolled] = useState<PublicProject | null>(null);
  const project =
    polled && polled.id === initial.id ? polled : initial;

  useEffect(() => {
    if (project.status !== "generating") return;
    const timer = window.setInterval(() => {
      void refreshGenerationAction(project.id).then((result) => {
        if (result.ok) setPolled(result.project);
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [project.id, project.status]);

  if (project.status !== "generating" && project.status !== "failed") {
    return null;
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <h2 className="text-lg font-semibold">產片進度</h2>
      {project.error ? (
        <p className="mt-2 text-sm text-red-600">{project.error}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Higgsfield 正在產角色定裝圖與各段 clips。完成後可連續播放。
        </p>
      )}
      <ul className="mt-4 space-y-2 text-sm">
        {project.clips.map((clip) => (
          <li key={clip.clipNumber} className="flex justify-between">
            <span>Clip {clip.clipNumber}</span>
            <span className="text-muted">{clip.status}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
