"use client";

import { SmoothSilenceAuto } from "@/presentation/components/app/projects/new/smooth-silence-auto";
import type { PublicVideo } from "@/presentation/serialize";

// Background Smooth Silence sync on the OpenCut top toolbar.
// Manual SFX and BGM now live as dedicated tabs in the left Assets panel.
export function OpenCutAiToolbarActions({ project }: { project?: PublicVideo }) {
  return <SmoothSilenceAuto project={project} />;
}
