import type { AspectRatio } from "@/model/project";
import simpleWorkflowJson from "./workflows/simple.api.json";
import objectWorkflowJson from "./workflows/object.api.json";
import extendWorkflowJson from "./workflows/extend.api.json";
import advancedWorkflowJson from "./workflows/advanced.api.json";
import advancedMaxqWorkflowJson from "./workflows/advanced_maxq.api.json";
import montageWorkflowJson from "./workflows/montage.api.json";

// OpenJutsu graph edits, kept in step with experiments/openjutsu/lib/{simple,object,model}.ts.
// Swap submits workflows/simple.api.json. Teleport and background object edits submit workflows/object.api.json.

export type ApiNode = {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: { title?: string };
};
export type ApiGraph = Record<string, ApiNode>;

export const OPENJUTSU_RESOLUTION = "736p";
export const OPENJUTSU_MOTION = 768;
export const OPENJUTSU_CLIP_SECONDS = 6;

const DEFAULT_MODEL = {
  model: "minimax_h3_ref2va_pruned_int8_convrot.safetensors",
  lora: "minimax_h3_DMAD_4step_full_lora_avg_rank_39_bf16.safetensors",
  textEncoder: "qwen3vl_32b_minimax_h3_int4_convrot.safetensors",
  describer: "qwen3vl_8b_int8_convrot.safetensors",
  videoVae: "minimax_h3_video_vae_int8_convrot.safetensors",
  audioVae: "minimax_h3_audio_vae_fp32.safetensors",
  steps: 8,
};

const SIMPLE_MARGINS = { tight: 20, normal: 40, loose: 60 } as const;
const OBJECT_MARGINS = { tight: 10, normal: 20, loose: 40 } as const;
export type OpenJutsuMargin = keyof typeof SIMPLE_MARGINS;

const SIMPLE_NODES = {
  picture: "2",
  describePicture: "4",
  video: "5",
  plan: "11",
  target: "24",
  referenceConditioning: "30",
  peopleMask: "39",
  mannequinMask: "40",
  mannequin: "41",
  growMask: "42",
  shotDescriber: "44",
  fillShots: "45",
  hat: ["47", "48", "49", "50", "51", "52"],
};

const SIMPLE_DESCRIBE_PICTURE_PROMPT =
  "Describe the person in this picture for a casting sheet, in one sentence of about 50 words: apparent age and gender, face shape, eye and nose shape, glasses, hair, facial hair, skin tone, build, and their complete outfit including exact garment colors, neckline, footwear, and accessories. No preamble, no background.";

// Strip source-person clothing, bags, earphones, and hair descriptions that Node 44 (Qwen3-VL on unmasked source frames)
// may mention and that H3FillShots's built-in ACCESSORIES regex misses.
const SIMPLE_CLEAN_SHOTS_REGEX =
  "(?:,?\\s*\\b(?:with|in|wearing|dressed in|sporting)\\s+|\\s+and\\s+)?(?:(?:a|an|the|her|his|their)\\s+)?(?:(?!with\\b|in\\b|and\\b)[\\w-]+\\s+){0,3}?(?:crop\\s+top|tank\\s+top|tube\\s+top|halter\\s+top|camisole|sports\\s+bra|bra|top|shoulder\\s+bag|crossbody\\s+bag|handbag|tote\\s+bag|bag|purse|backpack|earphones?|earbuds?|headphones?|headset|lanyard|hair(?:style|cut)?|bangs|fringe|ponytail|braids?|pigtails?|bun|locks|tresses|strands?)(?:\\s+(?:slung|dangling|hanging|falling|flowing|cascading|draped|worn|loose|down)(?:\\s+down|\\s+forward|\\s+loosely)?(?:\\s+(?:from|over|across|around|past|below)\\s+(?:their|her|his|the)\\s+[\\w\\s]+?)?(?=[,.;]|\\s+and\\b|$))?";

const MUTE = /^Mute the (clip|reference) audio H3 hears$/;
// Keep SAM face-tracking nodes (69: SAM: faces, 70: SAM 3.1 track faces, 71: Faces (shown on the mannequin))
// connected to H3GreyMannequins at all times so H3 always sees where the head/face is oriented inside the silhouette.
const NO_LIP_SYNC = /^(No lip-sync in the prompt)$/;

