import type { ObjectId } from "mongodb";

// A user lettering sample. Placement stays with the director; this image is appearance only.
export type TextStyleDoc = {
  _id: ObjectId;
  clerkUserId: string;
  name: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
};
