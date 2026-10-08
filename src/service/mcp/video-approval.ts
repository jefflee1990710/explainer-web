import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type ApprovalResult = {
  action: string;
  content?: { approve?: unknown } | null;
};

// The user must tick approve and accept. Decline, cancel, or a missing checkbox stops the render.
export function videoApproved(result: ApprovalResult) {
  return result.action === "accept" && result.content?.approve === true;
}

// Ask the connected client before any video render. No approval means no job is queued.
export async function requireVideoApproval(server: McpServer, message: string) {
  let result: ApprovalResult;
  try {
    result = await server.server.elicitInput(
      {
        mode: "form",
        message,
        requestedSchema: {
          type: "object",
          properties: {
            approve: {
              type: "boolean",
              title: "核准產生影片",
              description: "勾選後才會扣 credits 並開始渲染。",
            },
          },
          required: ["approve"],
        },
      },
      { timeout: 5 * 60 * 1000 },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    throw new Error(
      detail
        ? `產生影片需要你的核准，但確認沒有完成：${detail}`
        : "產生影片需要你的核准，但確認沒有完成。",
    );
  }
  if (!videoApproved(result)) {
    throw new Error("已取消：產生或重製影片需要你的核准。");
  }
}
