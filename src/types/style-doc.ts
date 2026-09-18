import type { StyleId } from "@/lib/styles";

// Generated state only; definitions live in src/lib/styles/catalog.ts.
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
