// Dedicated editor routes. The folder list opens these in a new tab.

export function folderVideoPath(folderId: string, videoId?: string) {
  if (!videoId) return `/app/projects/${folderId}/videos/new`;
  return `/app/projects/${folderId}/videos/${videoId}`;
}

export function folderVideoRedirectFromQuery(folderId: string, videoId?: string | null) {
  const id = videoId?.trim();
  if (!id) return null;
  return folderVideoPath(folderId, id);
}

export function folderVideoMatchesTask(href: string, videoId: string) {
  return href.includes(`/videos/${videoId}`) || href.includes(`video=${videoId}`);
}
