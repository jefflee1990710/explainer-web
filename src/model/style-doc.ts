import { z } from "zod";
import { styleIdSchema, type StyleId } from "@/model/style-id";

// Generated state only; definitions live in src/service/style/catalog.ts.
export type StyleDoc = {
  _id: StyleId;
  // Picker thumbnail (768px WebP).
  previewUrl?: string;
  // Original full-size PNG the thumbnail was built from.
  previewFullUrl?: string;
  previewHash?: string;
  previewRequestId?: string;
  updatedAt: Date;
};

export const styleDocSchema: z.ZodType<StyleDoc> = z.object({
  _id: styleIdSchema,
  previewUrl: z.string().optional(),
  previewFullUrl: z.string().optional(),
  previewHash: z.string().optional(),
  previewRequestId: z.string().optional(),
  updatedAt: z.date(),
});
