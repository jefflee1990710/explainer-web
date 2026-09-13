import type { ObjectId } from "mongodb";

export type SkillReference = {
  path: string;
  content: string;
};

export type SkillInputSchema = {
  requiresSource: boolean;
  aspectRatios: Array<"16:9" | "9:16" | "1:1">;
  durationPresets: string[];
  optionalCharacterImage: boolean;
};

export type HiggsfieldDefaults = {
  imageModel: string;
  imageQuality: "low" | "medium" | "high";
  imageResolution: "1k" | "2k" | "4k";
  videoModel: string;
};

// Selectable generation skill stored in Mongo and seeded from repo markdown.
export type Skill = {
  _id: ObjectId;
  slug: string;
  title: string;
  titleZh: string;
  description: string;
  systemPrompt: string;
  references: SkillReference[];
  inputSchema: SkillInputSchema;
  higgsfieldDefaults: HiggsfieldDefaults;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};
