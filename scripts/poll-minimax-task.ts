import { loadEnvConfig } from "@next/env";
import { writeFileSync } from "node:fs";

loadEnvConfig(process.cwd());

const apiKey = process.env.MINIMAX_API_KEY;
const taskId = "462138702614722";

async function poll() {
  while (true) {
    const res = await fetch(
      `https://api.minimaxi.chat/v1/query/video_generation?task_id=${taskId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );
    const data = await res.json();
    console.log("Status:", data.status, data.file_id ? `file_id: ${data.file_id}` : "");
    if (data.status === "Success" || data.file_id) {
      console.log("Fetching download URL for file_id:", data.file_id);
      const fileRes = await fetch(
        `https://api.minimaxi.chat/v1/files/retrieve?file_id=${data.file_id}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      );
      const fileData = await fileRes.json();
      const downloadUrl = fileData.file?.download_url;
      console.log("Download URL:", downloadUrl);
      const videoRes = await fetch(downloadUrl);
      const videoBuf = Buffer.from(await videoRes.arrayBuffer());
      writeFileSync("Marketing/Scro-Fisheye-Loop-Raw-10s.mp4", videoBuf);
      console.log("Successfully downloaded to Marketing/Scro-Fisheye-Loop-Raw-10s.mp4 (bytes:", videoBuf.length, ")");
      return;
    }
    if (data.status === "Failed" || data.status === "Fail") {
      throw new Error(`Generation failed: ${JSON.stringify(data)}`);
    }
    await new Promise((r) => setTimeout(r, 8000));
  }
}

poll().catch((e) => {
  console.error(e);
  process.exit(1);
});
