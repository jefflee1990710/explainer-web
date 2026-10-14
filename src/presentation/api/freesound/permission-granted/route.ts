import { NextResponse, type NextRequest } from "next/server";
import {
  freesoundCallbackKind,
} from "@/service/freesound/callback";
import {
  exchangeFreesoundCode,
  saveFreesoundGrant,
} from "@/service/freesound/exchange-code";

function page({ title, message }: { title: string; message: string }): NextResponse {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${message}</p>
    </main>
  </body>
</html>`;
  return new NextResponse(html, {
    status: title === "Freesound permission failed" ? 400 : 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// Freesound OAuth redirect. Sounds are not listed from here.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const state = request.nextUrl.searchParams.get("state");
  const kind = freesoundCallbackKind({ code, error });

  if (kind === "denied") {
    return page({
      title: "Freesound access denied",
      message: "Scro was not granted access to this Freesound account.",
    });
  }

  if (kind === "ready") {
    return page({
      title: "Freesound callback ready",
      message: "This address receives the Freesound permission redirect.",
    });
  }

  try {
    const token = await exchangeFreesoundCode({ code: code ?? "" });
    await saveFreesoundGrant({ token, state });
    return page({
      title: "Freesound permission granted",
      message: "Scro can use this Freesound account. You can close this page.",
    });
  } catch (error) {
    console.error(
      "Freesound permission exchange failed",
      error instanceof Error ? error.message : "unknown",
    );
    return page({
      title: "Freesound permission failed",
      message: "The authorization code could not be exchanged. Try granting access again.",
    });
  }
}
