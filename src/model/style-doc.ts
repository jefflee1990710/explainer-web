import { z } from "zod";
import { styleIdSchema, type StyleId } from "@/model/style-id";

// Style row in Mongo. Prompt fields are the source of truth; previews stay optional.
export type StyleDoc = {
  _id: StyleId;
  name?: string;
  description?: string;
  canvas?: string;
  canvasColor?: string;
  look?: string;
  palette?: string;
  typography?: string;
  motion?: string;
  negatives?: string;
  // Picker thumbnail (768px WebP).
  previewUrl?: string;
  // Original full-size PNG the thumbnail was built from.
  previewFullUrl?: string;
  previewHash?: string;
  previewRequestId?: string;
  updatedAt: Date;
};

const optionalString = z.string().optional();

export const styleDocSchema: z.ZodType<StyleDoc> = z.object({
  _id: styleIdSchema,
  name: optionalString,
  description: optionalString,
  canvas: optionalString,
  canvasColor: optionalString,
  look: optionalString,
  palette: optionalString,
  typography: optionalString,
  motion: optionalString,
  negatives: optionalString,
  previewUrl: optionalString,
  previewFullUrl: optionalString,
  previewHash: optionalString,
  previewRequestId: optionalString,
  updatedAt: z.date(),
});
