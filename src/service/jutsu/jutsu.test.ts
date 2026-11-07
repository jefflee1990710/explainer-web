import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildJutsuColorFilter,
  DEFAULT_JUTSU_COLOR_SETTINGS,
} from "@/service/jutsu/color-grade";
import {
  buildDefaultJutsuEditPrompt,
  buildJutsuObjectSwapPrompt,
  buildMultiPersonJutsuEditPrompt,
  flattenPersonMappingDonorUrls,
} from "@/service/jutsu/describer";
import {
  appendJutsuReferenceUrls,
  buildInitialPersonSlotAssignment,
  normalizeJutsuReferenceUrls,
  removeJutsuReferenceUrl,
} from "@/model/jutsu-job";
import {
  findJutsuLightLook,
  JUTSU_LIGHT_LOOKS,
  resolveJutsuLightText,
} from "@/service/jutsu/light-looks";
import {
  computeJutsuH3Frames,
  computeJutsuPlaceStart,
  convertGifBufferToMp4,
  convertMp4BufferToLoopingGif,
  inferJutsuSourceMediaKind,
  resolveCharacterDonorForSwap,
} from "@/service/jutsu/pipeline";
import {
  buildJutsuRef2VaPrompt,
  buildMinimaxH3Ref2VaBody,
} from "@/service/jutsu/minimax-h3-ref2va";
import {
  applyPeopleMask,
  holdMasksOverTime,
  JUTSU_SAM_LONG_EDGE,
  openJutsuGreyByte,
} from "@/service/jutsu/grey-mannequin";
import {
  expandTrackedBoxWithHeadroomAndMargin,
  falSamPromptForTarget,
  interpolateTrackedBoxes,
  JUTSU_SAM_LONG_EDGE as SAM_EDGE,
  jutsuLongEdgeScaleFilter,
  renderGreyMannequinAndMaskFrame,
  renderGreyMannequinAndMaskFrameFromMask,
} from "@/service/jutsu/sam-mannequin";
import { ObjectId } from "mongodb";
import { scroSwapTask } from "@/service/generation/task-list";
import sharp from "sharp";

test("JUTSU_LIGHT_LOOKS exposes all 17 Openjutsu relight presets with preview WebP paths", () => {
  assert.equal(JUTSU_LIGHT_LOOKS.length, 17);
  for (const look of JUTSU_LIGHT_LOOKS) {
    assert.match(look.image, /^\/relight\/.+\.webp$/);
    assert.ok(look.nameEn.length > 0);
    assert.ok(look.nameZhHant.length > 0);
    assert.ok(look.light.length > 20);
  }
  assert.equal(findJutsuLightLook("golden_halo")?.nameEn, "Golden halo");
  assert.match(resolveJutsuLightText("blinds"), /venetian blinds/i);
  assert.equal(resolveJutsuLightText("blinds", "Custom neon rim light"), "Custom neon rim light");
});

test("buildDefaultJutsuEditPrompt and buildJutsuObjectSwapPrompt cover character swap, object swap (change/remove/background/add), and relight", () => {
  const charSwap = buildDefaultJutsuEditPrompt({
    mode: "character_swap",
    relightId: "golden_halo",
  });
  assert.match(charSwap, /attached image 1/);
  assert.match(charSwap, /attached image 2/);
  assert.match(charSwap, /warm golden glow/i);
  assert.match(charSwap, /background of attached image 2/i);
  assert.match(charSwap, /never replace them with the backdrop from attached image 1/i);

  const charSwapPlain = buildDefaultJutsuEditPrompt({
    mode: "character_swap",
  });
  assert.match(charSwapPlain, /background of attached image 2/i);
  assert.doesNotMatch(charSwapPlain, /background of attached image 1/i);

  const objChange = buildJutsuObjectSwapPrompt({
    editMode: "change",
    target: "jacket",
    changeTo: "a vintage leather biker jacket",
    hasReferenceImage: true,
  });
  assert.match(objChange, /change the jacket/i);
  assert.match(objChange, /attached image 2/);

  const objRemove = buildJutsuObjectSwapPrompt({
    editMode: "remove",
    target: "coffee cup",
    changeTo: "the wooden table",
    hasReferenceImage: false,
  });
  assert.match(objRemove, /Remove the coffee cup/);
  assert.match(objRemove, /wooden table/);

  const objAdd = buildJutsuObjectSwapPrompt({
    editMode: "add",
    target: "tabletop",
    changeTo: "add a chocolate cake on a plate",
    hasReferenceImage: false,
    placementBox: { x: 0.25, y: 0.5, width: 0.3, height: 0.25 },
  });
  assert.match(objAdd, /Add a chocolate cake on a plate/);
  assert.match(objAdd, /25%, 50%/);

  const relightOnly = buildDefaultJutsuEditPrompt({
    mode: "relight_video",
    relightId: "cold_beam",
  });
  assert.match(relightOnly, /Relight this photograph/);
  assert.match(relightOnly, /cold white spotlight/);
});

