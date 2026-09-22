/**
 * Probe one DashScope image model with a tiny T2I call.
 * Usage: npx tsx scripts/probe-alicloud-image.ts [model]
 */
import { loadEnvConfig } from "@next/env";
import { dashscopeRequest } from "@/service/alicloud/dashscope";

loadEnvConfig(process.cwd());

async function main() {
  const model = process.argv[2] || "qwen-image-3.0-pro";
  const started = Date.now();
  try {
    const { body } = await dashscopeRequest(
      "/services/aigc/multimodal-generation/generation",
      {
        method: "POST",
        timeoutMs: 6 * 60_000,
        body: JSON.stringify({
          model,
          input: {
            messages: [
              {
                role: "user",
                content: [{ text: 'White poster. Bottom subtitle: "Hello world"' }],
              },
            ],
          },
          parameters: {
            n: 1,
            size: "1024*1024",
            prompt_extend: false,
            enable_thinking: false,
            watermark: false,
          },
        }),
      },
    );
    const output = body.output && typeof body.output === "object" ? body.output : {};
    console.log(
      JSON.stringify(
        {
          model,
          ms: Date.now() - started,
          keys: Object.keys(body),
          outputKeys: Object.keys(output as object),
          requestId: body.request_id,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        { model, ms: Date.now() - started, error: error instanceof Error ? error.message : error },
        null,
        2,
      ),
    );
    process.exit(1);
  }
}

main();
