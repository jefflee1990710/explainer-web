// Realistic product sheet. The video style must never restyle this object.
export function buildProductBlueprintPrompt(input: { name: string; description: string; referenceCount: number }) {
  const lines = [
    "Photorealistic product reference sheet on a plain white background.",
    "Show this exact product only: a clear front view, a three-quarter view, and a side view, evenly lit, no cast shadow.",
    "Keep the real materials, colors, logo, packaging text, proportions, and shape from the attached photos.",
    "Do not illustrate, cartoon, restyle, redesign, or beautify the product.",
    "No lifestyle scene, no hands, no extra products, no captions, no watermark.",
    `Product name: ${input.name}.`,
  ];
  if (input.description.trim()) lines.push(`Notes: ${input.description.trim()}`);
  if (input.referenceCount > 1) {
    lines.push("Fuse every attached photo into one product. Do not invent parts that are not visible.");
  }
  return lines.join(" ");
}

// Shared lock so frames and posters leave the product looking like the sheet.
export function productLockParagraph(names: string[], start: number, count: number) {
  if (count <= 0) return "";
  const which =
    count === 1 ? `attached image ${start} is` : `attached images ${start}–${start + count - 1} are`;
  const label = names.filter(Boolean).join(", ");
  return [
    `PRODUCT LOCK: ${which} the real product${label ? ` (${label})` : ""}.`,
    "Keep the product photorealistic and identical to that reference: same shape, materials, colors, logo, and packaging.",
    "Do not redraw the product in the illustration or poster style. Only the surrounding scene follows the chosen style.",
  ].join(" ");
}

export function productReferenceUrls(products?: { blueprintUrl?: string }[]) {
  return (products ?? []).map((item) => item.blueprintUrl).filter((url): url is string => Boolean(url));
}
