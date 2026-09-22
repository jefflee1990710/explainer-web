import { ObjectId } from "mongodb";
import { z } from "zod";

// Mongo ObjectId stored on documents. Runtime checks stay at the call site.
export const objectIdSchema: z.ZodType<ObjectId> = z.custom<ObjectId>(
  (value) => value instanceof ObjectId,
);
