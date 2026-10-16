// Strip query and hash so pathname comparisons stay exact.
export function cleanRoutePathname(href: string): string {
  const q = href.indexOf("?");
  const h = href.indexOf("#");
  const end = q === -1 ? h : h === -1 ? q : Math.min(q, h);
  const path = end === -1 ? href : href.slice(0, end);
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

// Decide whether an anchor click should show the immediate /app route skeleton.
export function resolvePendingAppHref(input: {
  rawHref: string | null;
  resolvedHref: string;
  currentOrigin: string;
  currentPathname: string;
}): string | null {
  const { rawHref, resolvedHref, currentOrigin, currentPathname } = input;
  if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(resolvedHref, currentOrigin);
  } catch {
    return null;
  }
  if (url.origin !== currentOrigin) return null;
  if (!url.pathname.startsWith("/app")) return null;
  const nextPath = cleanRoutePathname(url.pathname);
  const current = cleanRoutePathname(currentPathname);
  if (nextPath === current) return null;
  return nextPath;
}
