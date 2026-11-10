import { randomUUID } from "node:crypto";
import type { AspectRatio, VideoQualityTier } from "@/model/project";
import {
  comfyBaseUrl,
  hasComfyEndpoint,
  type ComfySubmitResult,
} from "@/service/comfy/openjutsu-client";
import {
  buildObjectGraph,
  resolveH3ExtendDimensions,
  type ApiGraph,
} from "@/service/comfy/openjutsu-graph";
import { ensureMp4HasAudioStream } from "@/service/comfy/ensure-audio";
import extendWorkflowJson from "@/service/comfy/workflows/extend.api.json";
import { formatCameraFirstVideoPrompt } from "@/service/director/camera-first-prompt";
import {
  OPENROUTER_HAILUO_3_VIDEO_MODEL,
  OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
} from "@/service/openrouter/generate";

export function shouldUseComfyForClipVideo(input: {
  model: string;
  audioUrl?: string;
  skillSlug?: string;
  durationSeconds?: number;
  videoQualityTier?: VideoQualityTier;
}): boolean {
  if (!hasComfyEndpoint()) return false;
  if (process.env.COMFY_CLIP_VIDEO_ENABLED?.trim() === "false") return false;
  if (input.audioUrl?.trim()) return false;
  if (input.model === OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL) return false;
  if (input.skillSlug === "talking-head-director") return false;
  if (input.skillSlug === "one-take-director") return true;
  if (input.videoQualityTier === "economy") return true;
  // Route all MiniMax H3 (`minimax/hailuo-3`) video generation to Vast Serverless ComfyUI by default
  if (input.model === OPENROUTER_HAILUO_3_VIDEO_MODEL) return true;
  return process.env.COMFY_CLIP_VIDEO_ENABLED?.trim() === "true";
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
  hasCharacterImage?: boolean;
  hasSceneImage?: boolean;
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
          hasCharacterImage: input.hasCharacterImage,
          hasSceneImage: input.hasSceneImage,
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
        hasCharacterImage: input.hasCharacterImage,
        hasSceneImage: input.hasSceneImage,
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
  hasCharacterImage?: boolean;
  hasSceneImage?: boolean;
}): string {
  const clean = formatCameraFirstVideoPrompt({
    prompt: input.prompt.replace(/\s+/g, " ").trim(),
  });
  const defs = [
    "<Picture 1> is the opening keyframe and subject/scene reference for [Shot 1], defining the exact starting composition, character appearance, outfit, lighting, and setting.",
  ];
  const retention = [
    "<Picture 1>: fully_preserved - start directly from this frame and preserve subject identity, wardrobe, and environment.",
  ];
  let nextPic = 2;
  if (input.hasEndFrame) {
    defs.push(
      `<Picture ${nextPic}> is the closing keyframe reference for [Shot 1], defining the target ending composition and pose.`,
    );
    retention.push(
      `<Picture ${nextPic}>: fully_preserved - transition smoothly into this closing composition by the end of the clip.`,
    );
    nextPic++;
  }
  if (input.hasCharacterImage) {
    defs.push(
      `<Picture ${nextPic}> is the Character Identity & Wardrobe Blueprint, locking the character's exact facial features, hairstyle, proportions, and clothing across the entire clip.`,
    );
    retention.push(
      `<Picture ${nextPic}>: fully_preserved - strictly preserve the character's face identity, hair, and outfit without any facial drift.`,
    );
    nextPic++;
  }
  if (input.hasSceneImage) {
    defs.push(
      `<Picture ${nextPic}> is the Environment & Background Scene Reference, locking the surrounding architecture, lighting palette, and atmosphere.`,
    );
    retention.push(
      `<Picture ${nextPic}>: style_and_environment_locked - maintain consistent background geometry, lighting, and colour palette.`,
    );
    nextPic++;
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

export function buildComfyRef2VaLatentGuideGraph(input: {
  runId: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  prompt: string;
  startName: string;
  endName?: string | null;
  charName?: string | null;
  sceneName?: string | null;
  skillSlug?: string;
}): ApiGraph {
  const { runId, startName, endName, charName, sceneName } = input;
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
  let nextRefSlot = 1;
  if (endName) {
    graph["3"].inputs.image = endName;
    graph["30"].inputs[`ref_images.ref_image_${nextRefSlot}`] = ["3", 0];
    nextRefSlot++;
  } else {
    delete graph["3"];
  }
  if (charName) {
    graph["70"] = {
      class_type: "LoadImage",
      inputs: { image: charName },
    };
    graph["30"].inputs[`ref_images.ref_image_${nextRefSlot}`] = ["70", 0];
    nextRefSlot++;
  }
  if (sceneName) {
    graph["71"] = {
      class_type: "LoadImage",
      inputs: { image: sceneName },
    };
    graph["30"].inputs[`ref_images.ref_image_${nextRefSlot}`] = ["71", 0];
    nextRefSlot++;
  }

  // Anchor first_frame (startName) into target latent at frame_idx = 0 via MiniMaxH3AddGuide
  graph["72"] = {
    class_type: "MiniMaxH3AddGuide",
    inputs: {
      positive: ["30", 0],
      latent: ["30", 1],
      vae: ["20", 0],
      image: ["2", 0],
      frame_idx: 0,
    },
    _meta: { title: "First Frame Latent Guide (frame_idx=0)" },
  };

  if (endName) {
    // Anchor last_frame (endName) into target latent at frame_idx = -1 via MiniMaxH3AddGuide
    graph["73"] = {
      class_type: "MiniMaxH3AddGuide",
      inputs: {
        positive: ["72", 0],
        latent: ["30", 1],
        vae: ["20", 0],
        image: ["3", 0],
        frame_idx: -1,
      },
      _meta: { title: "Last Frame Latent Guide (frame_idx=-1)" },
    };
    graph["57"].inputs.conditioning = ["73", 0];
  } else {
    graph["57"].inputs.conditioning = ["72", 0];
  }

  const shots =
    input.skillSlug === "one-take-director"
      ? buildOneTakeChainShots({
          prompt: input.prompt,
          durationSeconds: input.durationSeconds,
          hasEndFrame: Boolean(endName),
          hasCharacterImage: Boolean(charName),
          hasSceneImage: Boolean(sceneName),
        })
      : [
          {
            id: "clip_01",
            prompt: buildRef2VaClipPrompt({
              prompt: input.prompt,
              hasEndFrame: Boolean(endName),
              hasCharacterImage: Boolean(charName),
              hasSceneImage: Boolean(sceneName),
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
  return graph;
}

export async function submitComfyStoryboardClipVideo(
  input: {
    prompt: string;
    aspectRatio: AspectRatio;
    durationSeconds: number;
    startImageUrl: string;
    endImageUrl?: string;
    characterImageUrl?: string;
    sceneImageUrl?: string;
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

  const [startBuf, endBuf, charBuf, sceneBuf] = await Promise.all([
    fetchBuf(input.startImageUrl),
    input.endImageUrl && input.endImageUrl !== input.startImageUrl
      ? fetchBuf(input.endImageUrl)
      : Promise.resolve(null),
    input.characterImageUrl && input.characterImageUrl !== input.startImageUrl
      ? fetchBuf(input.characterImageUrl).catch(() => null)
      : Promise.resolve(null),
    input.sceneImageUrl &&
    input.sceneImageUrl !== input.startImageUrl &&
    input.sceneImageUrl !== input.characterImageUrl
      ? fetchBuf(input.sceneImageUrl).catch(() => null)
      : Promise.resolve(null),
  ]);

  const [startName, endName, charName, sceneName] = await Promise.all([
    uploadComfyImage(`clip-start-${runId}.jpg`, startBuf, fetchFn),
    endBuf ? uploadComfyImage(`clip-end-${runId}.jpg`, endBuf, fetchFn) : Promise.resolve(null),
    charBuf ? uploadComfyImage(`clip-char-${runId}.jpg`, charBuf, fetchFn) : Promise.resolve(null),
    sceneBuf ? uploadComfyImage(`clip-scene-${runId}.jpg`, sceneBuf, fetchFn) : Promise.resolve(null),
  ]);

  const graph = buildComfyRef2VaLatentGuideGraph({
    runId,
    aspectRatio: input.aspectRatio,
    durationSeconds: input.durationSeconds,
    prompt: input.prompt,
    startName,
    endName,
    charName,
    sceneName,
    skillSlug: input.skillSlug,
  });

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

export function buildComfyMaskedTextInpaintGraph(input: {
  runId: string;
  videoName: string;
  paintedStartFrameName: string;
  section: { start: number; length: number };
  boxNormalized: { x: number; y: number; width: number; height: number };
  text: string;
  styleDescription: string;
}): ApiGraph {
  const cleanText = input.text.replace(/\s+/g, " ").trim();
  const cleanStyle = input.styleDescription.replace(/\s+/g, " ").trim();
  const graph = buildObjectGraph({
    runId: input.runId,
    videoName: input.videoName,
    imageName: input.paintedStartFrameName,
    section: input.section,
    mode: "add",
    target: "text",
    changeTo: `on-screen artistic graphic lettering "${cleanText}" (${cleanStyle})`,
    action:
      "stays razor-sharp, legible, and naturally integrated into the scene lighting and depth while all faces and surrounding action remain untouched",
    biggestOnly: false,
    keepOutline: false,
    margin: "normal",
    motion: 768,
    seed: 0,
    clipSeconds: Math.min(6, Math.max(2.5, input.section.length)),
    placement: [
      {
        frame: 0,
        x: input.boxNormalized.x,
        y: input.boxNormalized.y,
        width: input.boxNormalized.width,
        height: input.boxNormalized.height,
      },
    ],
  });

  // Anchor the Seedream-painted start frame at frame_idx = 0 so the exact typography is locked into the latent
  graph.scro_first_frame_guide = {
    class_type: "MiniMaxH3AddGuide",
    inputs: {
      positive: ["24", 0],
      latent: ["24", 1],
      vae: ["14", 0],
      image: ["2", 0],
      frame_idx: 0,
    },
    _meta: { title: "First Frame Painted Text Latent Guide (frame_idx=0)" },
  };
  if (graph["45"]?.inputs) {
    graph["45"].inputs.conditioning = ["scro_first_frame_guide", 0];
  }

  return graph;
}

export async function submitComfyMaskedTextInpaintVideo(
  input: {
    videoBuffer: Buffer;
    paintedStartFrameBuffer: Buffer;
    section: { start: number; length: number };
    boxNormalized: { x: number; y: number; width: number; height: number };
    text: string;
    styleDescription: string;
  },
  options?: { fetch?: typeof fetch },
): Promise<ComfySubmitResult> {
  const fetchFn = options?.fetch ?? fetch;
  const runId = randomUUID().replace(/-/g, "").slice(0, 12);
  const videoWithAudio = await ensureMp4HasAudioStream(input.videoBuffer);

  const [videoName, paintedStartFrameName] = await Promise.all([
    uploadComfyImage(`text-inpaint-vid-${runId}.mp4`, videoWithAudio, fetchFn),
    uploadComfyImage(`text-inpaint-start-${runId}.jpg`, input.paintedStartFrameBuffer, fetchFn),
  ]);

  const graph = buildComfyMaskedTextInpaintGraph({
    runId,
    videoName,
    paintedStartFrameName,
    section: input.section,
    boxNormalized: input.boxNormalized,
    text: input.text,
    styleDescription: input.styleDescription,
  });

  const key = process.env.COMFY_API_KEY?.trim();
  const base = comfyBaseUrl();
  const res = await fetchFn(`${base}/prompt`, {
    method: "POST",
    headers: {
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: graph }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    prompt_id?: string;
    error?: { message?: string };
  };
  if (!res.ok || !body.prompt_id) {
    throw new Error(
      body.error?.message || `ComfyUI Masked Text Inpaint 提交失敗（HTTP ${res.status}）`,
    );
  }
  return {
    request_id: body.prompt_id,
    status_url: `comfy://prompt/${body.prompt_id}`,
    status: "processing",
  };
}
