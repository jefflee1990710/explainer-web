// Folder list and the dedicated editor routes (folder-scoped or standalone `/app/videos/*`).

export function folderPath(folderId?: string | null) {
  if (!folderId) return "/app?stay=1";
  return `/app/projects/${folderId}`;
}

export function folderVideoPath(folderId?: string | null, videoId?: string) {
  if (!folderId) {
    if (!videoId) return "/app/videos/new";
    return `/app/videos/${videoId}`;
  }
  if (!videoId) return `${folderPath(folderId)}/videos/new`;
  return `${folderPath(folderId)}/videos/${videoId}`;
}

export function folderVideoRedirectFromQuery(folderId?: string | null, videoId?: string | null) {
  const id = videoId?.trim();
  if (!id) return null;
  return folderVideoPath(folderId, id);
}

export function folderVideoMatchesTask(href: string, videoId: string) {
  return href.includes(`/videos/${videoId}`) || href.includes(`video=${videoId}`);
}