test("buildJutsuColorFilter ports H3 Soft Reinhard tone mapper and detail contrast (-0.20) to FFmpeg filters", () => {
  const filter = buildJutsuColorFilter(DEFAULT_JUTSU_COLOR_SETTINGS);
  assert.match(filter, /unsharp=3:3:-0\.17:3:3:0/);
  assert.match(filter, /eq=contrast=0\.968:brightness=0\.002:saturation=1\.01/);
  assert.match(filter, /curves=all=/);
  assert.match(filter, /setsar=1$/);

  const bypass = buildJutsuColorFilter({ detail: null, tone: null });
  assert.equal(bypass, "setsar=1");
});

test("computeJutsuPlaceStart and computeJutsuH3Frames match Openjutsu section math and 17k+5 frame grid", () => {
  assert.equal(computeJutsuPlaceStart("Start", 20, 6), 0);
  assert.equal(computeJutsuPlaceStart("Middle", 20, 6), 7);
  assert.equal(computeJutsuPlaceStart("End", 20, 6), 14);

  // 6s -> 141 frames, 15s -> 345 frames on H3 17k+5 grid
  assert.equal(computeJutsuH3Frames(6), 141);
  assert.equal(computeJutsuH3Frames(15), 345);
});

test("SAM 3.1 headroom + margin expansion, grey mannequin rendering, and MiniMax H3 ref2va conditioning body match Openjutsu", async () => {
  const tight = { x: 0.25, y: 0.2, width: 0.5, height: 0.6 };
  const grown = expandTrackedBoxWithHeadroomAndMargin(tight, {
    headroom: 0.1,
    margin: "normal",
    canvasSize: 1000,
  });
  // Top expands by 10% headroom (0.06) + 40/1000 margin (0.04) = 0.10 -> y becomes 0.10
  assert.equal(grown.y, 0.1);
  assert.equal(grown.x, 0.21);

  const interpolated = interpolateTrackedBoxes(
    [
      { frameIndex: 0, x: 0.1, y: 0.2, width: 0.4, height: 0.6 },
      { frameIndex: 10, x: 0.3, y: 0.2, width: 0.4, height: 0.6 },
    ],
    11,
  );
  assert.equal(interpolated.length, 11);
  assert.ok(Math.abs(interpolated[5]!.x - 0.2) < 1e-6);

  const samplePng = await sharp({
    create: { width: 120, height: 160, channels: 3, background: { r: 210, g: 90, b: 60 } },
  })
    .png()
    .toBuffer();

  const { mannequinJpeg, checkMaskJpeg } = await renderGreyMannequinAndMaskFrame({
    frameBuffer: samplePng,
    tightBox: tight,
    grownBox: grown,
  });
  const mannMeta = await sharp(mannequinJpeg).metadata();
  const maskMeta = await sharp(checkMaskJpeg).metadata();
  assert.equal(mannMeta.width, 120);
  assert.equal(mannMeta.height, 160);
  // Check Mask stitches `Mask | Mannequin` side-by-side (`120 * 2 + 4 = 244`)
  assert.equal(maskMeta.width, 244);
  assert.equal(maskMeta.height, 160);

  // Pixel SAM mask path (fal video-rle) paints the same canvas size
  const binaryMask = new Uint8Array(120 * 160);
  for (let y = 20; y < 140; y++) {
    for (let x = 30; x < 90; x++) binaryMask[y * 120 + x] = 1;
  }
  const fromMask = await renderGreyMannequinAndMaskFrameFromMask({
    frameBuffer: samplePng,
    mask: binaryMask,
    margin: "normal",
  });
  const fromMaskMeta = await sharp(fromMask.mannequinJpeg).metadata();
  assert.equal(fromMaskMeta.width, 120);
  assert.equal(fromMaskMeta.height, 160);
  assert.equal(falSamPromptForTarget("人"), "person");
  assert.equal(falSamPromptForTarget("red jacket"), "red jacket");
  assert.equal(JUTSU_SAM_LONG_EDGE, 1008);
  assert.equal(SAM_EDGE, 1008);
  assert.match(jutsuLongEdgeScaleFilter(1008), /1008/);
  assert.equal(openJutsuGreyByte(0), 115);
  assert.equal(openJutsuGreyByte(1), 230);

  const held = holdMasksOverTime(
    [Uint8Array.from([1, 0]), Uint8Array.from([0, 0]), Uint8Array.from([0, 0])],
    1,
  );
  assert.equal(held[1]![0], 1);
  assert.equal(held[2]![0], 0);

  const head = new Uint8Array(4 * 6);
  for (let y = 2; y <= 5; y++) {
    head[y * 4 + 1] = 1;
    head[y * 4 + 2] = 1;
  }
  const withRoom = applyPeopleMask(head, 4, 6, 0.5);
  assert.equal(withRoom.mask[1], 1);
  assert.equal(withRoom.mask[0], 0);

  const { data: greyPixels, info: greyInfo } = await sharp(fromMask.mannequinJpeg)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const greyChannels = greyInfo.channels;
  const center = (80 * 120 + 60) * greyChannels;
  assert.ok(Math.abs(greyPixels[center]! - greyPixels[center + 1]!) < 12);
  assert.ok(greyPixels[center]! > 140 && greyPixels[center]! < 200);
  assert.ok(greyPixels[0]! > greyPixels[1]! + 40);

  const background = await renderGreyMannequinAndMaskFrameFromMask({
    frameBuffer: samplePng,
    mask: binaryMask,
    margin: "normal",
    maskMode: "background",
  });
  const { data: bgPixels, info: bgInfo } = await sharp(background.mannequinJpeg)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bgChannels = bgInfo.channels;
  const bgCenter = (80 * 120 + 60) * bgChannels;
  assert.ok(Math.abs(bgPixels[0]! - bgPixels[1]!) < 12);
  assert.ok(bgPixels[bgCenter]! > bgPixels[bgCenter + 1]! + 40);

  const ref2vaBody = buildMinimaxH3Ref2VaBody({
    prompt: "The singer performs on stage.",
    preparedImageUrl: "https://blob.test/prepared.webp",
    mannequinVideoUrl: "https://blob.test/mannequin.mp4",
    audioUrl: "https://blob.test/audio.mp3",
    noLipSync: true,
    durationSeconds: 6,
    aspectRatio: "9:16",
  });
  assert.equal(ref2vaBody.model, "MiniMax-H3");
  assert.equal(ref2vaBody.duration, 6);
  // With noLipSync: true, audio_url is omitted and prompt adds the no-singing instruction
  assert.match(ref2vaBody.content[0]?.type === "text" ? ref2vaBody.content[0].text : "", /Nobody sings/);
  assert.equal(ref2vaBody.content.length, 3);
  assert.deepEqual(ref2vaBody.content[1], {
    type: "image_url",
    image_url: { url: "https://blob.test/prepared.webp" },
    role: "reference_image",
  });
  assert.deepEqual(ref2vaBody.content[2], {
    type: "video_url",
    video_url: { url: "https://blob.test/mannequin.mp4" },
    role: "reference_video",
  });
  assert.equal(JSON.stringify(ref2vaBody).includes("first_frame"), false);
  assert.equal(JSON.stringify(ref2vaBody).includes("last_frame"), false);

  // Character swap also sends the original character photo as Reference image 2.
  const identityBody = buildMinimaxH3Ref2VaBody({
    prompt: "Swap the person.",
    preparedImageUrl: "https://blob.test/prepared.webp",
    identityImageUrl: "https://blob.test/portrait.jpg",
    mannequinVideoUrl: "https://blob.test/mannequin.mp4",
    durationSeconds: 8,
    aspectRatio: "16:9",
  });
  assert.deepEqual(
    identityBody.content.map((item) => ("role" in item ? item.role : item.type)),
    ["text", "reference_image", "reference_image", "reference_video"],
  );
  assert.deepEqual(identityBody.content[2], {
    type: "image_url",
    image_url: { url: "https://blob.test/portrait.jpg" },
    role: "reference_image",
  });

  // Same URL twice adds nothing.
  const dedupedBody = buildMinimaxH3Ref2VaBody({
    prompt: "Swap the person.",
    preparedImageUrl: "https://blob.test/prepared.webp",
    identityImageUrl: "https://blob.test/prepared.webp",
    mannequinVideoUrl: "https://blob.test/mannequin.mp4",
    durationSeconds: 8,
    aspectRatio: "16:9",
  });
  assert.equal(dedupedBody.content.length, 3);
});

