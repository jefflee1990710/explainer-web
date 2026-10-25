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

export function academyVideoPrompt(input: {
  motion: string;
  spoken: string;
  beatIndex: number;
  beatCount: number;
}): string {
  const beat = input.beatIndex + 1;
  return [
    `Educational 15-second beat ${beat} of ${input.beatCount} in a 60-second 16:9 lesson video.`,
    "Keep the first-frame diagram's layout and labels. Do not redesign the frame.",
    "No music. No extra logos.",
    `A calm narrator speaks only this beat's lines, then stops. The full lesson voiceover is about one minute.`,
    "",
    `Motion this beat: ${input.motion.trim()}`,
    "",
    `Spoken line, exactly: "${input.spoken.trim()}"`,
  ].join("\n");
}