const FULL_BODY_SHOT_MOTION_INSTRUCTION =
  "Describe the complete chronological progression of each subject's full-body movement from the start to the end of each shot, explicitly naming any running, jumping, mid-air spinning, flipping, inverted or horizontal body orientation, kicks, turns, and landing.";

type Section = { start: number; length: number };

export type SimpleGraphInput = {
  videoName: string;
  imageName: string;
  section: Section;
  role: string;
  target: string;
  outfitSpec?: string;
  hatFix: boolean;
  noLipSync: boolean;
  margin: OpenJutsuMargin;
  motion: 512 | 768 | 1376;
  seed: number;
  clipSeconds: number;
  runId: string;
};

export type PlacementKeyframe = {
  frame: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ObjectGraphInput = {
  videoName: string;
  imageName: string | null;
  section: Section;
  mode: "change" | "remove" | "background" | "add";
  target: string;
  changeTo: string;
  biggestOnly: boolean;
  keepOutline: boolean;
  margin: OpenJutsuMargin;
  motion: 512 | 768 | 1376;
  seed: number;
  clipSeconds: number;
  runId: string;
  placement?: PlacementKeyframe[];
  action?: string;
};

export type AdvancedGraphInput = {
  videoName: string;
  imageNames: string[];
  roles: string[];
  section: Section;
  hatFix: boolean;
  noLipSync: boolean;
  margin: OpenJutsuMargin;
  motion: 512 | 768 | 1376;
  seed: number;
  clipSeconds: number;
  runId: string;
  maxQuality?: boolean;
};

export type MontageGraphInput = {
  videoName: string;
  imageNames: string[];
  roles: string[];
  section: Section;
  hatFix: boolean;
  noLipSync: boolean;
  margin: OpenJutsuMargin;
  motion: 512 | 768 | 1376;
  seed: number;
  clipSeconds: number;
  runId: string;
};

export type ExtendGraphInput = {
  videoName: string;
  clipDurationSeconds: number;
  extensionPrompt: string;
  characterImageName?: string | null;
  sceneImageName?: string | null;
  propImageName?: string | null;
  aspectRatio: AspectRatio;
  seed: number;
  runId: string;
};

export function resolveH3ExtendDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
  if (aspectRatio === "16:9") return { width: 1312, height: 736 };
  if (aspectRatio === "1:1") return { width: 736, height: 736 };
  return { width: 736, height: 1312 };
}

