// Next.js shows a Server Action error body only when the status is an error
// and Content-Type is exactly "text/plain". A redirect to the HTML sign-in
// page is dropped, and the card shows "An unexpected response was received from the server."

export const SIGN_IN_REQUIRED_MESSAGE = "請先登入";

export const SERVER_ACTION_ERROR_CONTENT_TYPE = "text/plain";

// Unsigned Server Action posts get this body. Page navigations still redirect.
export function serverActionAuthPlainBody(headers: {
  get(name: string): string | null;
}): string | null {
  const actionId = headers.get("next-action");
  if (!actionId) return null;
  return SIGN_IN_REQUIRED_MESSAGE;
}
