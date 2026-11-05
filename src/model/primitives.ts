import type { ObjectId } from "mongodb";
import { z } from "zod";

function isMongoObjectId(value: unknown): value is ObjectId {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    _bsontype?: string;
    toHexString?: unknown;
    constructor?: { name?: string };
  };
  return (
    candidate._bsontype === "ObjectId" ||
    candidate._bsontype === "ObjectID" ||
    (candidate.constructor?.name === "ObjectId" &&
      typeof candidate.toHexString === "function")
  );
}

// Mongo ObjectId stored on documents. Runtime checks stay at the call site.
export const objectIdSchema: z.ZodType<ObjectId> = z.custom<ObjectId>(
  isMongoObjectId,
);
