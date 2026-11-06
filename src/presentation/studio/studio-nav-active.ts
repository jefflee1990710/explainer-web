// Create use-case lists own /app/explainers and /app/talking-heads.
// Legacy /app still lists everything but is hidden from the rail.
// The generator lives under Characters, so that page lights the Characters item.
export function isStudioNavActive(pathname: string, href: string) {
  if (href === "/app/explainers") {
    return pathname === "/app/explainers" || pathname.startsWith("/app/explainers/");
  }
  if (href === "/app/talking-heads") {
    return pathname === "/app/talking-heads" || pathname.startsWith("/app/talking-heads/");
  }
  if (href === "/app/stories") {
    return pathname === "/app/stories" || pathname.startsWith("/app/stories/");
  }
  if (href === "/app") {
    return pathname === "/app";
  }
  if (href === "/app/posts") {
    return pathname === "/app/posts" || pathname.startsWith("/app/posts/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
