import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildJutsuColorFilter,
  DEFAULT_JUTSU_COLOR_SETTINGS,
} from "@/service/jutsu/color-grade";
import {
  buildDefaultJutsuEditPrompt,
  buildJutsuObjectSwapPrompt,
} from "@/service/jutsu/describer";
import {
  findJutsuLightLook,
  JUTSU_LIGHT_LOOKS,
  resolveJutsuLightText,
} from "@/service/jutsu/light-looks";
import {
  computeJutsuH3Frames,
  computeJutsuPlaceStart,
} from "@/service/jutsu/pipeline";
import {
  buildJutsuRef2VaPrompt,
  buildMinimaxH3Ref2VaBody,
} from "@/service/jutsu/minimax-h3-ref2va";
import {
  expandTrackedBoxWithHeadroomAndMargin,
  falSamPromptForTarget,
  interpolateTrackedBoxes,
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

test("character swap prompts keep the donor face shape and only borrow expression from the source", () => {
  const plain = buildDefaultJutsuEditPrompt({ mode: "character_swap" });
  assert.match(plain, /face shape/i);
  assert.match(plain, /facial features of attached image 1/i);
  assert.doesNotMatch(plain, /facial expression, and body cut of the person in attached image 2/i);

  const relit = buildDefaultJutsuEditPrompt({ mode: "character_swap", relightId: "golden_halo" });
  assert.match(relit, /face shape/i);
  assert.match(relit, /facial features of attached image 1/i);

  const videoPrompt = buildJutsuRef2VaPrompt({
    motionText: "She waves.",
    hasIdentityImage: true,
  });
  assert.match(videoPrompt, /Reference image 2/);
  assert.match(videoPrompt, /every frame/i);
  assert.match(videoPrompt, /on-screen text/i);
  assert.doesNotMatch(videoPrompt, /No on-screen text/i);
  assert.doesNotMatch(
    buildJutsuRef2VaPrompt({ motionText: "She waves.", hasIdentityImage: false }),
    /Reference image 2/,
  );
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
