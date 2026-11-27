// Pure: where a node's extra named output lives. The worker saves it next to the main
// file with the handle as a suffix (Blob paths have no random suffix), so the URL is
// derived from outputUrl and needs no separate field to keep in sync.

export const SPLIT_SECOND_HANDLE = "video-b";

export function extraOutputUrl(mainUrl: string, handle: string): string {
  return mainUrl.replace(/(\.[a-z0-9]+)(\?.*)?$/i, `-${handle}$1$2`);
}

// Blob pathname of the extra file for a job's main pathname.
export function extraOutputPathname(mainPathname: string, handle: string): string {
  return extraOutputUrl(mainPathname, handle);
}
