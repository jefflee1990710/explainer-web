// Public post types a creator can shoot in Scro. Titles match the director catalog.

export const POST_TYPE_GROUPS = ["talk", "teach", "sell", "brand", "look"] as const;

export type PostTypeGroup = (typeof POST_TYPE_GROUPS)[number];

export type AcademyPostType = {
  id: string;
  group: PostTypeGroup;
  title: string;
  use: string;
  beats: string;
};

export const ACADEMY_POST_TYPES: readonly AcademyPostType[] = [
  {
    id: "talking-head",
    group: "talk",
    title: "Talking-head read",
    use: "The character looks into the lens and reads one short line per clip.",
    beats: "Line, line, line. Captions match the spoken words. No second idea.",
  },
  {
    id: "full-body-talking-head",
    group: "talk",
    title: "Full-body talking-head",
    use: "Same read, with the whole figure locked in frame so the outfit stays part of the post.",
    beats: "Full-body hold, one line, same background. Do not zoom into a new shot.",
  },
  {
    id: "talking-broll",
    group: "talk",
    title: "Talking-head and B-roll",
    use: "The face carries trust. The cutaway shows the thing they just named.",
    beats: "On camera, on camera, proof shot, back to the same close-up.",
  },
  {
    id: "surprise-interview",
    group: "talk",
    title: "Surprise interview",
    use: "Open on a surprised close-up, then sit down and explain one concept.",
    beats: "Reaction, then seated answers. One concept owns the rest of the reel.",
  },
  {
    id: "dialogue-qa",
    group: "talk",
    title: "Dialogue Q&A",
    use: "A question the buyer already has, then the answer in the character's voice.",
    beats: "Question card, answer, one example, one ask.",
  },
  {
    id: "tutorial",
    group: "teach",
    title: "Step-by-step tutorial",
    use: "Show the finished result first, then one visible step per clip.",
    beats: "Result, step, step, step, finished result again.",
  },
  {
    id: "listicle",
    group: "teach",
    title: "Listicle",
    use: "A numbered list. One item per clip, and save the strongest item for last.",
    beats: "Count in the first second, one item, one item, full list on the last card.",
  },
  {
    id: "cartoon-explainer",
    group: "teach",
    title: "Cartoon explainer",
    use: "One concept drawn as a doodle story. The picture teaches what the line says.",
    beats: "Hook, picture of the problem, picture of the fix, one ask.",
  },
  {
    id: "paper-cutout",
    group: "teach",
    title: "Paper-cutout explainer",
    use: "The same idea, built from paper pieces the viewer can track.",
    beats: "Hook, one paper move per beat, the idea lands on the last piece.",
  },
  {
    id: "story-short",
    group: "teach",
    title: "Story short",
    use: "A one-minute story with a turn. Not a tour of the whole product.",
    beats: "Open inside the problem, one turn, the outcome, one ask.",
  },
  {
    id: "product-demo",
    group: "sell",
    title: "Product demo",
    use: "The pack is the hero. The host only points at one use.",
    beats: "Pain, the real pack, one use, one buying ask.",
  },
  {
    id: "comparison",
    group: "sell",
    title: "Comparison card",
    use: "Two views of the same subject at once: before and after, or myth and fact.",
    beats: "Split frame from the first second. No third panel.",
  },
  {
    id: "workflow-promo",
    group: "sell",
    title: "Workflow and ROI promo",
    use: "A tool or service shown as a short path from mess to one result.",
    beats: "Interrupt, the old way, three steps, the number, brand close.",
  },
  {
    id: "opening-sting",
    group: "brand",
    title: "Opening sting",
    use: "A 3–4 second bumper before the main video. The logo arrives and settles.",
    beats: "One clip. No story. The brand is the only subject.",
  },
  {
    id: "ending-sting",
    group: "brand",
    title: "Ending sting",
    use: "A 3–4 second close. The scene resolves onto the logo.",
    beats: "One clip after the ask. The logo is the last card.",
  },
  {
    id: "outfit-reel",
    group: "look",
    title: "Outfit reel",
    use: "One complete look, already on the character. The camera moves; the clothes do not change.",
    beats: "Locked outfit, a new camera move each clip. No voiceover required.",
  },
  {
    id: "outfit-change",
    group: "look",
    title: "Outfit change",
    use: "Same person, same room, hard cut to the next complete outfit.",
    beats: "Look, cut, look, cut. One outfit owns each clip.",
  },
  {
    id: "follow-shot",
    group: "look",
    title: "Follow shot",
    use: "One third-person action split into clips. Each clip starts where the last one ended.",
    beats: "Walk, turn, or one gesture. The camera stays locked.",
  },
  {
    id: "style-switch",
    group: "look",
    title: "Multi-style showcase",
    use: "One locked character, hard-cut across visual styles. The face does not change.",
    beats: "Hook in style one, cut, same person in the next style.",
  },
];
