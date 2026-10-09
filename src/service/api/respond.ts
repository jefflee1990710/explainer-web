import { authenticateApiRequest, runAsApiUser, type ApiAuth } from "@/service/api/auth";

// Every /api/v1 reply is JSON. Errors use `{ error }` so the app can show one string.
export function apiJson(data: unknown, init: number | ResponseInit = 200) {
  return Response.json(data, typeof init === "number" ? { status: init } : init);
}

export function apiError(message: string, status = 400) {
  return apiJson({ error: message }, status);
}

// Service actions return `{ ok, ... } | { ok: false, error }`. Map that to HTTP.
export function fromResult<T extends { ok: boolean }>(
  result: T,
  status = 200,
): Response {
  if (!result.ok) {
    const message = "error" in result ? String((result as { error: unknown }).error) : "操作失敗";
    return apiError(message, errorStatus(message));
  }
  const { ok: _ok, ...rest } = result as T & { ok: true };
  void _ok;
  return apiJson(rest, status);
}

// Not-found style messages from the services map to 404; everything else is 400.
function errorStatus(message: string) {
  if (/不存在|找不到/.test(message)) return 404;
  return 400;
}

type Handler<P> = (ctx: { auth: ApiAuth; request: Request; params: P }) => Promise<Response>;

// Authenticate, bind the user for `requireAppUser()`, run the handler, and
// turn thrown errors into a JSON 500 instead of an HTML error page.
export function withApiUser<P = Record<string, never>>(handler: Handler<P>) {
  // Next.js 16 route handlers receive `{ params: Promise<P> }` as the second argument.
  return async (request: Request, context: { params: Promise<P> }): Promise<Response> => {
    const auth = await authenticateApiRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    const params = ((await context?.params) ?? {}) as P;
    try {
      return await runAsApiUser(auth.user, () => handler({ auth, request, params }));
    } catch (error) {
      console.error("[api/v1]", request.method, new URL(request.url).pathname, error);
      return apiError(error instanceof Error ? error.message : "伺服器錯誤", 500);
    }
  };
}

// Read a JSON body, tolerating an empty body.
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}
