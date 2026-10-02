import { loadDirectorImageParts } from "@/service/character/cast-prompt";
import { referenceImageLabel } from "@/service/project/reference-images";
import type { ReferenceImage } from "@/model/project";

type ContentPart = { type: "text"; text: string } | { type: "image"; image: Uint8Array };

// Label + bytes per reference image. A failed download is skipped, not fatal.
export async function loadReferenceImageContent(images: ReferenceImage[] = []) {
  const parts: ContentPart[] = [];
  const attached: ReferenceImage[] = [];
  for (const image of images) {
    try {
      const [part] = await loadDirectorImageParts([image.url]);
      if (!part) continue;
      parts.push({ type: "text", text: referenceImageLabel(image) }, part);
      attached.push(image);
    } catch (error) {
      console.error("[phase-a] reference image skipped", { id: image.id, error });
    }
  }
  return { parts, attached };
}
