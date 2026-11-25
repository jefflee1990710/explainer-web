// Turns library characters into the shared face + full-body dropdown options.

import type { CanvasPreviewOption } from "@/app/app/canvas/nodes/canvas-preview-select";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";

export function libraryCharacterChoices(
  characters: readonly CanvasLibraryCharacterOption[],
  emptyLabel: string,
): CanvasPreviewOption[] {
  return [
    { value: "", label: emptyLabel },
    ...characters.map((character) => {
      const face = character.portraitUrl;
      const body = character.fullBodyUrl;
      return {
        value: character.id,
        label: character.name,
        previewUrl: face || body || character.previewUrl,
        previewShape: face ? ("square" as const) : ("body" as const),
        previewFit: face ? ("cover" as const) : ("contain" as const),
        ...(face && body
          ? {
              secondaryPreviewUrl: body,
              secondaryShape: "body" as const,
              secondaryFit: "contain" as const,
            }
          : {}),
      };
    }),
  ];
}
