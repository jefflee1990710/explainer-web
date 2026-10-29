import type { IDirector } from "@/model/director";

const raw = {
  slug: "street-lookbook-director",
  title: "Street fashion lookbook",
  description:
    "Stages an editorial street-fashion clothing demo (Esquire / Paris Fashion Week lookbook style): dresses your character in the uploaded clothing references across architectural street spots, alternating full-body silhouette shots, medium garment-detail angles, and contemplative editorial poses.",
  suggestedUseCase:
    "Apparel & fashion brand demos, seasonal lookbooks, outerwear/streetwear launches, styling showcases, and digital magazine covers where fabric drape, cut, and silhouette are the hero.",
  sortOrder: 18,
  isActive: true,
  previewUrl:
    "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/outfit-reel-director-preview-1bcd6983e1.webp",
  inputSchema: {
    requiresSource: true,
    aspectRatios: ["16:9", "9:16", "1:1"],
    durationPresets: ["micro", "short", "punchy", "full"],
    optionalCharacterImage: true,
  },
  higgsfieldDefaults: {
    imageModel: "alibaba/qwen-image-3/text-to-image",
    imageQuality: "medium",
    imageResolution: "1k",
    videoModel: "minimax/h3/image-to-video",
  },
  systemPrompt:
    "---\nname: directing-street-fashion-lookbooks\ndescription: Use when filming an editorial street-fashion clothing demo (Esquire / Paris Fashion Week lookbook style) that showcases uploaded garments on the character across architectural street locations with multi-angle cuts (full-body silhouette, medium collar/fabric detail, 3/4 back-over-shoulder, and optional monochrome editorial beats).\n---\n\n# Directing Street Fashion Lookbooks (Clothing Demo)\n\n## Core contract\n\nTurn a clothing brief plus 1–4 clothing reference images into a confirmed lookbook proposal (Phase A) and one video prompt per clip (Phase B).\n\n- **Identity vs. Wardrobe Lock (`wardrobeBuild`)**:\n  - The character's face, facial bone structure, skin texture, hair, and body proportions stay 100% locked to the attached character blueprint.\n  - The worn outfit in each clip follows the attached clothing reference image(s) (`referenceImageIds`) 100%: exact cut, silhouette, fabric weight, collar/lapel structure, buttons/toggles/zippers, colour, and layering. Never copy the face or hair of the person inside a clothing reference photo.\n- **Multi-Angle Editorial Montage**:\n  - Alternate camera angles and shot sizes across clips so every aspect of the garment is demonstrated:\n    1. `full-body-silhouette` (low-angle or eye-level full-body): shows the complete head-to-toe proportion, trouser drape, coat length, and footwear, seated on stone steps or leaning against a street façade / lamppost.\n    2. `medium-garment-detail` (waist-up / chest-up 3/4 or profile): highlights collar structure, knit/fabric weave, toggle/button closures, and layering as the model leans on a bridge railing or holds the coat lapel near their chin.\n    3. `back-over-shoulder` (medium 3/4 back view): shows back tailoring, shoulder drape, or a coat draped over one shoulder while the model turns their head in profile.\n- **Editorial Attitude & Micro-Motion**:\n  - Cool, contemplative magazine attitude: mostly off-camera pensive gazes (looking through a bridge railing, down at stone steps, or across a canal) punctuated by one direct, calm eye-contact shot into the lens.\n  - Restrained, tactile fashion micro-actions inside each clip: hand resting on chin, one hand tucked into a coat pocket, arms calmly crossed leaning on a lamppost, or fingers holding up a coat collar against the breeze.\n- **Silent / Ambient Audio**:\n  - `englishVo` MUST be `\"(no dialogue)\"` on every clip. The character's mouth stays softly closed (zero lip-sync). `bgmSfx` carries one subtle urban/fabric Foley cue per clip.\n\n## Setup gate\n\nRequire these before planning:\n\n- source material (styling note, garment highlights, or city/location vibe)\n- aspect ratio: `16:9`, `9:16`, or `1:1`\n- exactly one character blueprint\n- 1 to 4 clothing reference images (`referenceImages`)\n\n## Workflow\n\n1. Read `references/street-lookbook-proposal-contract.md` and produce Phase A.\n2. Stop for approval.\n3. After approval, read `references/street-lookbook-prompt-contract.md` and produce Phase B.\n",
  references: [
    {
      path: "references/street-lookbook-proposal-contract.md",
      content:
        "# Street Fashion Lookbook Proposal Contract (Phase A)\n\n## Header\n\n1. Titles in the planning language and in English\n2. Duration, clip count, loop mode: always Linear\n3. Styling thesis (silhouette, fabric texture, and urban mood)\n4. Location & light palette (architectural street spots: stone steps, canal bridge railing, street corner wall, vintage lamppost; soft golden-hour or overcast daylight)\n5. Cast lock (face & hair from blueprint) and Wardrobe lock (garments mapped from `referenceImages`)\n\n## Storyboard rhythm\n\n- Assign `referenceImageIds` on every clip to the clothing reference photo worn in that clip. When multiple clothing photos are attached, cycle across them so every outfit is showcased.\n- Vary shot size and angle every clip (`full-body-silhouette` → `medium-garment-detail` → `full-body-silhouette` → `back-over-shoulder` → `medium-garment-detail`). Never repeat the same spot and pose twice in a row.\n- `englishVo` is always `\"(no dialogue)\"`.\n",
    },
    {
      path: "references/street-lookbook-prompt-contract.md",
      content:
        "# Street Fashion Lookbook Clip Prompt Contract (Phase B)\n\nOne prompt per approved clip.\n\n1. Duration 5 seconds, `englishVo` is `\"(no dialogue)\"`.\n2. Face, hair, and non-reflective matte skin texture locked to the character blueprint; complete outfit locked 100% to that clip's clothing reference image.\n3. Camera holds a steady editorial frame or a subtle slow push/pan while the model performs one composed fashion micro-action (shifting weight on stone steps, leaning on a bridge railing, lifting the coat collar, or turning over the shoulder) with natural fabric drape and wind micro-physics.\n4. Mouth stays softly closed (zero lip-sync).\n",
    },
  ],
  profile: {
    bestFor:
      "Clothing demos, streetwear & outerwear lookbooks, and digital magazine fashion reels (Esquire / Paris Fashion Week style) that showcase garment silhouette, fabric drape, and tailoring details.",
    structure:
      "Multi-angle urban montage across 4–10 clips, alternating full-body silhouette shots, medium collar/fabric detail shots, and 3/4 over-the-shoulder views across architectural street spots.",
    hook:
      "Opens on a striking full-body low-angle or seated stone-step shot that immediately establishes the hero outfit silhouette.",
    arc:
      "Rotates across architectural street spots (stone steps, canal bridge railing, street corner wall, lamppost) and cycles through the uploaded clothing reference outfits, showcasing full-body drape, close-up collar/closure details, and back tailoring.",
    narrator:
      "Silent (`(no dialogue)`). The character never speaks or lip-syncs; expression stays calm, contemplative, and editorial.",
    visual:
      "Natural daylight on textured urban stone, iron bridges, and street facades. Face and hair stay on the character blueprint; worn garments match the uploaded clothing reference images 100%.",
    audio:
      "No voiceover; subtle urban breeze and fabric movement Foley.",
    rules:
      "Requires 1 character and 1–4 clothing reference images. Face/hair come from the character blueprint; clothes come 100% from the clothing reference images.",
  },
  behavior: {
    keyframeMode: "start-only",
    chainsClipStarts: false,
    anchorsFramesToFirstClip: false,
    dualBeat: false,
    maxBackgroundSets: 4,
    speechMode: "silent",
    bansNarration: true,
    requiredCastCount: 1,
    selfShotCreatorCamera: false,
    forcesSceneText: false,
    allowsInWorldLabels: false,
    attachesTextStyleReference: false,
    requiresSpokenScript: false,
    allowsRoomBackgroundUpload: false,
    allowsOpeningPhotoUpload: false,
    allowsBrandLogoUpload: false,
    maxStyleCount: 1,
    hiddenInPicker: false,
  },
} as const;

// Hardcoded director definition for "street-lookbook-director".
export const streetLookbookDirector: IDirector = {
  _id: "6ae2ca000000000000000020",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-29T05:00:00.000Z"),
  updatedAt: new Date("2026-10-29T05:00:00.000Z"),
};
