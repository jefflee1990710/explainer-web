import type { ObjectId } from "mongodb";

export type Folder = {
  _id: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};
