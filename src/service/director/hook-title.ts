/** Where and how the Clip 1 hook title sits, shared by Phase A rules and still prompts for every director. */
export const HOOK_TITLE_PLACEMENT =
  "centered, slightly above the vertical center (about 35–45% from the top; never at the top edge), on a high-contrast plate with a thick solid border, clear of the face";

// Still-prompt line for Clip 1's opening frame when the Scene names a 「」 hook title.
export function hookTitleFrameLine() {
  return `Clip 1 hook title: the Scene's 「...」 hook is ONE BIG, BOLD headline, ${HOOK_TITLE_PLACEMENT}. Spell it exactly.`;
}