export function buildH3ExtendPrompt(input: {
  extensionPrompt: string;
  hasCharacterImage: boolean;
  hasSceneImage: boolean;
  hasPropImage: boolean;
  refVideoSeconds: number;
}): string {
  const cleanPrompt = input.extensionPrompt.replace(/\s+/g, " ").trim();
  const refSeconds = Math.max(2, Math.min(6, Number(input.refVideoSeconds) || 6));

  let picIndex = 1;
  const charPic = input.hasCharacterImage ? `<Picture ${picIndex++}>` : null;
  const scenePic = input.hasSceneImage ? `<Picture ${picIndex++}>` : null;
  const propPic = input.hasPropImage ? `<Picture ${picIndex++}>` : null;

  const subjectDefs: string[] = [];
  if (charPic) {
    subjectDefs.push(
      `${charPic} is the identity and outfit reference for <Subject 1>, defining the exact facial features, hair, skin tone, build, and complete wardrobe.`,
      `<Subject 1> is the same main subject continuing from the protected audiovisual prefix and <Video 1>, stabilized by ${charPic}.`,
    );
  } else {
    subjectDefs.push(
      `<Subject 1> is the main subject continuing directly from the protected audiovisual prefix and <Video 1>.`,
    );
  }
  if (scenePic) {
    subjectDefs.push(
      `${scenePic} is the setting and environment reference, defining the surrounding architecture, background geometry, palette, and lighting.`,
    );
  }
  if (propPic) {
    subjectDefs.push(
      `${propPic} is the prop and product reference, defining the exact shape, materials, colors, and surface details of the featured object.`,
    );
  }
  subjectDefs.push(
    `<Video 1> is the preceding ${refSeconds.toFixed(1)}-second video clip at 24 fps, supplying camera movement, motion rhythm, lighting continuity, and performance context.`,
  );

  const retentionLines: string[] = [
    `<Subject 1> (appears in [Shot 1]): fully_preserved - retain exact facial identity, hair, proportions, and complete outfit across the continuation.`,
  ];
  if (charPic) {
    retentionLines.push(
      `${charPic}: fully_preserved - retain facial identity and wardrobe details without pulling the moving subject back to the static reference pose; the incoming protected 39-frame latent prefix controls current pose, motion phase, and camera framing.`,
    );
  }
  if (scenePic) {
    retentionLines.push(
      `${scenePic}: fully_preserved - retain setting geometry, lighting, and atmosphere without resetting the camera viewpoint or pulling the moving subject back to the static frame.`,
    );
  }
  if (propPic) {
    retentionLines.push(
      `${propPic}: fully_preserved - retain exact prop/product shape, packaging, colors, and details whenever visible, without pulling the moving subject back to the static reference pose.`,
    );
  }
  retentionLines.push(
    `<Video 1>: partially_preserved - continue seamlessly from its final 39-frame protected latent prefix while executing the new action.`,
  );

  return [
    "subject_definitions:",
    ...subjectDefs,
    "",
    "summary:",
    "[video continuation + reference generation] The target video continues directly from the protected 39-frame audiovisual prefix of <Video 1> as one uninterrupted shot, following the continuation prompt while locking identity, setting, and prop details from the reference media.",
    "",
    "retention_analysis:",
    ...retentionLines,
    "",
    "detailed_description:",
    `[Shot 1] Continue immediately from the protected ending of the incoming footage with no cut, reset, repeated action, or camera jump. ${cleanPrompt}`,
    "",
    "overall_soundscape:",
    "Continue the ambient soundscape and natural physical sound effects seamlessly from the protected audio prefix, synchronized with the visible actions.",
    "",
    "non_diegetic_music:",
    "N/A",
  ].join("\n");
}

function isLink(value: unknown): value is [string, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  );
}

function nodeByTitle(graph: ApiGraph, title: string) {
  const ids = Object.keys(graph).filter((id) => graph[id]._meta?.title === title);
  if (ids.length !== 1) {
    throw new Error(`Expected one "${title}" node in the workflow, found ${ids.length}.`);
  }
  return ids[0];
}

function loadGraph(
  kind: "simple" | "object" | "extend" | "advanced" | "advanced_maxq" | "montage",
): ApiGraph {
  const source =
    kind === "simple"
      ? simpleWorkflowJson
      : kind === "object"
        ? objectWorkflowJson
        : kind === "advanced"
          ? advancedWorkflowJson
          : kind === "advanced_maxq"
            ? advancedMaxqWorkflowJson
            : kind === "montage"
              ? montageWorkflowJson
              : extendWorkflowJson;
  return structuredClone(source) as unknown as ApiGraph;
}

// VHS errors if a node reads a soundtrack the file does not have. Feed silence instead.
function silenceWhenSoundless(graph: ApiGraph) {
  for (const id of Object.keys(graph).filter((nodeId) => graph[nodeId].class_type === "VHS_LoadVideo")) {
    const soundtrack = `${id}_soundtrack`;
    let read = false;
    for (const node of Object.values(graph)) {
      for (const [name, value] of Object.entries(node.inputs)) {
        if (isLink(value) && value[0] === id && value[1] === 2) {
          node.inputs[name] = [soundtrack, 0];
          read = true;
        }
      }
    }
    if (read) {
      graph[soundtrack] = {
        class_type: "H3SoundtrackOrSilence",
        inputs: { audio: [id, 2], video_info: [id, 3] },
        _meta: { title: "Soundtrack (silence if none)" },
      };
    }
  }
}

function dropNoLipSync(graph: ApiGraph) {
  const through = new Map<string, unknown>();
  for (const [id, node] of Object.entries(graph)) {
    const title = node._meta?.title ?? "";
    if (MUTE.test(title)) through.set(id, node.inputs.audio);
    else if (NO_LIP_SYNC.test(title)) through.set(id, undefined);
  }
  for (const id of through.keys()) delete graph[id];
  for (const [id, node] of Object.entries(graph)) {
    for (const [name, value] of Object.entries(node.inputs)) {
      if (!isLink(value) || !through.has(value[0])) continue;
      if (through.get(value[0])) node.inputs[name] = through.get(value[0]);
      else if (["no_lip_sync", "faces", "face_size"].includes(name)) delete node.inputs[name];
      else throw new Error(`Node ${id}.${name} still links to removed node ${value[0]}.`);
    }
  }
}

