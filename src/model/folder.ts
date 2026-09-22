import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

export type Folder = {
  _id: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export const folderSchema: z.ZodType<Folder> = z.object({
  _id: objectIdSchema,
  userId: objectIdSchema,
  clerkUserId: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