test("character swap prompts keep the donor face shape, lock the exact character outfit, and only borrow expression from the source", () => {
  const plain = buildDefaultJutsuEditPrompt({
    mode: "character_swap",
    characterOutfitSpec:
      "Black sporty mesh football jersey mini dress with white athletic typography",
  });
  assert.match(plain, /face shape/i);
  assert.match(plain, /facial features of attached image 1/i);
  assert.match(plain, /Wardrobe lock: copy the exact outfit from attached image 1/i);
  assert.match(
    plain,
    /Exact character outfit to wear \(from attached image 1\): Black sporty mesh football jersey mini dress with white athletic typography\./,
  );
  assert.doesNotMatch(plain, /facial expression, and body cut of the person in attached image 2/i);

  const relit = buildDefaultJutsuEditPrompt({ mode: "character_swap", relightId: "golden_halo" });
  assert.match(relit, /face shape/i);
  assert.match(relit, /facial features of attached image 1/i);

  const videoPrompt = buildJutsuRef2VaPrompt({
    motionText: "She waves.",
    hasIdentityImage: true,
    characterOutfitSpec:
      "Black sporty mesh football jersey mini dress with white athletic typography",
  });
  assert.match(videoPrompt, /subject_definitions:/);
  assert.match(videoPrompt, /Do not hold the reference picture's starting pose/);
  assert.match(videoPrompt, /overall_soundscape:/);
  assert.match(videoPrompt, /Reference image 2/);
  assert.match(videoPrompt, /exact outfit/i);
  assert.match(
    videoPrompt,
    /Character outfit lock: Black sporty mesh football jersey mini dress with white athletic typography\./,
  );
  assert.match(videoPrompt, /every frame/i);
  assert.match(videoPrompt, /on-screen text/i);
  assert.doesNotMatch(videoPrompt, /No on-screen text/i);
  assert.doesNotMatch(
    buildJutsuRef2VaPrompt({ motionText: "She waves.", hasIdentityImage: false }),
    /Reference image 2/,
  );

  // resolveCharacterDonorForSwap upgrades a version's portraitUrl to its full-body standing profileUrl
  // and extracts the exact outfit spec for that version.
  const v1Id = new ObjectId("6ae377cdbc437efda274d699");
  const v2Id = new ObjectId("6ae77368b80afb6463ce80f8");
  const resolved = resolveCharacterDonorForSwap(
    {
      _id: new ObjectId("6addd845d3cb8cccfe4ee7e7"),
      userId: new ObjectId("6abcc45aebdb844ee2cd8413"),
      clerkUserId: "u1",
      name: "Alice",
      styleId: "realistic",
      defaultVersionId: v2Id,
      versions: [
        {
          id: v1Id,
          styleId: "realistic",
          prompt: "",
          blueprintKind: "board",
          status: "completed",
          creditsCharged: true,
          portraitUrl: "https://blob.test/v1-portrait",
          profileUrl: "https://blob.test/v1-standing",
          blueprintUrl: "https://blob.test/v1-board",
          spec: {
            identity: "East Asian woman",
            face: "Oval face",
            hair: "Black long",
            skinTone: "Fair",
            body: "Slender",
            marks: "none",
            outfit: "White linen shirt and grey micro shorts",
            palette: [],
          },
          createdAt: new Date(1000),
        },
        {
          id: v2Id,
          styleId: "realistic",
          prompt: "",
          blueprintKind: "board",
          status: "completed",
          creditsCharged: true,
          portraitUrl: "https://blob.test/v2-portrait",
          profileUrl: "https://blob.test/v2-standing",
          blueprintUrl: "https://blob.test/v2-board",
          spec: {
            identity: "East Asian woman",
            face: "Oval face",
            hair: "Black long",
            skinTone: "Fair",
            body: "Slender",
            marks: "none",
            outfit: "Black sporty mesh football jersey mini dress",
            palette: [],
          },
          createdAt: new Date(2000),
        },
      ],
      createdAt: new Date(1000),
      updatedAt: new Date(2000),
    },
    "https://blob.test/v2-portrait",
  );
  assert.equal(resolved.characterName, "Alice");
  assert.equal(resolved.donorImageUrl, "https://blob.test/v2-standing");
  assert.equal(resolved.characterOutfitSpec, "Black sporty mesh football jersey mini dress");
});

test("scroSwapTask surfaces rendering and completed Scro Swap jobs in the background task list", () => {
  const now = Date.now();
  const id = new ObjectId();
  const rendering = scroSwapTask(
    {
      _id: id,
      userId: new ObjectId(),
      clerkUserId: "u1",
      mode: "character_swap",
      status: "rendering",
      sourceVideoUrl: "https://blob.test/src.mp4",
      aspectRatio: "9:16",
      sectionStart: 0,
      sectionLength: 6,
      characterName: "Scro",
      createdAt: new Date(now - 5000),
      updatedAt: new Date(now - 1000),
    },
    now,
  );
  assert.equal(rendering?.kind, "scroSwap");
  assert.equal(rendering?.stage, "generating");
  assert.equal(rendering?.title, "Scro");
  assert.equal(rendering?.href, "/app/scroswap");

  const done = scroSwapTask(
    {
      _id: id,
      userId: new ObjectId(),
      clerkUserId: "u1",
      mode: "character_swap",
      status: "completed",
      sourceVideoUrl: "https://blob.test/src.mp4",
      outputVideoUrl: "https://blob.test/out.mp4",
      aspectRatio: "9:16",
      sectionStart: 0,
      sectionLength: 6,
      characterName: "Scro",
      createdAt: new Date(now - 5000),
      updatedAt: new Date(now - 500),
    },
    now,
  );
  assert.equal(done?.stage, "done");
  assert.equal(done?.previewUrl, "https://blob.test/out.mp4");
});

test("buildMultiPersonJutsuEditPrompt and MiniMax H3 ref2va format left-to-right multi-person character mappings while preserving unmapped people", () => {
  const mappings = [
    {
      objectId: 1,
      personIndex: 1,
      anchorPoint: { x: 0.22, y: 0.48 },
      box: { x: 0.1, y: 0.15, width: 0.24, height: 0.75 },
      characterId: "char-scro",
      characterName: "Scro",
      referenceImageUrl: "https://blob.test/scro-standing.png",
      characterOutfitSpec: "Top: Pink crop top; Pants: Blue jeans",
    },
    {
      objectId: 0,
      personIndex: 2,
      anchorPoint: { x: 0.76, y: 0.5 },
      box: { x: 0.62, y: 0.14, width: 0.26, height: 0.78 },
      characterId: "char-alice",
      characterName: "Alice",
      referenceImageUrl: "https://blob.test/alice-standing.png",
      characterOutfitSpec: "Top: Navy tailored blazer",
    },
  ];

  const editPrompt = buildMultiPersonJutsuEditPrompt({
    mappings,
    totalDetectedPeople: 3,
    relightId: "golden_halo",
  });

  assert.match(editPrompt, /attached image 3/i);
  assert.match(editPrompt, /attached image 1/i);
  assert.match(editPrompt, /attached image 2/i);
  assert.match(editPrompt, /Pink crop top/i);
  assert.match(editPrompt, /Navy tailored blazer/i);
  assert.match(editPrompt, /keep any other unmapped people/i);

  const ref2vaBody = buildMinimaxH3Ref2VaBody({
    prompt: "Multi swap.",
    preparedImageUrl: "https://blob.test/prepared-start.webp",
    identityImageUrls: [
      "https://blob.test/scro-standing.png",
      "https://blob.test/alice-standing.png",
    ],
    mannequinVideoUrl: "https://blob.test/union-mannequin.mp4",
    durationSeconds: 6,
    aspectRatio: "16:9",
  });

  assert.deepEqual(
    ref2vaBody.content.filter((c) => c.type === "image_url"),
    [
      {
        type: "image_url",
        image_url: { url: "https://blob.test/prepared-start.webp" },
        role: "reference_image",
      },
      {
        type: "image_url",
        image_url: { url: "https://blob.test/scro-standing.png" },
        role: "reference_image",
      },
      {
        type: "image_url",
        image_url: { url: "https://blob.test/alice-standing.png" },
        role: "reference_image",
      },
    ],
  );

  const ref2vaPrompt = buildJutsuRef2VaPrompt({
    motionText: "Two people high-five.",
    hasIdentityImage: true,
    personMappings: mappings,
  });
  assert.match(ref2vaPrompt, /subject_definitions:/);
  assert.match(ref2vaPrompt, /Reference image 2/i);
  assert.match(ref2vaPrompt, /Reference image 3/i);
  assert.match(ref2vaPrompt, /Pink crop top/i);
  assert.match(ref2vaPrompt, /Navy tailored blazer/i);
});

test("inferJutsuSourceMediaKind and FFmpeg GIF<->MP4 round-trip support animated GIF and static image sources", async () => {
  assert.equal(
    inferJutsuSourceMediaKind("https://blob.test/explainer/brand/u1/clip.mp4"),
    "video",
  );
  assert.equal(
    inferJutsuSourceMediaKind("https://blob.test/explainer/brand/u1/meme.gif?v=1"),
    "gif",
  );
  assert.equal(
    inferJutsuSourceMediaKind("https://blob.test/explainer/brand/u1/photo.webp"),
    "image",
  );
  assert.equal(
    inferJutsuSourceMediaKind("https://blob.test/explainer/brand/u1/photo.png", "gif"),
    "gif",
  );

  // Create a tiny GIF via sharp, convert to MP4 via FFmpeg, then convert back to looping GIF
  const stacked = await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 220, g: 50, b: 50, alpha: 1 } },
  })
    .gif({ delay: [500], loop: 0 })
    .toBuffer();

  const mp4Res = await convertGifBufferToMp4(stacked);
  assert.ok(mp4Res.mp4Buffer.length > 100);
  assert.ok(mp4Res.originalDurationSeconds >= 0.4);

  const gifOut = await convertMp4BufferToLoopingGif(mp4Res.mp4Buffer, {
    maxDurationSeconds: 1.0,
    fps: 10,
    maxEdge: 64,
  });
  // GIF89a magic header
  assert.equal(gifOut.subarray(0, 3).toString("ascii"), "GIF");
});