function setMotionSize(graph: ApiGraph, size: 512 | 768 | 1376) {
  const nodes = Object.values(graph).filter(
    (node) =>
      node.class_type === "ImageScaleToMaxDimension" &&
      /motion reference/i.test(node._meta?.title ?? ""),
  );
  if (!nodes.length) throw new Error("Expected a motion reference resize in the workflow.");
  for (const node of nodes) node.inputs.largest_size = size;
}

function setSection(graph: ApiGraph, video: string, section: Section) {
  graph[video].inputs.skip_first_frames = Math.round(section.start * 24);
  graph[video].inputs.frame_load_cap = Math.round(section.length * 24);
}

function applyDefaultModel(graph: ApiGraph) {
  graph[nodeByTitle(graph, "Describer: Qwen3-VL 8B")].inputs.clip_name = DEFAULT_MODEL.describer;
  graph[nodeByTitle(graph, "H3 Text Encoder")].inputs.clip_name = DEFAULT_MODEL.textEncoder;
  graph[nodeByTitle(graph, "Video VAE")].inputs.vae_name = DEFAULT_MODEL.videoVae;
  graph[nodeByTitle(graph, "Audio VAE")].inputs.vae_name = DEFAULT_MODEL.audioVae;
  graph[nodeByTitle(graph, "H3 Diffusion Model")].inputs.unet_name = DEFAULT_MODEL.model;
  const plans = Object.values(graph).filter((node) =>
    ["H3OneClickSwapPlan", "H3AdvancedSwapPlan", "H3ObjectSwapPlan", "H3MontagePlan"].includes(
      node.class_type,
    ),
  );
  if (plans.length !== 1) {
    throw new Error(`Expected one Swap Plan node in the workflow, found ${plans.length}.`);
  }
  plans[0].inputs.steps = DEFAULT_MODEL.steps;
  const lora = nodeByTitle(graph, "DMAD LoRA");
  graph[lora].inputs.lora_name = DEFAULT_MODEL.lora;
  graph[lora].inputs.strength_model = 1;
}

// Each Scro job gets its own chain folder so a second render does not resume the first job's clips.
function uniquifyRunName(graph: ApiGraph, runId: string) {
  const planTypes = new Set([
    "H3OneClickSwapPlan",
    "H3AdvancedSwapPlan",
    "H3ObjectSwapPlan",
    "H3MontagePlan",
  ]);
  let source: [string, number] | null = null;
  for (const node of Object.values(graph)) {
    for (const value of Object.values(node.inputs)) {
      if (!isLink(value) || value[1] !== 3) continue;
      if (planTypes.has(graph[value[0]]?.class_type ?? "")) source = [value[0], value[1]];
    }
  }
  if (!source) throw new Error("Swap Plan did not publish a run name.");
  const id = "scro_run_name";
  graph[id] = {
    class_type: "StringConcatenate",
    inputs: { string_a: source, string_b: `_${runId}`, delimiter: "" },
    _meta: { title: "Scro run name" },
  };
  for (const [nodeId, node] of Object.entries(graph)) {
    if (nodeId === id) continue;
    for (const [name, value] of Object.entries(node.inputs)) {
      if (isLink(value) && value[0] === source[0] && value[1] === source[1]) {
        node.inputs[name] = [id, 0];
      }
    }
  }
  // The assembled copy name is only a date. A second job the same day would overwrite the file.
  for (const node of Object.values(graph)) {
    if (node.class_type !== "MiniMaxH3ChainAssemble") continue;
    const filename = node.inputs.filename;
    if (typeof filename === "string" && !filename.endsWith(`_${runId}`)) {
      node.inputs.filename = `${filename}_${runId}`;
    }
  }
}

function objectTargets(target: string) {
  return target.split(",").map((part) => part.trim()).filter(Boolean);
}

function addedObject(changeTo: string) {
  return changeTo.replace(/^(?:add|insert|put)\s+/i, "").trim();
}

