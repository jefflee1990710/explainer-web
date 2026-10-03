import type { ObjectId } from "mongodb";
import type { StyleId } from "@/model/style-id";

export type PreviewStatus = "idle" | "generating" | "failed";

// One turn of the chat used to edit a custom style (matches director chat shape).
export type StyleChatMessage = {
  role: "user" | "assistant";
  content: string;
  changedPaths?: string[];
  createdAt: Date;
};

// User-owned fork of a system style; prompt fields are copied at creation time.
export type UserStyleDoc = {
  _id: ObjectId;
  ownerClerkUserId: string;
  baseStyleId: StyleId;
  name: string;
  description: string;
  canvas: string;
  canvasColor: string;
  look: string;
  palette: string;
  typography: string;
  motion: string;
  negatives: string;
  letteringLayout: string;
  letteringLine1: string;
  letteringLine2: string;
  beatTitleLayout: string;
  reelLayout: string;
  chat?: StyleChatMessage[];
  previewUrl?: string;
  previewFullUrl?: string;
  previewHash?: string;
  previewStatus: PreviewStatus;
  /** Set when preview credits were consumed; used for one-time refund on failure. */
  previewCreditsCharged?: boolean;
  /** When the in-flight preview job started (for stale-job detection). */
  previewStartedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
