import { randomUUID } from "node:crypto";
import type { AspectRatio } from "@/model/project";
import {
  comfyBaseUrl,
  hasComfyEndpoint,
  type ComfySubmitResult,
} from "@/service/comfy/openjutsu-client";
import {
  resolveH3ExtendDimensions,
  type ApiGraph,
} from "@/service/comfy/openjutsu-graph";
import extendWorkflowJson from "@/service/comfy/workflows/extend.api.json";
import { OPENROUTER_HAILUO_3_VIDEO_MODEL } from "@/service/openrouter/generate";

export function shouldUseComfyForClipVideo(input: {
  model: string;
  audioUrl?: string;
  skillSlug?: string;
  durationSeconds?: number;
}): boolean {
  if (!hasComfyEndpoint()) return false;
  if (input.audioUrl?.trim()) return false;
  if (input.skillSlug === "one-take-director") return true;
  if (process.env.COMFY_CLIP_VIDEO_ENABLED?.trim() !== "true") return false;
  return input.model === OPENROUTER_HAILUO_3_VIDEO_MODEL;
}

function h3ValidFrameLength(durationSeconds: number): number {
  const clamped = Math.max(2.5, Math.min(10, Number(durationSeconds) || 6));
  const rawFrames = Math.max(5, Math.ceil(clamped * 24 - 1e-9));
  return rawFrames + ((5 - (rawFrames % 17) + 17) % 17);
}

const H3_CHAIN_SEGMENT_FRAMES = 192; // 39 protected prefix frames + 153 new frames (~6.375s at 24fps)
const H3_CHAIN_SEGMENT_NET_SECONDS = 153 / 24; // 6.375s

