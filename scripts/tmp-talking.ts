import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const key = process.env.ELEVENLABS_API_KEY || "";
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": key },
  });
  if (!res.ok) {
    console.log("status", res.status);
    process.exit(1);
  }
  const body = (await res.json()) as {
    voices?: Array<{
      voice_id: string;
      name: string;
      category?: string;
      labels?: Record<string, string>;
    }>;
  };
  const rows = (body.voices || []).map((voice) => ({
    name: voice.name,
    category: voice.category,
    lang: voice.labels?.language || voice.labels?.accent || "",
    use: voice.labels?.use_case || "",
  }));
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
