// Shared look for Academy diagrams so every lesson reads as one course.
export const ACADEMY_IMAGE_STYLE = [
  "Flat editorial infographic on warm off-white paper.",
  "Ink black shapes (#12141c), lime highlights (#C6F24B), thin black lines, lots of whitespace.",
  "Short English labels only, spelled exactly as written in the subject.",
  "No photographs, no celebrity faces, no real brand logos, no watermarks, no paragraphs of tiny text.",
].join(" ");

export function academyImagePrompt(subject: string): string {
  return [
    ACADEMY_IMAGE_STYLE,
    "Spell every label exactly as written. Do not paraphrase a label.",
    "Do not add lorem ipsum, dummy Latin, or extra sentences.",
    "",
    subject,
    "",
    "One clear 16:9 diagram. Large readable type.",
  ].join("\n");
}

export function academyVideoPrompt(direction: string): string {
  return [
    "Educational 5-second 16:9 motion graphic for a business course.",
    "Keep the first-frame diagram's layout and labels. Do not redesign the frame.",
    "No music. No extra logos. A calm narrator speaks the one line below, then stops.",
    "",
    direction.trim(),
  ].join("\n");
}
