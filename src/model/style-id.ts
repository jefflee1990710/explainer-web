import { z } from "zod";

// Keep this list aligned with the style catalog.
export const styleIdSchema = z.enum([
  "doodle",
  "flat-vector",
  "paper-cutout",
  "chalkboard",
  "watercolor",
  "clay",
  "pixel",
  "ink-manga",
  "realistic",
]);

export type StyleId = z.infer<typeof styleIdSchema>;
