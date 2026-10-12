import type { ObjectId } from "mongodb";

// One OpenCut timeline per Scro video. Media bytes stay on Blob; this stores the edit.
export type OpencutEditMedia = {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  sourceUrl: string;
  width?: number;
  height?: number;
  duration?: number;
};

export type OpencutEdit = {
  _id: ObjectId;
  clerkUserId: string;
  project: Record<string, unknown>;
  media: OpencutEditMedia[];
  updatedAt: Date;
};