function splitOneTakeBeatClauses(prompt: string, shotCount: number): string[] {
  const clean = prompt.replace(/\s+/g, " ").trim();
  const rawClauses = clean
    .split(/\s*;\s*|\s*(?=\b\d{1,2}\s*[–-]\s*\d{1,2}s\b)/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (rawClauses.length === 0) {
    return Array.from({ length: shotCount }, () => clean);
  }
  return Array.from({ length: shotCount }, (_, idx) => {
    const mappedIdx = Math.min(
      rawClauses.length - 1,
      Math.floor((idx * rawClauses.length) / shotCount),
    );
    return rawClauses[mappedIdx] || clean;
  });
}

export function buildOneTakeChainShots(input: {
  prompt: string;
  durationSeconds: number;
  hasEndFrame: boolean;
}): Array<{
  id: string;
  prompt: string;
  length: number;
  steps: number;
  seed: string;
}> {
  const seconds = Math.max(5, Math.min(60, Math.round(Number(input.durationSeconds) || 6)));
  if (seconds <= 10) {
    return [
      {
        id: "clip_01",
        prompt: buildRef2VaClipPrompt({
          prompt: input.prompt,
          hasEndFrame: input.hasEndFrame,
        }),
        length: h3ValidFrameLength(seconds),
        steps: 6,
        seed: "0",
      },
    ];
  }

  const shotCount = Math.max(
    2,
    Math.min(10, Math.ceil(seconds / H3_CHAIN_SEGMENT_NET_SECONDS)),
  );
  const beatClauses = splitOneTakeBeatClauses(input.prompt, shotCount);

  return beatClauses.map((clause, index) => {
    const shotNumber = index + 1;
    const id = `clip_${String(shotNumber).padStart(2, "0")}`;
    const continuationNote =
      index === 0
        ? clause
        : `Continue seamlessly from the protected 39-frame audiovisual prefix with zero cut, reset, or camera jump. ${clause}`;
    return {
      id,
      prompt: buildRef2VaClipPrompt({
        prompt: continuationNote,
        hasEndFrame: index === shotCount - 1 && input.hasEndFrame,
      }),
      length: H3_CHAIN_SEGMENT_FRAMES,
      steps: 6,
      seed: String(index),
    };
  });
}

function buildRef2VaClipPrompt(input: {
  prompt: string;
  hasEndFrame: boolean;
}): string {
  const clean = input.prompt.replace(/\s+/g, " ").trim();
  const defs = [
    "<Picture 1> is the opening keyframe and subject/scene reference for [Shot 1], defining the exact starting composition, character appearance, outfit, lighting, and setting.",
  ];
  if (input.hasEndFrame) {
    defs.push(
      "<Picture 2> is the closing keyframe reference for [Shot 1], defining the target ending composition and pose.",
    );
  }
  const retention = [
    "<Picture 1>: fully_preserved - start directly from this frame and preserve subject identity, wardrobe, and environment.",
  ];
  if (input.hasEndFrame) {
    retention.push(
      "<Picture 2>: fully_preserved - transition smoothly into this closing composition by the end of the clip.",
    );
  }
  return [
    "subject_definitions:",
    ...defs,
    "",
    "summary:",
    "[keyframe completion + reference generation] Animate from <Picture 1>" +
      (input.hasEndFrame ? " to <Picture 2>" : "") +
      " following the shot action and camera movement.",
    "",
    "retention_analysis:",
    ...retention,
    "",
    "detailed_description:",
    `[Shot 1] ${clean}`,
    "",
    "overall_soundscape:",
    "Natural ambient soundscape and physical sound effects synchronized with the visible action.",
    "",
    "non_diegetic_music:",
    "N/A",
  ].join("\n");
}

async function uploadComfyImage(
  name: string,
  bytes: Buffer,
  fetchFn: typeof fetch,
): Promise<string> {
  const key = process.env.COMFY_API_KEY?.trim();
  const base = comfyBaseUrl();
  if (!base || (!key && !hasComfyEndpoint())) throw new Error("ComfyUI 尚未設定");
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }), name);
  form.append("type", "input");
  form.append("overwrite", "true");
  const res = await fetchFn(`${base}/upload/image`, {
    method: "POST",
    headers: key ? { Authorization: `Bearer ${key}` } : undefined,
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as { name?: string; error?: string };
  if (!res.ok || !body.name) {
    throw new Error(body.error || `ComfyUI 上傳失敗（HTTP ${res.status}）`);
  }
  return body.name;
}

export async function submitComfyStoryboardClipVideo(
  input: {
    prompt: string;
    aspectRatio: AspectRatio;
    durationSeconds: number;
    startImageUrl: string;
    endImageUrl?: string;
    skillSlug?: string;
  },
  options?: { fetch?: typeof fetch },
): Promise<ComfySubmitResult> {
  const fetchFn = options?.fetch ?? fetch;
  const runId = randomUUID().replace(/-/g, "").slice(0, 12);

  const fetchBuf = async (url: string) => {
    const r = await fetchFn(url);
    if (!r.ok) throw new Error(`無法下載分鏡圖（HTTP ${r.status}）`);
    return Buffer.from(await r.arrayBuffer());
  };

  const [startBuf, endBuf] = await Promise.all([
    fetchBuf(input.startImageUrl),
    input.endImageUrl && input.endImageUrl !== input.startImageUrl
      ? fetchBuf(input.endImageUrl)
      : Promise.resolve(null),
  ]);

  const [startName, endName] = await Promise.all([
    uploadComfyImage(`clip-start-${runId}.jpg`, startBuf, fetchFn),
    endBuf ? uploadComfyImage(`clip-end-${runId}.jpg`, endBuf, fetchFn) : Promise.resolve(null),
  ]);

  const graph = structuredClone(extendWorkflowJson) as unknown as ApiGraph;
  // Remove external video loader nodes (independent single-clip generation from reference images)
  for (const id of ["4", "5", "6", "27", "32"]) {
    delete graph[id];
  }
  delete graph["28"].inputs.external_context;
  delete graph["30"].inputs["ref_videos.ref_video_0"];
  delete graph["30"].inputs["ref_video_audios.ref_video_audio_0"];

  graph["2"].inputs.image = startName;
  graph["30"].inputs["ref_images.ref_image_0"] = ["2", 0];
  if (endName) {
    graph["3"].inputs.image = endName;
    graph["30"].inputs["ref_images.ref_image_1"] = ["3", 0];
  } else {
    delete graph["3"];
  }

  const shots =
    input.skillSlug === "one-take-director"
      ? buildOneTakeChainShots({
          prompt: input.prompt,
          durationSeconds: input.durationSeconds,
          hasEndFrame: Boolean(endName),
        })
      : [
          {
            id: "clip_01",
            prompt: buildRef2VaClipPrompt({
              prompt: input.prompt,
              hasEndFrame: Boolean(endName),
            }),
            length: h3ValidFrameLength(input.durationSeconds),
            steps: 6,
            seed: "0",
          },
        ];

  graph["25"].inputs.scene_continuity =
    shots.length > 1 ? "Hard picture + smooth audio" : "Independent scenes";
  const { width, height } = resolveH3ExtendDimensions(input.aspectRatio);

  graph["26"].inputs.width = width;
  graph["26"].inputs.height = height;
  graph["26"].inputs.run_name = `clip_${runId}`;
  graph["26"].inputs.plan_json = JSON.stringify(
    {
      shots,
    },
    null,
    2,
  );

  graph["67"].inputs.output_subfolder = "h3_oneclick_extend";
  graph["67"].inputs.filename = `clip_%date:yyyy-MM-dd%_${runId}`;

  const key = process.env.COMFY_API_KEY?.trim();
  const base = comfyBaseUrl();
  const res = await fetchFn(`${base}/prompt`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: graph }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    prompt_id?: string;
    error?: { message?: string };
  };
  if (!res.ok || !body.prompt_id) {
    throw new Error(body.error?.message || `ComfyUI 分鏡影片提交失敗（HTTP ${res.status}）`);
  }
  return {
    request_id: body.prompt_id,
    status_url: `comfy://prompt/${body.prompt_id}`,
    status: "processing",
  };
}
