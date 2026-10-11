import type { ObjectId } from "mongodb";
import type { SubtitleLook } from "@/model/subtitle-look-id";

export type TextStylePreviewStatus = "idle" | "generating" | "failed";

// One turn of the chat used to edit a custom lettering look (matches style chat shape).
export type TextStyleChatMessage = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  previewUrl?: string;
  changedPaths?: string[];
  createdAt: Date;
};

// A user lettering sample. Placement stays with the director; this image is appearance only.
export type TextStyleDoc = {
  _id: ObjectId;
  clerkUserId: string;
  name: string;
  imageUrl: string;
  // System look this was forked from, when created via "use as template".
  baseLookId?: SubtitleLook;
  // Editable Look: sentence. Seeded from the system look or a sample-match default.
  lookLine?: string;
  chat?: TextStyleChatMessage[];
  previewStatus?: TextStylePreviewStatus;
  previewHash?: string;
  previewCreditsCharged?: boolean;
  previewStartedAt?: Date;
  previewChatCreatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
