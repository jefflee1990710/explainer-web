// Progress colour for the filmstrip status band.
export type StudioClipTone = "idle" | "busy" | "done" | "failed" | "stale";

// Shared row for the filmstrip.
export type StudioClipItem = {
  id: string;
  title: string;
  durationLabel: string;
  thumbnailUrl?: string;
  statusLabel: string;
  busy: boolean;
  stale: boolean;
  tone: StudioClipTone;
  // Both scene stills (start + end) already have a file.
  hasScene: boolean;
  // This clip's video file already exists.
  hasVideo: boolean;
};
