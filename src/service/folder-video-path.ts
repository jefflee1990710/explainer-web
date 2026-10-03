// Folder list and the dedicated editor routes on that folder.

export function folderPath(folderId: string) {
  return `/app/projects/${folderId}`;
}

export function folderVideoPath(folderId: string, videoId?: string) {
  if (!videoId) return `${folderPath(folderId)}/videos/new`;
  return `${folderPath(folderId)}/videos/${videoId}`;
}

export function folderVideoRedirectFromQuery(folderId: string, videoId?: string | null) {
  const id = videoId?.trim();
  if (!id) return null;
  return folderVideoPath(folderId, id);
}

export function folderVideoMatchesTask(href: string, videoId: string) {
  return href.includes(`/videos/${videoId}`) || href.includes(`video=${videoId}`);
}
