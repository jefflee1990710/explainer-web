// The open canvas is always `/app/canvas?id=...`, so a reload or a shared link
// opens that canvas. Other query params (such as hl) stay.

export function canvasPageHref(
  projectId: string,
  search: string | URLSearchParams | Record<string, string | string[] | undefined> = "",
): string {
  const params = searchParamsOf(search);
  params.delete("template");
  params.set("id", projectId);
  return `/app/canvas?${params.toString()}`;
}

function searchParamsOf(
  search: string | URLSearchParams | Record<string, string | string[] | undefined>,
): URLSearchParams {
  if (typeof search === "string") return new URLSearchParams(search.replace(/^\?/, ""));
  if (search instanceof URLSearchParams) return new URLSearchParams(search);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === "string") params.append(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    }
  }
  return params;
}
