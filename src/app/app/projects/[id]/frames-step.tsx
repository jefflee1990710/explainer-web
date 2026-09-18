"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FramesTimeline } from "@/components/project/frames-timeline";
import {
  approveAndGenerateAction,
  regenerateFrameAction,
  updateClipStoryboardAction,
} from "@/lib/actions/generation";
import type { PublicProject } from "@/lib/serialize";
import type {
  ClipStoryboardInput,
  FramePosition,
  FrameRevisionInput,
} from "@/types/project";

// Project-page wrapper around the shared timeline; refreshes the server
// render after each paid action so status flips on the page.
export function FramesStep({
  project,
  credits,
  subscribed,
}: {
  project: PublicProject;
  credits: number;
  subscribed: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  if (project.status !== "frames_generating" && project.status !== "frames_ready") {
    return null;
  }

  // Runs an action under a pending key; resolves true when it succeeded.
  async function run(
    key: string,
    action: () => Promise<
      { ok: true; project: PublicProject } | { ok: false; error: string }
    >,
  ) {
    setPending(key);
    setError("");
    const result = await action();
    setPending("");
    if (!result.ok) {
      setError(result.error);
      if (result.error.includes("訂閱") || result.error.includes("credits 不足")) {
        router.push("/app/billing");
      }
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <FramesTimeline
      project={project}
      credits={credits}
      subscribed={subscribed}
      pending={pending}
      error={error}
      onApprove={() => void run("approve", () => approveAndGenerateAction(project.id))}
      onRegenerate={(
        clipNumber: number,
        position: FramePosition,
        revision?: FrameRevisionInput,
      ) =>
        void run(`frame:${clipNumber}:${position}`, () =>
          regenerateFrameAction(project.id, clipNumber, position, revision),
        )
      }
      onUpdateClip={(
        clipNumber: number,
        input: ClipStoryboardInput,
        regenerate: boolean,
      ) =>
        run(`clip:${clipNumber}${regenerate ? ":regen" : ""}`, () =>
          updateClipStoryboardAction(project.id, clipNumber, input, { regenerate }),
        )
      }
    />
  );
}
