// Video stays on /app and project routes. Post owns /app/posts.
// The generator lives under Characters, so that page lights the Characters item.
export function isStudioNavActive(pathname: string, href: string) {
  if (href === "/app") {
    return pathname === "/app" || pathname.startsWith("/app/projects");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