function describerPrompt(input: ObjectGraphInput) {
  const background = input.mode === "background";
  const things = background
    ? ["place (the setting, its lighting and what is around)"]
    : input.mode === "add"
      ? [addedObject(input.changeTo).replace(/^(?:a|an|the)\s+/i, "") || "main object"]
      : objectTargets(input.target);
  const named =
    things.length === 1 ? things[0] : `${things.slice(0, -1).join(", ")} and the ${things.at(-1)}`;
  const words = 30 + 20 * things.length;
  return {
    prompt:
      `Describe the ${named} in this picture in about ${words} words${things.length > 1 ? ", one sentence for each" : ""}: their shape, colours, ` +
      "materials, patterns and details. " +
      (background || input.mode === "add"
        ? ""
        : "Include every layer worn there, outer layer first: an open shirt or jacket over a top is part of the top. ") +
      "No preamble, and nothing about anything else in the picture.",
    max_length: 2 * words + 40,
  };
}

export function buildSimpleGraph(input: SimpleGraphInput): ApiGraph {
  const graph = loadGraph("simple");
  silenceWhenSoundless(graph);
  graph[SIMPLE_NODES.describePicture].inputs.prompt = SIMPLE_DESCRIBE_PICTURE_PROMPT;
  graph[SIMPLE_NODES.describePicture].inputs.max_length = 150;
  // Keep OpenJutsu's native "match" (736p) so a static upright reference portrait does not overpower the grey mannequin's dynamic body orientation.
  graph[SIMPLE_NODES.referenceConditioning].inputs.ref_image_size = "match";
  graph[SIMPLE_NODES.target].inputs.text = input.target;
  graph[SIMPLE_NODES.growMask].inputs.expand = SIMPLE_MARGINS[input.margin];
  if (!input.hatFix) {
    for (const id of SIMPLE_NODES.hat) delete graph[id];
    graph[SIMPLE_NODES.growMask].inputs.mask = [SIMPLE_NODES.peopleMask, 0];
  }
  if (!input.noLipSync) dropNoLipSync(graph);
  setMotionSize(graph, input.motion);

  // Enhance H3ClipShots (Node 43) shot_prompt so Qwen3-VL (Node 44) describes full chronological body motion & orientation changes.
  graph.scro_shot_prompt = {
    class_type: "StringConcatenate",
    inputs: {
      string_a: [SIMPLE_NODES.plan, 4],
      string_b: FULL_BODY_SHOT_MOTION_INSTRUCTION,
      delimiter: " ",
    },
    _meta: { title: "Enhance shot describer with full-body motion rules" },
  };
  graph["43"].inputs.shot_prompt = ["scro_shot_prompt", 0];

  // Scrub source-person tops, bags, and earphones from Node 44's shot list before H3FillShots (Node 45).
  graph.scro_clean_shots = {
    class_type: "RegexReplace",
    inputs: {
      string: [SIMPLE_NODES.shotDescriber, 0],
      regex_pattern: SIMPLE_CLEAN_SHOTS_REGEX,
      replace: "",
      case_insensitive: true,
      multiline: true,
      dotall: false,
      count: 0,
    },
    _meta: { title: "Strip source outfit/bags/earphones from shots" },
  };
  graph[SIMPLE_NODES.fillShots].inputs.shots = ["scro_clean_shots", 0];

  const plan = graph[SIMPLE_NODES.plan].inputs;
  const cleanOutfitSpec = input.outfitSpec?.replace(/\s+/g, " ").trim().replace(/\.+$/, "");
  if (cleanOutfitSpec) {
    graph.scro_picture_1_text = {
      class_type: "StringConcatenate",
      inputs: {
        string_a: [SIMPLE_NODES.describePicture, 0],
        string_b: `Complete outfit worn by <Subject 1> from <Picture 1>: ${cleanOutfitSpec} (keep the exact solid garment colors, neckline, and fabric from <Picture 1> across the entire body; completely replace the source person's clothing, bags, and earphones).`,
        delimiter: " ",
      },
      _meta: { title: "Lock character outfit spec" },
    };
    plan.picture_1_text = ["scro_picture_1_text", 0];
  }
  plan.resolution = OPENJUTSU_RESOLUTION;
  plan.seed = input.seed;
  plan.clip_seconds = input.clipSeconds;
  plan.roles = input.role.replace(/\s+/g, " ").trim();
  applyDefaultModel(graph);
  uniquifyRunName(graph, input.runId);
  setSection(graph, SIMPLE_NODES.video, input.section);
  graph[SIMPLE_NODES.video].inputs.video = input.videoName;
  graph[SIMPLE_NODES.picture].inputs.image = input.imageName;
  return graph;
}

