import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateApiKey, runAsMcpUser } from "@/lib/mcp/api-keys";
import { createExplainerMcpServer } from "@/lib/mcp/server";

export const runtime = "nodejs";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, mcp-session-id, Last-Event-ID, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
};

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function handle(request: Request) {
  const auth = await authenticateApiKey(request.headers.get("authorization"));
  if (!auth) {
    return withCors(
      Response.json({ error: "Unauthorized" }, { status: 401 }),
    );
  }

  return runAsMcpUser(auth.user, async () => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      // Stateless JSON responses work best behind Next.js serverless.
      enableJsonResponse: true,
    });
    const server = createExplainerMcpServer(auth.user, auth.apiKey);
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    return withCors(response);
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}
