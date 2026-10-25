// Public reference of Instagram Reel hooks. Spoken lines stay in English because the courses teach English reels.
// Only the Scro speed-hook reel is listed for now.

export const HOOK_SHAPES = [
  "speed",
  "result",
  "mistake",
  "contrast",
  "pain",
  "curiosity",
  "hotTake",
  "pov",
  "listicle",
  "series",
] as const;

export type HookShape = (typeof HOOK_SHAPES)[number];

export type AcademyHook = {
  id: string;
  shape: HookShape;
  line: string;
  note: string;
  exampleHandle: string;
  exampleCaption: string;
  exampleUrl: string;
};

export const ACADEMY_HOOKS: readonly AcademyHook[] = [
  {
    id: "speed-downhill-coastal",
    shape: "speed",
    line: "Your AI influencer. Downhill energy. Same coastal highway. Same Scro.",
    note: "Speed hook: open mid-motion with fast camera movement in frame one so the eye stops before the caption is read.",
    exampleHandle: "@scro.io",
    exampleCaption: "Downhill coastal highway ride — motion-first speed hook.",
    exampleUrl: "https://www.instagram.com/p/De5rxgaxSYn/",
  },
];