export function buildObjectGraph(input: ObjectGraphInput): ApiGraph {
  const graph = loadGraph("object");
  silenceWhenSoundless(graph);
  const id = (title: string) => nodeByTitle(graph, title);
  const picture = Boolean(input.imageName) && input.mode !== "remove";
  const plan = graph[id("Object Swap Plan (what to change)")].inputs;
  const ref = graph[id("Reference Conditioning")].inputs;
  const grow = graph[id("Grow mask")].inputs;
  const grey = graph[id("Turn it grey (shape and movement only)")].inputs;

  if (picture) Object.assign(graph[id("Describe picture 1")].inputs, describerPrompt(input));
  if (!picture) {
    for (const title of ["Picture 1", "Shrink for the describer", "Describe picture 1"]) {
      delete graph[id(title)];
    }
    delete plan.picture_1;
    delete plan.picture_1_text;
    delete ref["ref_images.ref_image_0"];
  }
  if (
    input.mode === "remove" ||
    input.mode === "add" ||
    (input.mode === "change" && !input.keepOutline)
  ) {
    delete ref["ref_videos.ref_video_0"];
    delete ref["ref_video_audios.ref_video_audio_0"];
  }
  if (input.mode === "background") {
    grow.flip_input = true;
    grey.mask = [id("Grow mask"), 0];
    grey.size = [id("Grow mask"), 0];
  }
  grow.expand = OBJECT_MARGINS[input.margin];
  setMotionSize(graph, input.motion);
  const most = input.biggestOnly ? objectTargets(input.target).length : 0;
  for (const title of ["Tracked area", "Tracked area, tight (for the grey shape)"]) {
    graph[id(title)].inputs.max_people = most;
  }
  graph[id("SAM: what to change")].inputs.text = input.target;
  Object.assign(plan, {
    mode: input.mode,
    target: input.target,
    change_to: input.changeTo,
    keep_outline: input.keepOutline,
    seed: input.seed,
    clip_seconds: input.clipSeconds,
    resolution: OPENJUTSU_RESOLUTION,
  });

  if (input.mode === "add") {
    const placementPoints =
      input.placement && input.placement.length > 0
        ? input.placement
        : [{ frame: 0, x: 0.25, y: 0.25, width: 0.5, height: 0.5 }];
    const placement = JSON.stringify(placementPoints);
    plan.placement = placement;
    plan.change_to = addedObject(input.changeTo);
    plan.keep_outline = false;
    plan.action = input.action ?? "";
    const drop = [
      "SAM frames for this clip",
      "Tracked area",
      "Tracked area, tight (for the grey shape)",
      "Turn it grey (shape and movement only)",
      "SAM 3.1",
      "SAM: what to change",
      "SAM video (1008 px, SAM's own size)",
      "SAM 3.1 track it",
    ];
    graph.object_placement = {
      class_type: "H3ObjectPlacementMask",
      inputs: {
        images: [id("Source clip (frames + audio)"), 0],
        start_frame: [id("Clip start frame"), 1],
        placement,
      },
      _meta: { title: "Object placement area" },
    };
    grow.mask = ["object_placement", 0];
    grow.expand = { tight: 0, normal: 2, loose: 4 }[input.margin];
    for (const title of drop) delete graph[id(title)];
  }

  applyDefaultModel(graph);
  uniquifyRunName(graph, input.runId);
  setSection(graph, id("Source video"), input.section);
  graph[id("Source video")].inputs.video = input.videoName;
  if (picture && input.imageName) graph[id("Picture 1")].inputs.image = input.imageName;
  return graph;
}

const HAT_TITLE_REGEX = /\bhats?\b/i;
const ADVANCED_PLAN_TITLE = "Swap Plan (roles, seed, size)";
const ADVANCED_VIDEO_TITLE = "Source video (people get replaced)";

function advancedOrdinal(i: number, count: number) {
  return count === 1
    ? "the main person"
    : `the person with the ${["", "second ", "third ", "fourth "][i] ?? ""}most screen time`;
}

