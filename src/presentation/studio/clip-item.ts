// Shared row for the editor media list and the bottom filmstrip.
export type StudioClipItem = {
  id: string;
  title: string;
  durationLabel: string;
  thumbnailUrl?: string;
  statusLabel: string;
  busy: boolean;
  stale: boolean;
};
