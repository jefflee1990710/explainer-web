import type { MessageShape } from "@/util/i18n/messages/workspace/message-shape";

export const briefEn = {
  error: {
    aspectRatioRequired: "Choose an aspect ratio.",
    castCount: "This director requires exactly {n} characters.",
  },
  fallback: {
    unnamedVideo: "Untitled video",
    videoType: "Video type",
    visualStyle: "Visual style",
  },
  section01: {
    title: "Video type",
    hint: "Pick a narrative mode: explainer, story, demo, Q&A, listicle, or tutorial.",
  },
  visualStyle: {
    title: "Visual style",
    hint: "Look for storyboards and clips; characters must match this style.",
  },
  cast: {
    title: "Characters",
    hintRequiredTwo:
      "Pick exactly 2 characters (asker and answerer). Only characters in the style above are shown.",
    hintOptional: "Optional. Up to 4; only characters in the style above are shown.",
  },
  section02: {
    title: "Topic or script",
    hint: "Paste an article, product copy, or the idea you want to explain.",
  },
  source: {
    label: "Topic or script",
    placeholder:
      "For example: Why compound interest matters for young adults — explain with a simple metaphor and one action step.",
    charCount: "{n} characters",
  },
  section03: {
    titleDialogue: "Dialogue language & pace",
    titleNarration: "Voiceover language, pace & voice",
    hintDialogue:
      "Characters speak in this language at this pace; voices are inferred at render time. There is no narrator. Phase A storyboard planning fields use the same language.",
    hintNarration:
      "The video uses this language, pace, and male/female narrator. Phase A storyboard planning fields use the same language.",
  },
  speechPaceSection: {
    title: "Speaking pace",
    hint: "Affects how many words fit each clip: slower uses fewer words with pauses; faster uses more.",
  },
  voiceSection: {
    title: "Narrator voice",
    hint: "The narrator locks to this adult voice for the whole video.",
  },
  section04: {
    title: "On-screen text",
    hintListicle: "Listicle directors show item titles on screen — pick the text language.",
    hintDefault: "Each storyboard still can show on-screen text — pick the text language.",
  },
  section05: {
    title: "Aspect ratio",
    hint: "Choose for your target platform.",
  },
  section06: {
    title: "Length",
    hint: "Sets clip count and how many credits rendering will use.",
    hintBookend: "Opening and Ending are always one 3–4 second clip, so length is fixed.",
  },
  logo: {
    title: "Logo",
    hint: "Optional. The director builds both scene images around this logo. PNG with a transparent background works best.",
    upload: "Upload logo",
    replace: "Replace logo",
    remove: "Remove",
    alt: "Brand logo",
    fixedLength: "Fixed length: 1 clip, 3–4 seconds.",
  },
  talkingHead: {
    hint: "One sentence is one clip. Length follows the word count (up to 20 clips). A sentence over 12 seconds must be shortened — it will not be split.",
  },
  submit: {
    submitting: "Submitting…",
    regenerate: "Generate again",
    saveAndRegenerateStoryboard: "Save & regenerate storyboard",
    start: "Start",
  },
  footer: {
    castRequired: "Pick exactly {n} characters before you start.",
    restartWarning:
      "This deletes the storyboard, frames, and clips for this video, then runs Phase A again. Spent credits are not refunded.",
    editBriefWarning:
      "Changing the topic rewrites the storyboard and returns to production. Existing frames and clips may no longer match.",
    noCharge:
      "This step does not spend credits. After the storyboard is ready you go straight to production; frames and clips charge then.",
  },
  summary: {
    speechPace: "Pace · {label}",
    sceneText: "On-screen text · {label}",
    bookendLength: "1 clip · 3–4s",
    talkingHeadLength: "1 sentence · 1 clip · up to 20",
    logo: "Logo",
  },
  confirm: {
    regenerateStoryboard: {
      title: "Regenerate storyboard?",
      body: "Rewrites the storyboard from this brief and returns to production. Existing frames and clips may no longer match.",
      confirm: "Confirm rewrite",
    },
    restart: {
      title: "Start this video over?",
      body: "Permanently deletes this video’s storyboard, frames, and clips, then regenerates from the form. Spent credits are not refunded.",
      confirm: "Delete & regenerate",
      pending: "Restarting…",
    },
  },
  failed: {
    title: "Something went wrong",
    retryDefault: "Please try again.",
    retryToProduction: "Back to production — redo clips",
    retryRegenerateStoryboard: "Regenerate storyboard",
    creditsRefunded: "Credits for the failed step were refunded; retry will not double-charge.",
  },
  language: {
    ariaDialogue: "Dialogue language",
    ariaNarration: "Voiceover language",
  },
  speechPace: { aria: "Speaking pace" },
  voice: { aria: "Narrator voice" },
  sceneText: { aria: "On-screen text language" },
  duration: { aria: "Target length" },
  aspectRatio: { aria: "Aspect ratio" },
  skill: { empty: "No video types available.", aria: "Video type" },
  videoTypes: {
    "cartoon-explainer-video-director": "Whiteboard concept explainer",
    "story-short-director": "Short film",
    "product-demo-director": "Product demo / unboxing",
    "dialogue-qa-director": "Two-character Q&A",
    "listicle-director": "Listicle",
    "tutorial-director": "Step-by-step tutorial",
    "opening-director": "Opening",
    "ending-director": "Ending",
    "talking-head-director": "Talking-head read",
  },
  skillGuide: {
    labels: {
      voice: "Voice",
      structure: "Structure",
      picture: "Picture",
      frames: "Frames",
    },
    types: {
      "cartoon-explainer-video-director": {
        voice: "Narrator reads the VO (the male or female voice you picked)",
        structure: "Hook → unpack the idea → delay the payoff",
        picture: "Whiteboard doodles, morphing icons, handwritten labels",
        frames: "Two beats per clip: one VO line on the start frame, one on the end",
      },
      "story-short-director": {
        voice: "Character dialogue, no narrator; voices are matched per character when the clip renders",
        structure: "Story order follows the source — no fixed four-beat arc",
        picture: "Follows the visual style you picked; emotion through pose, little on-screen text",
        frames: "One dialogue line per clip, or marked silent",
      },
      "product-demo-director": {
        voice: "Narrator or host, speaking benefits to “you”",
        structure: "Pain → unbox → feature demo → result",
        picture: "Product look stays locked; hands and the product lead",
        frames: "One action per clip, matched to one visible result",
      },
      "dialogue-qa-director": {
        voice: "Two characters talk (ask / answer); no narrator",
        structure: "Questions build curiosity; answers deliver the point",
        picture: "Fixed left and right positions; props or diagrams in the middle",
        frames: "One question or one answer per clip (a short exchange can share a clip)",
      },
      "listicle-director": {
        voice: "Host narration; every item uses the same sentence shape",
        structure: "Open with N items → one item per clip → best item last",
        picture: "Every still shows a numbered list with the current item highlighted",
        frames: "One item per clip: the number pops in, then the image",
      },
      "tutorial-director": {
        voice: "Imperative narration (cut, tap, add)",
        structure: "Show the finished result → one step per clip → return to the finished piece",
        picture: "One workspace; step numbers as props",
        frames: "One action and one state change per clip",
      },
      "opening-director": {
        voice: "At most one brand name or tagline, or no speech",
        structure: "Exactly 1 clip, 3–4 seconds: the logo arrives and settles",
        picture: "The uploaded logo is the hero on a clean canvas",
        frames: "Start: logo still forming → end: full logo centered",
      },
      "ending-director": {
        voice: "At most one sign-off or CTA, or no speech",
        structure: "Exactly 1 clip, 3–4 seconds: resolve onto the logo card",
        picture: "The uploaded logo is the hero and the final frame",
        frames: "Start: closing motion → end: full logo centered",
      },
      "talking-head-director": {
        voice: "The character reads the script to camera (the voice you picked)",
        structure: "One sentence per clip; length follows the word count, up to 20 clips",
        picture: "One locked medium close-up, eyes to the lens, one subtitle line at the bottom",
        frames: "The next clip’s start frame continues the previous end frame",
      },
    },
  },
  castPicker: {
    errorRequiredCount:
      "This director requires exactly {required} characters. Only {ready} are ready in this style.",
    errorNoStyleCharacters: "No characters exist for this style yet.",
    errorNone: "No characters available yet.",
    linkCreate: "Create characters first →",
    linkManage: "Manage characters",
    aria: "Characters",
    statusExactOk: "Selected {selected} / {required}",
    statusExactShort: "Need exactly {required}; {short} more",
    statusExactOver: "Need exactly {required}",
    statusOptional: "Selected {selected} / {max}",
  },
  revise: {
    defaultTitle: "Rewrite the storyboard with AI?",
    defaultBody: "This replaces the whole proposal below. You can still edit fields by hand afterward.",
    pending: "Rewriting…",
    defaultConfirm: "Confirm rewrite",
  },
  storyboard: {
    kicker: "Phase A · Storyboard proposal",
    intro: "Edit titles, message, and each clip row directly, or use AI revise below.",
    chipClips: "{n} clips",
    chipSceneText: "On-screen text · {label}",
    chipLinearEnding: "Linear ending",
    replanPending: "Planning…",
    replan: "Replan clips",
    columnClip: "Clip",
    columnScene: "Scene",
    revisePrompt: "What should change?",
    reviseHint: "You can edit fields above and save, or describe changes for AI.",
    revisePlaceholder: "For example: stronger hook, add a CTA at the end, lighter tone",
    savePending: "Saving…",
    save: "Save edits",
    revisePending: "Rewriting…",
    revise: "Rewrite proposal",
    approvedTitle: "Storyboard approved — edits still allowed",
    approvedBody: "Saving text marks matching frames/clips stale until you redraw.",
    approvedBack: "Save & back",
    approveTitle: "Approve storyboard & start production",
    approvePricing:
      "Approval is free. Each clip is generated separately: frames {frameCost} credits each, video billed per second.",
    approveRemaining: "({remaining} left)",
    approveTip: "Try clip 1 first to see the look before running the rest.",
    approveSubscribeRequired: "Not subscribed; production buttons need an active plan.",
    approvePending: "Submitting…",
    approve: "Approve & start production",
    confirmReplanClipsTitle: "Replan clips below?",
    confirmReviseAllTitle: "Rewrite the storyboard with AI?",
    confirmReplanClipsBody: "Replans every clip row from the proposal above.",
    confirmReplanClipsConfirm: "Confirm replan",
  },
  proposal: {
    title: "Title",
    englishTitle: "English title",
    coreMessage: "Core message",
    hook: "Opening hook",
    narrator: "Narrator",
    castVoice: "Character voices",
    visualWorld: "Visual world",
  },
  clipRow: {
    sceneMobile: "Scene",
    startScene: "Start frame",
    placeholderStartScene: "t=0 still: pose, props, environment.",
    endScene: "End frame",
    placeholderEndScene: "t=N still: same shot, next beat.",
    explainerScene: "Scene description",
    placeholderExplainerScene: "What appears in this clip.",
    motion: "Motion & camera",
    placeholderMotion: "Camera and action between the two frames.",
  },
  director: {
    title: "Director is writing the storyboard",
    stageReadSource: "Reading the brief and core message…",
    stageHook: "Designing hook and delayed payoff…",
    stageTimeline: "Breaking into clips and timeline…",
    stageVo: "Writing voiceover and reference translation…",
    stageLocks: "Checking cast lock and visual world…",
    eta: "Usually 20–60 seconds. Production starts automatically when ready.",
  },
  aspectRatioHints: {
    "9_16": "Reels / Shorts",
    "16_9": "YouTube / decks",
    "1_1": "Feed / ads",
  },
} as const;

export type BriefMessages = MessageShape<typeof briefEn>;