function pruneAdvancedCore(
  graph: ApiGraph,
  imageNames: string[],
  input: AdvancedGraphInput | MontageGraphInput,
): ApiGraph {
  const pictures = imageNames.length;
  const available = Object.values(graph).filter(
    (node) => node.class_type === "LoadImage" && /^Picture \d$/.test(node._meta?.title ?? ""),
  ).length;
  if (pictures < 1 || pictures > available) {
    throw new Error(`This mode takes 1-${available} character photos.`);
  }

  const removed = new Set<string>();
  for (let k = pictures + 1; k <= available; k++) {
    const load = nodeByTitle(graph, `Picture ${k}`);
    const shrink = Object.keys(graph).find(
      (id) =>
        isLink(graph[id].inputs.image) &&
        graph[id].inputs.image[0] === load &&
        graph[id].class_type === "ImageScaleToMaxDimension",
    );
    const describe = nodeByTitle(graph, `Describe picture ${k}`);
    for (const id of [load, shrink, describe]) if (id) removed.add(id);
  }

  const bypass = new Map<string, unknown>();
  if (!input.hatFix) {
    for (const [id, node] of Object.entries(graph)) {
      if (!HAT_TITLE_REGEX.test(node._meta?.title ?? "")) continue;
      removed.add(id);
      if (node.class_type === "MaskComposite" && node.inputs.operation === "add") {
        bypass.set(id, node.inputs.destination);
      }
    }
  }
  for (const id of removed) delete graph[id];
  for (const [id, node] of Object.entries(graph)) {
    for (const [name, value] of Object.entries(node.inputs)) {
      if (!isLink(value) || !removed.has(value[0])) continue;
      if (bypass.has(value[0])) node.inputs[name] = bypass.get(value[0]);
      else if (/^picture_\d/.test(name) || name.startsWith("ref_images.")) delete node.inputs[name];
      else throw new Error(`Node ${id}.${name} still links to removed node ${value[0]}.`);
    }
  }

  if (!input.noLipSync) dropNoLipSync(graph);
  setMotionSize(graph, input.motion);

  for (const node of Object.values(graph)) {
    if (node.class_type === "GrowMaskWithBlur" && / grow mask /.test(node._meta?.title ?? "")) {
      node.inputs.expand = SIMPLE_MARGINS[input.margin];
    }
    if (node.class_type === "MiniMaxH3ReferenceToVideo") {
      node.inputs.ref_image_size = "match";
    }
  }

  const planId = nodeByTitle(graph, ADVANCED_PLAN_TITLE);
  const videoId = nodeByTitle(graph, ADVANCED_VIDEO_TITLE);
  const clipShotsNode = Object.values(graph).find((node) => node.class_type === "H3ClipShots");
  if (clipShotsNode && isLink(clipShotsNode.inputs.shot_prompt)) {
    graph.scro_shot_prompt = {
      class_type: "StringConcatenate",
      inputs: {
        string_a: clipShotsNode.inputs.shot_prompt,
        string_b: FULL_BODY_SHOT_MOTION_INSTRUCTION,
        delimiter: " ",
      },
      _meta: { title: "Enhance shot describer with full-body motion rules" },
    };
    clipShotsNode.inputs.shot_prompt = ["scro_shot_prompt", 0];
  }
  const plan = graph[planId].inputs;
  const roles = input.roles.slice(0, pictures).map((r) => r.replace(/\s+/g, " ").trim());
  plan.resolution = OPENJUTSU_RESOLUTION;
  plan.seed = input.seed;
  plan.clip_seconds = input.clipSeconds;
  plan.roles = roles.some(Boolean)
    ? roles.map((role, i) => role || advancedOrdinal(i, pictures)).join("\n")
    : "";

  for (let i = 0; i < pictures; i++) {
    const picNodeId = nodeByTitle(graph, `Picture ${i + 1}`);
    graph[picNodeId].inputs.image = imageNames[i]!;
  }
  setSection(graph, videoId, input.section);
  graph[videoId].inputs.video = input.videoName;
  return graph;
}

