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
import { submitVastServerlessWorkflow } from "@/service/comfy/vast-serverless";
import { formatCameraFirstVideoPrompt } from "@/service/director/camera-first-prompt";
import { OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL } from "@/service/openrouter/generate";

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
  // Route all non-talking-head video generation (realistic, doodle, paper-cutout, stickman, anime, story, one-take)
  // to Vast Serverless ComfyUI by default with no cloud fallback.
  return true;
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

export async function uploadComfyAsset(
  name: string,
  bytes: Buffer,
  fetchFn: typeof fetch,
  mime = "image/jpeg",
): Promise<string> {
  const key = process.env.COMFY_API_KEY?.trim();
  const base = comfyBaseUrl();
  if (!base || (!key && !hasComfyEndpoint())) throw new Error("ComfyUI 尚未設定");
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(bytes)], { type: mime }), name);
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

export const uploadComfyImage = uploadComfyAsset;

export function buildComfyRef2VaLatentGuideGraph(input: {
  runId: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  prompt: string;
  startName: string;
  endName?: string | null;
  charName?: string | null;
  sceneName?: string | null;
  videoName?: string | null;
  audioName?: string | null;
  skillSlug?: string;
}): ApiGraph {
  const { runId, startName, endName, charName, sceneName, videoName, audioName } = input;
  const graph = structuredClone(extendWorkflowJson) as unknown as ApiGraph;
  // Remove external video loader nodes (independent single-clip generation from reference images)
  delete graph["4"];
  delete graph["6"];
  delete graph["27"];
  delete graph["28"].inputs.external_context;

  if (videoName) {
    graph["5"].inputs.video = videoName;
    graph["30"].inputs["ref_videos.ref_video_0"] = ["32", 0];
  } else {
    delete graph["5"];
    delete graph["32"];
    delete graph["30"].inputs["ref_videos.ref_video_0"];
  }

  if (audioName) {
    graph["74"] = {
      class_type: "VHS_LoadAudio",
      inputs: { audio: audioName },
      _meta: { title: "Reference Audio" },
    };
    graph["30"].inputs["ref_video_audios.ref_video_audio_0"] = ["74", 0];
  } else {
    delete graph["74"];
    delete graph["30"].inputs["ref_video_audios.ref_video_audio_0"];
  }

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
    referenceVideoUrl?: string;
    referenceAudioUrl?: string;
    skillSlug?: string;
  },
  options?: { fetch?: typeof fetch },
): Promise<ComfySubmitResult> {
  // ref2va goes to Vast serverless. The GPU machine's COMFY_BASE_URL is not this path.
  if (!process.env.VAST_API_KEY?.trim()) {
    throw new Error("Vast serverless 尚未設定");
  }
  const fetchFn = options?.fetch ?? fetch;
  const runId = randomUUID().replace(/-/g, "").slice(0, 12);
  const same = (url?: string, ...others: Array<string | undefined>) => {
    const clean = url?.trim();
    if (!clean || others.some((item) => item?.trim() === clean)) return null;
    return clean;
  };
  const graph = buildComfyRef2VaLatentGuideGraph({
    runId,
    aspectRatio: input.aspectRatio,
    durationSeconds: input.durationSeconds,
    prompt: input.prompt,
    startName: input.startImageUrl,
    endName: same(input.endImageUrl, input.startImageUrl),
    charName: same(input.characterImageUrl, input.startImageUrl),
    sceneName: same(input.sceneImageUrl, input.startImageUrl, input.characterImageUrl),
    videoName: input.referenceVideoUrl?.trim() || null,
    audioName: input.referenceAudioUrl?.trim() || null,
    skillSlug: input.skillSlug,
  });
  return submitVastServerlessWorkflow(graph, fetchFn);
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
  // styleDescription stays off this graph. The clean look tells the model to fill every strip,
  // and restating it here paints a second copy on top of the guide frame.
  // H3 paints 2.5–6s. Load that same span so the guide frame and the source frames stay aligned.
  const seconds = Math.min(6, Math.max(2.5, input.section.length));
  const graph = buildObjectGraph({
    runId: input.runId,
    videoName: input.videoName,
    imageName: input.paintedStartFrameName,
    section: { start: input.section.start, length: seconds },
    mode: "add",
    target: "text",
    changeTo: `single on-screen lettering of "${cleanText}" already painted in the guide, each word once, no second copy, no extra strip`,
    action:
      "stays razor-sharp and exactly as painted in the guide, with no second copy of any word, while all faces and surrounding action remain untouched",
    biggestOnly: false,
    keepOutline: false,
    margin: "normal",
    motion: 768,
    seed: 0,
    clipSeconds: seconds,
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