test("normalizeJutsuReferenceUrls deduplicates, trims, falls back to single URL, and caps at 6 character reference images", () => {
  assert.deepEqual(
    normalizeJutsuReferenceUrls(
      [
        " https://blob.test/r1.jpg ",
        "",
        "javascript:alert(1)",
        "relative/path.jpg",
        "https://blob.test/r2.jpg",
        "https://blob.test/r1.jpg",
        "https://blob.test/r3.jpg",
        "https://blob.test/r4.jpg",
        "https://blob.test/r5.jpg",
        "https://blob.test/r6.jpg",
        "https://blob.test/r7.jpg",
      ],
      "https://blob.test/fallback.jpg",
    ),
    [
      "https://blob.test/r1.jpg",
      "https://blob.test/r2.jpg",
      "https://blob.test/r3.jpg",
      "https://blob.test/r4.jpg",
      "https://blob.test/r5.jpg",
      "https://blob.test/r6.jpg",
    ],
  );
  assert.deepEqual(
    normalizeJutsuReferenceUrls([], " https://blob.test/single.jpg "),
    ["https://blob.test/single.jpg"],
  );
  assert.deepEqual(normalizeJutsuReferenceUrls(undefined, undefined), []);

  const afterAdd = appendJutsuReferenceUrls(
    ["https://blob.test/r1.jpg", "https://blob.test/r2.jpg"],
    ["https://blob.test/r2.jpg", "https://blob.test/r3.jpg"],
  );
  assert.deepEqual(afterAdd, [
    "https://blob.test/r1.jpg",
    "https://blob.test/r2.jpg",
    "https://blob.test/r3.jpg",
  ]);
  assert.deepEqual(
    removeJutsuReferenceUrl(afterAdd, "https://blob.test/r2.jpg"),
    ["https://blob.test/r1.jpg", "https://blob.test/r3.jpg"],
  );
});