export function buildAdvancedGraph(input: AdvancedGraphInput): ApiGraph {
  const useMaxQ = Boolean(input.maxQuality) && input.imageNames.length === 2;
  const graph = loadGraph(useMaxQ ? "advanced_maxq" : "advanced");
  silenceWhenSoundless(graph);
  pruneAdvancedCore(graph, input.imageNames, input);
  applyDefaultModel(graph);
  uniquifyRunName(graph, input.runId);
  return graph;
}

export function buildMontageGraph(input: MontageGraphInput): ApiGraph {
  const graph = loadGraph("montage");
  silenceWhenSoundless(graph);
  pruneAdvancedCore(graph, input.imageNames, input);
  const tracksId = nodeByTitle(graph, "Tracks from Find people");
  delete graph[tracksId];
  const cropsId = nodeByTitle(graph, "Show each track per shot");
  const cleanRoles = input.roles
    .slice(0, input.imageNames.length)
    .map((role, i) => `<Subject ${i + 1}>: ${(role || advancedOrdinal(i, input.imageNames.length)).replace(/\s+/g, " ").trim()}`)
    .join("\n");
  graph[cropsId].inputs.people = cleanRoles;
  applyDefaultModel(graph);
  uniquifyRunName(graph, input.runId);
  return graph;
}

export function buildExtendGraph(input: ExtendGraphInput): ApiGraph {
  const graph = loadGraph("extend");
  silenceWhenSoundless(graph);

  const safeDuration = Math.max(2, Number(input.clipDurationSeconds) || 6);
  const skipFirstFrames = Math.max(0, Math.round((safeDuration - 6) * 24));
  graph["5"].inputs.video = input.videoName;
  graph["5"].inputs.skip_first_frames = skipFirstFrames;
  graph["5"].inputs.frame_load_cap = 144;

  const refVideoSeconds = Math.min(6, safeDuration);
  const prompt = buildH3ExtendPrompt({
    extensionPrompt: input.extensionPrompt,
    hasCharacterImage: Boolean(input.characterImageName),
    hasSceneImage: Boolean(input.sceneImageName),
    hasPropImage: Boolean(input.propImageName),
    refVideoSeconds,
  });

  const { width, height } = resolveH3ExtendDimensions(input.aspectRatio);
  const planNode = graph["26"].inputs;
  planNode.width = width;
  planNode.height = height;
  planNode.run_name = `extend_${input.runId}`;
  planNode.base_seed = input.seed;
  planNode.default_steps = DEFAULT_MODEL.steps;
  planNode.plan_json = JSON.stringify(
    {
      shots: [
        {
          id: "extend_01",
          prompt,
          // 39 frames protected latent prefix + 153 newly generated frames (6.375s at 24fps) = 192 (valid 17k+5 H3 length)
          length: 192,
          steps: DEFAULT_MODEL.steps,
          seed: String(input.seed),
        },
      ],
    },
    null,
    2,
  );

  // Wire only present reference images sequentially into ref_images.ref_image_0..2 and remove unused LoadImage nodes.
  const refInputs = graph["30"].inputs;
  refInputs.ref_image_size = "max";
  const imageSlots: Array<{ nodeId: string; imageName?: string | null }> = [
    { nodeId: "2", imageName: input.characterImageName },
    { nodeId: "3", imageName: input.sceneImageName },
    { nodeId: "4", imageName: input.propImageName },
  ];
  let refIdx = 0;
  for (const slot of imageSlots) {
    if (slot.imageName) {
      graph[slot.nodeId].inputs.image = slot.imageName;
      refInputs[`ref_images.ref_image_${refIdx}`] = [slot.nodeId, 0];
      refIdx++;
    } else {
      delete graph[slot.nodeId];
    }
  }

  graph["15"].inputs.unet_name = DEFAULT_MODEL.model;
  graph["16"].inputs.lora_name = DEFAULT_MODEL.lora;
  graph["16"].inputs.strength_model = 1;
  graph["19"].inputs.clip_name = DEFAULT_MODEL.textEncoder;
  graph["20"].inputs.vae_name = DEFAULT_MODEL.videoVae;
  graph["21"].inputs.vae_name = DEFAULT_MODEL.audioVae;

  const assemble = graph["67"].inputs;
  assemble.output_subfolder = "h3_oneclick_extend";
  assemble.filename = `${String(assemble.filename)}_${input.runId}`;

  return graph;
}
