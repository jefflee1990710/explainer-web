import { loadEnvConfig } from "@next/env";
import { writeFile } from "node:fs/promises";

loadEnvConfig(process.cwd());

async function main() {
  const key = process.env.HF_CREDENTIALS || "";
  const headers = {
    Authorization: `Key ${key}`,
    "Content-Type": "application/json",
  };
  const created = await fetch("https://api.higgsfield.ai/xai/grok-imagine-image-2.0", {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt:
        "White doodle frame, 9:16. A thick yellow brush banner at the top. Paint this Traditional Chinese sentence exactly, character for character, and do not replace any character with a similar one: 你啲貨幾靚都好喎，",
      aspect_ratio: "9:16",
      quality: "medium",
      resolution: "1k",
    }),
  });
  const body = await created.json();
  console.log("submit", created.status, JSON.stringify(body).slice(0, 400));
  const statusUrl = body.status_url as string | undefined;
  if (!statusUrl) return;
  for (let i = 0; i < 15; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    const res = await fetch(statusUrl, { headers: { Authorization: `Key ${key}` } });
    const text = await res.text();
    console.log(text.slice(0, 600));
    if (text.includes('"completed"')) {
      const parsed = JSON.parse(text) as { images?: Array<{ url?: string }> };
      const image = parsed.images?.[0]?.url;
      if (image) {
        const file = await fetch(image);
        await writeFile("/tmp/grok-probe.png", Buffer.from(await file.arrayBuffer()));
        console.log("saved");
      }
      return;
    }
    if (text.includes('"failed"') || text.includes('"nsfw"')) return;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
