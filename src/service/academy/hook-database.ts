// Public reference of all kinds of Instagram Reel hooks user can adapt, with live Instagram examples.
// Spoken/text hook lines stay in English because the Academy courses teach English reels.

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
  // 1. Speed / Motion Hook
  {
    id: "speed-downhill-coastal",
    shape: "speed",
    line: "Your AI influencer. Downhill energy. Same coastal highway. Same Scro.",
    note: "Speed hook: open mid-motion with fast camera movement in frame one so the eye stops before the caption is read.",
    exampleHandle: "@scro.io",
    exampleCaption: "Downhill coastal highway ride — motion-first speed hook.",
    exampleUrl: "https://www.instagram.com/p/De5rxgaxSYn/",
  },
  {
    id: "speed-ten-visual-hooks",
    shape: "speed",
    line: "Immediately pick something up, or quickly pan, cut, or zoom in during the first second.",
    note: "Physical movement or a fast camera move interrupts the thumb before the viewer decides to scroll.",
    exampleHandle: "@iammichellegifford",
    exampleCaption: "10 visual hooks to stop the scroll: pick something up, pan, cut, or zoom.",
    exampleUrl: "https://www.instagram.com/reel/DL5q6Y7SIbt/",
  },
  {
    id: "speed-appear-interrupt",
    shape: "speed",
    line: "Most videos don't need better content — they need a better first second.",
    note: "Sudden movement or an appear cut creates a pattern interrupt that makes the brain wait for the next beat.",
    exampleHandle: "@keenyakelly",
    exampleCaption: "Appear-cut visual hook that interrupts the scroll in second one.",
    exampleUrl: "https://www.instagram.com/reel/DUfpXuKksZ3/",
  },

  // 2. Result / Proof Hook
  {
    id: "result-shop-tap",
    shape: "result",
    line: "Three shots that make people tap the shop.",
    note: "Name the count and the action. The viewer knows what the next seconds will prove.",
    exampleHandle: "@millionaire_mentor_academy",
    exampleCaption: "20 proven viral hooks — lead with the concrete outcome or 30-day test.",
    exampleUrl: "https://www.instagram.com/p/Dc0cJXhgYZM/",
  },
  {
    id: "result-returns",
    shape: "result",
    line: "The one label change that stopped the returns.",
    note: "One change, one business result. Do not list the rest of the packaging.",
    exampleHandle: "@shannonmckinstrie",
    exampleCaption: "RISE hook method: specific numbers, timeframes, and the exact payoff.",
    exampleUrl: "https://www.instagram.com/reel/DbqPpULua9V/",
  },
  {
    id: "result-calls",
    shape: "result",
    line: "How I booked four calls from one reel.",
    note: "A number plus the thing they want. The proof is the reel they are already watching.",
    exampleHandle: "@erinkienzle",
    exampleCaption: "50 viral Reel hooks built around measurable outcomes.",
    exampleUrl: "https://www.instagram.com/reel/DB_V_8JxzDi/",
  },

  // 3. Mistake / Warning Hook
  {
    id: "mistake-second-four",
    shape: "mistake",
    line: "This is why your talking-head dies at second four.",
    note: "Point at a failure they can feel. Then show the fix, not a lecture.",
    exampleHandle: "@soravjain",
    exampleCaption: "Kill the intro — start with the mistake or outcome in the first 3 seconds.",
    exampleUrl: "https://www.instagram.com/reel/DbYhJhnJriG/",
  },
  {
    id: "mistake-logo",
    shape: "mistake",
    line: "Stop opening with your logo.",
    note: "The brand name is about you. The first second has to be about them.",
    exampleHandle: "@tanishaabhansali",
    exampleCaption: "30 text hook templates: 'Stop doing ___ (do this instead)' and mistake callouts.",
    exampleUrl: "https://www.instagram.com/reel/DaUa96fhKN0/",
  },
  {
    id: "mistake-caption",
    shape: "mistake",
    line: "Your caption is doing the job of the first sentence.",
    note: "Use when the spoken line and the on-screen words do not match.",
    exampleHandle: "@thekatelynrhoades",
    exampleCaption: "Visual hook, text-overlay hook, and caption hook working together.",
    exampleUrl: "https://www.instagram.com/reel/Dc1ZIfaxHqj/",
  },

  // 4. Contrast / Before & After Hook
  {
    id: "contrast-photoshoot",
    shape: "contrast",
    line: "I replaced the weekly photoshoot with one locked character.",
    note: "Old way, then the new way. Keep both sides in one sentence.",
    exampleHandle: "@marketingharry",
    exampleCaption: "Viral contrast frameworks: Pro vs Noob and old way vs new way.",
    exampleUrl: "https://www.instagram.com/p/Dcu4Cv3jlRg/",
  },
  {
    id: "contrast-same-face",
    shape: "contrast",
    line: "Same face. Three hooks. No new setup.",
    note: "For a repeat format. Familiarity is the point, so say what stayed fixed.",
    exampleHandle: "@neshawoolery",
    exampleCaption: "Stacking visual, sound, written, and caption hooks on one format.",
    exampleUrl: "https://www.instagram.com/reel/DQj10VxDOo2/",
  },
  {
    id: "contrast-caption-once",
    shape: "contrast",
    line: "I used to rewrite the caption. Now the character says it once.",
    note: "A before-and-after of the workflow, not of the whole product.",
    exampleHandle: "@social.yourmedia",
    exampleCaption: "'She stopped doing this one thing and her results finally changed.'",
    exampleUrl: "https://www.instagram.com/reel/DamoLHMt3uh/",
  },

  // 5. Pain / Problem Callout Hook
  {
    id: "pain-same-caption",
    shape: "pain",
    line: "You are still rewriting the same caption.",
    note: "Use the buyer's complaint, not the slogan on the box.",
    exampleHandle: "@manychat",
    exampleCaption: "3 hook layers (visual, audio, text) that call out the viewer's problem.",
    exampleUrl: "https://www.instagram.com/reel/DPjGH_uAAtk/",
  },
  {
    id: "pain-hate-filming",
    shape: "pain",
    line: "You hate filming, so the account stays quiet.",
    note: "Name the person in five words or fewer, then the cost of doing nothing.",
    exampleHandle: "@impactmediahouse",
    exampleCaption: "Walk into frame mid-action or start mid-thought to hook reluctant creators.",
    exampleUrl: "https://www.instagram.com/p/DXHZjSCESNi/",
  },
  {
    id: "pain-wrong-pack",
    shape: "pain",
    line: "The pack looks right in the photo and wrong in the video.",
    note: "A product hook. The next shot has to show the real pack.",
    exampleHandle: "@heyimtran",
    exampleCaption: "4-way split-screen visual hook showing consumer pain points before the product.",
    exampleUrl: "https://www.instagram.com/reel/DAHNhToJ7pu/",
  },

  // 6. Curiosity Gap / Secret Hook
  {
    id: "curiosity-unfinished-info",
    shape: "curiosity",
    line: "Nobody talks about what happens to your reach after second three.",
    note: "Open an information gap the viewer can only close by watching the payoff.",
    exampleHandle: "@evelongfield_",
    exampleCaption: "Why curiosity hooks hold attention: reveal just enough to spark the gap.",
    exampleUrl: "https://www.instagram.com/reel/DV0ZpLnkVMG/",
  },
  {
    id: "curiosity-wish-more-knew",
    shape: "curiosity",
    line: "I wish more business owners knew this before filming their next reel.",
    note: "Frames the tip as an insider shortcut rather than a generic tutorial.",
    exampleHandle: "@shannonmckinstrie",
    exampleCaption: "'I wish more people knew ___' — 3 viral curiosity hooks that earned millions of views.",
    exampleUrl: "https://www.instagram.com/reel/DF9iXDxO3AN/",
  },
  {
    id: "curiosity-five-hooks-one-idea",
    shape: "curiosity",
    line: "Have you ever wondered why one 7-second clip outsells a full studio shoot?",
    note: "Turn one core idea into a curiosity question or cliffhanger ('Do you want to know what happens if…').",
    exampleHandle: "@rico.incarnati",
    exampleCaption: "5 viral hook angles (curious, hate, vs, positive, cliffhanger) from 1 idea.",
    exampleUrl: "https://www.instagram.com/reel/Cz1ePMWRpT1/",
  },

  // 7. Hot-Take / Contrarian Opinion Hook
  {
    id: "hottake-unpopular-opinion",
    shape: "hotTake",
    line: "You're not going to want to hear this, but posting daily is not fixing a weak offer.",
    note: "Challenge a safe industry belief in one sentence, then prove your point with one example.",
    exampleHandle: "@hellotruebeauty",
    exampleCaption: "'You're not going to want to hear this, but (UNPOPULAR OPINION)' hook breakdown.",
    exampleUrl: "https://www.instagram.com/reel/DFB0vsspv3l/",
  },
  {
    id: "hottake-dont-know-know",
    shape: "hotTake",
    line: "I don't know-know that refusing to use AI is costing you thousands a month, but I know.",
    note: "Playful conviction hook paired with B-roll — states a bold belief your ideal buyer already suspects.",
    exampleHandle: "@briennewilliams",
    exampleCaption: "'I don't know-know {X}, but I know…' — high-retention opinion hook for business.",
    exampleUrl: "https://www.instagram.com/reel/DVZg2wqkvp4/",
  },
  {
    id: "hottake-negative-vs-positive",
    shape: "hotTake",
    line: "Stop trying to go viral. Make a reel that makes five buyers DM you.",
    note: "Flip a goal everyone chases into the business metric that actually pays.",
    exampleHandle: "@rico.incarnati",
    exampleCaption: "Negative hook vs positive hook vs how-to hook on the same topic.",
    exampleUrl: "https://www.instagram.com/reel/CryPzr1OxRU/",
  },

  // 8. POV / Story Open Hook
  {
    id: "pov-tired-founder",
    shape: "pov",
    line: "POV: You're a founder who hates being on camera, and you just locked your AI spokesperson.",
    note: "Call out the exact role and relief in one breath so the right viewer feels seen immediately.",
    exampleHandle: "@shannonmckinstrie",
    exampleCaption: "'POV: You're a ___ who's tired of ___ and then you find ___' — 5-minute Reel hooks.",
    exampleUrl: "https://www.instagram.com/reel/DVd1ZFdDoVC/",
  },
  {
    id: "pov-story-three-starts",
    shape: "pov",
    line: "Three months ago I deleted our entire content calendar and kept one repeatable format.",
    note: "Start inside the turning point (time + action + outcome), never with background history.",
    exampleHandle: "@philipp_humm",
    exampleCaption: "3 best hooks to start a story without losing the room in second one.",
    exampleUrl: "https://www.instagram.com/reel/C7g1eULP6UG/",
  },
  {
    id: "pov-ugc-ruined-life",
    shape: "pov",
    line: "This one product workflow ruined my old production schedule in the best way.",
    note: "Dramatic first-person UGC opener that pivots straight into the product demonstration.",
    exampleHandle: "@jadetheecreative",
    exampleCaption: "10 UGC portfolio & brand-deal hooks starting with a bold first-person statement.",
    exampleUrl: "https://www.instagram.com/reel/DEaG1Whx3gw/",
  },

  // 9. Listicle / How-To Hook
  {
    id: "listicle-three-editing-tricks",
    shape: "listicle",
    line: "Three editing tricks I use in every talking-head reel so nobody scrolls in silence.",
    note: "Promise a tight, numbered list and deliver the first item before second three.",
    exampleHandle: "@ugcwithkaytelynn",
    exampleCaption: "3 editing tricks used in every UGC talking-head video to remove dead air.",
    exampleUrl: "https://www.instagram.com/reel/DV1lpssDqGW/",
  },
  {
    id: "listicle-three-step-formula",
    shape: "listicle",
    line: "The 3-part checklist every hook needs: curiosity, emotion, and relevance.",
    note: "Give the framework name and count upfront so viewers stay to collect all parts.",
    exampleHandle: "@rico.incarnati",
    exampleCaption: "The 3-step formula for viral hooks: curiosity, emotion, and relevance.",
    exampleUrl: "https://www.instagram.com/reel/C4n5dSwxBO2/",
  },
  {
    id: "listicle-broll-folder",
    shape: "listicle",
    line: "How to combine talking head, B-roll, and voiceover from one reusable clip folder.",
    note: "Clear 'how-to' utility hook — tells the viewer the exact workflow they will walk away with.",
    exampleHandle: "@b_adkison",
    exampleCaption: "UGC workflow example combining talking head, B-roll folder, and voiceover.",
    exampleUrl: "https://www.instagram.com/reel/DQqPaLiDXCA/",
  },

  // 10. Series / Episode Hook
  {
    id: "series-day-one",
    shape: "series",
    line: "Day 1: write the hook before you open the camera.",
    note: "Put the episode number in the first second, spoken and on screen.",
    exampleHandle: "@socialwithmj",
    exampleCaption: "Day ONE: Posting for 30 days straight — numbered series opener.",
    exampleUrl: "https://www.instagram.com/reel/C6fefbvAOjV/",
  },
  {
    id: "series-part-two",
    shape: "series",
    line: "Part 2: the shot I cut because it taught a second idea.",
    note: "The number tells them there is a next one. One idea still owns this reel.",
    exampleHandle: "@sarahjamesliving",
    exampleCaption: "Day 1/30 series format that sets up daily follow-along episodes.",
    exampleUrl: "https://www.instagram.com/reel/C6rfG-IJCCM/",
  },
  {
    id: "series-week-three",
    shape: "series",
    line: "Week 3: keep the hook that held them past three seconds.",
    note: "Steal a winning shape. Change the example, not the opener type.",
    exampleHandle: "@graysoncreates",
    exampleCaption: "Repeatable pattern-interrupt series mechanics that hold retention.",
    exampleUrl: "https://www.instagram.com/reel/C-kwA_nJdzk/",
  },
];