test("single-person and multi-person character swap prompts map multiple reference images per character to accurate attached image ordinals", () => {
  const multiRefSingle = buildDefaultJutsuEditPrompt({
    mode: "character_swap",
    referenceImageCount: 3,
    characterOutfitSpec: "Black leather jacket and denim jeans",
  });
  assert.match(multiRefSingle, /attached images 1 to 3/i);
  assert.match(multiRefSingle, /attached image 4/i);
  assert.doesNotMatch(multiRefSingle, /person in attached image 2/i);

  const mappings = [
    {
      objectId: 1,
      personIndex: 1,
      anchorPoint: { x: 0.22, y: 0.48 },
      box: { x: 0.1, y: 0.15, width: 0.24, height: 0.75 },
      referenceImageUrl: "https://blob.test/p1-front.jpg",
      referenceImageUrls: [
        "https://blob.test/p1-front.jpg",
        "https://blob.test/p1-fullbody.jpg",
      ],
    },
    {
      objectId: 0,
      personIndex: 2,
      anchorPoint: { x: 0.76, y: 0.5 },
      box: { x: 0.62, y: 0.14, width: 0.26, height: 0.78 },
      characterId: "char-alice",
      characterName: "Alice",
      referenceImageUrl: "https://blob.test/alice-standing.png",
      characterOutfitSpec: "Top: Navy tailored blazer",
    },
  ];

  assert.deepEqual(flattenPersonMappingDonorUrls(mappings), [
    "https://blob.test/p1-front.jpg",
    "https://blob.test/p1-fullbody.jpg",
    "https://blob.test/alice-standing.png",
  ]);

  const multiPersonPrompt = buildMultiPersonJutsuEditPrompt({
    mappings,
    totalDetectedPeople: 2,
  });
  assert.match(multiPersonPrompt, /attached images 1 to 2/i);
  assert.match(multiPersonPrompt, /attached image 3/i);
  assert.match(multiPersonPrompt, /Using attached image 4 as the base scene frame/i);

  const ref2vaMultiSingle = buildJutsuRef2VaPrompt({
    motionText: "He walks forward.",
    hasIdentityImage: true,
    identityImageCount: 3,
  });
  assert.match(ref2vaMultiSingle, /Reference images 2 to 4/i);

  // When multiple people have 5 photos each (10 total + 1 prepared = 11 > 9 H3 limit),
  // buildJutsuRef2VaPrompt caps Reference image numbers at 9 to match buildMinimaxH3Ref2VaBody.
  const cappedMultiPersonPrompt = buildJutsuRef2VaPrompt({
    motionText: "Two people dance.",
    hasIdentityImage: true,
    personMappings: [
      {
        objectId: 1,
        personIndex: 1,
        anchorPoint: { x: 0.25, y: 0.5 },
        box: { x: 0.1, y: 0.1, width: 0.3, height: 0.8 },
        referenceImageUrl: "https://blob.test/p1-1.jpg",
        referenceImageUrls: [
          "https://blob.test/p1-1.jpg",
          "https://blob.test/p1-2.jpg",
          "https://blob.test/p1-3.jpg",
          "https://blob.test/p1-4.jpg",
          "https://blob.test/p1-5.jpg",
        ],
      },
      {
        objectId: 2,
        personIndex: 2,
        anchorPoint: { x: 0.75, y: 0.5 },
        box: { x: 0.6, y: 0.1, width: 0.3, height: 0.8 },
        referenceImageUrl: "https://blob.test/p2-1.jpg",
        referenceImageUrls: [
          "https://blob.test/p2-1.jpg",
          "https://blob.test/p2-2.jpg",
          "https://blob.test/p2-3.jpg",
          "https://blob.test/p2-4.jpg",
          "https://blob.test/p2-5.jpg",
        ],
      },
    ],
  });
  assert.match(cappedMultiPersonPrompt, /Reference images 2 to 6/i);
  assert.match(cappedMultiPersonPrompt, /Reference images 7 to 9/i);
  assert.doesNotMatch(cappedMultiPersonPrompt, /Reference images? 10|Picture 10/i);

  // Pre-uploaded custom photos are preserved on Person #1 when auto people detection runs afterwards
  const slot1 = buildInitialPersonSlotAssignment({
    personIndex: 1,
    characterId: "char-1",
    characterName: "Scro",
    defaultLookUrl: "https://blob.test/scro.png",
    defaultLookLabel: "Default Look",
    uploadedPhotoUrls: ["https://blob.test/custom-1.jpg", "https://blob.test/custom-2.jpg"],
  });
  assert.equal(slot1.keepOriginal, false);
  assert.equal(slot1.uploadedPhotoUrl, "https://blob.test/custom-1.jpg");
  assert.deepEqual(slot1.uploadedPhotoUrls, [
    "https://blob.test/custom-1.jpg",
    "https://blob.test/custom-2.jpg",
  ]);

  const slot2 = buildInitialPersonSlotAssignment({
    personIndex: 2,
    characterId: "char-1",
    characterName: "Scro",
    defaultLookUrl: "https://blob.test/scro.png",
    defaultLookLabel: "Default Look",
    uploadedPhotoUrls: ["https://blob.test/custom-1.jpg", "https://blob.test/custom-2.jpg"],
  });
  assert.equal(slot2.keepOriginal, true);
  assert.equal(slot2.uploadedPhotoUrl, "");
  assert.deepEqual(slot2.uploadedPhotoUrls, []);

  // Pre-selected historical/preset outfit on Person #1 is preserved when auto people detection runs
  const slotWithSelectedOutfit = buildInitialPersonSlotAssignment({
    personIndex: 1,
    characterId: "char-1",
    characterName: "Scro",
    defaultLookUrl: "https://blob.test/scro-default.png",
    defaultLookLabel: "Default Look",
    lookTab: "historical",
    selectedLookKey: "ver:v2",
    selectedLookUrl: "https://blob.test/scro-v2-standing.png",
    lookLabel: "v2",
  });
  assert.equal(slotWithSelectedOutfit.lookTab, "historical");
  assert.equal(slotWithSelectedOutfit.selectedLookKey, "ver:v2");
  assert.equal(slotWithSelectedOutfit.selectedLookUrl, "https://blob.test/scro-v2-standing.png");
  assert.equal(slotWithSelectedOutfit.lookLabel, "v2");
});
