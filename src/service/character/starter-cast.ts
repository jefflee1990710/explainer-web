import { ObjectId } from "mongodb";
import { charactersCollection } from "@/dao";
import type { CharacterSpec } from "@/model/character-spec";
import type { StyleId } from "@/model/style-id";
import { getAppUrl } from "@/util/app-url";

export type StarterGender = "woman" | "man";

export type StarterCastMember = {
  id: string;
  name: string;
  styleId: StyleId;
  gender: StarterGender;
  file: string;
  imagePrompt: string;
  prompt: string;
  spec: CharacterSpec;
};

const NO_TEXT = "No watermark, no logo, no letters, no words, no numbers.";

// Five ready characters for a brand-new account. Styles and genders are mixed.
// Faces are original and are not the marketing hero cast.
export const STARTER_CAST: StarterCastMember[] = [
  {
    id: "aera",
    name: "Aera",
    styleId: "realistic",
    gender: "woman",
    file: "aera.jpg",
    imagePrompt: `9:16 photo. New Korean woman, late 20s, sleek black bob, dark brown eyes, ivory knit top, plain warm gray studio, full head and shoulders, facing camera. ${NO_TEXT}`,
    prompt:
      "Korean woman in her late 20s with a sleek black bob, dark brown eyes, and an ivory knit top. Photoreal, plain studio light.",
    spec: {
      identity: "woman, late 20s",
      face: "oval face, dark brown eyes, straight brows, soft jaw",
      hair: "sleek black bob, jaw length, center part",
      skinTone: "light warm",
      body: "slim, relaxed shoulders",
      marks: "none",
      outfit: "ivory knit top",
      palette: ["#1c1c1c", "#f4e4d4", "#f6f1ea", "#d9c7b4"],
    },
  },
  {
    id: "kenji",
    name: "Kenji",
    styleId: "clay",
    gender: "man",
    file: "kenji.jpg",
    imagePrompt: `9:16 claymation still. New Japanese man, early 30s, short black hair, olive shirt, clay 3D, plain cream backdrop, full head and torso. ${NO_TEXT}`,
    prompt:
      "Japanese man in his early 30s, short black hair, olive shirt, rendered as a clay stop-motion figure on a cream backdrop.",
    spec: {
      identity: "man, early 30s",
      face: "rounded clay face, narrow eyes, small nose",
      hair: "short black hair, textured clay",
      skinTone: "warm tan clay",
      body: "average build, upright",
      marks: "none",
      outfit: "olive collared shirt",
      palette: ["#2a241c", "#e0b090", "#6e7a45", "#f4efe6"],
    },
  },
  {
    id: "sable",
    name: "Sable",
    styleId: "paper-cutout",
    gender: "woman",
    file: "sable.jpg",
    imagePrompt: `9:16 paper-cut illustration. New Vietnamese woman, mid 20s, long black hair, coral jacket, layered colored paper, plain paper backdrop, full head. ${NO_TEXT}`,
    prompt:
      "Vietnamese woman in her mid 20s with long black hair and a coral jacket, built from layered colored paper cutouts.",
    spec: {
      identity: "woman, mid 20s",
      face: "paper-cut oval face, dark eyes, small smile",
      hair: "long straight black hair",
      skinTone: "warm paper beige",
      body: "slim, layered paper silhouette",
      marks: "none",
      outfit: "coral jacket over a cream top",
      palette: ["#1a1a1a", "#f0d2b8", "#e06a4f", "#f7f1e6"],
    },
  },
  {
    id: "nico",
    name: "Nico",
    styleId: "pixel",
    gender: "man",
    file: "nico.jpg",
    imagePrompt: `9:16 pixel-art portrait. New man, short dark curly hair, blue jacket, chunky pixels, plain dark backdrop, full head and shoulders, not a game screenshot. ${NO_TEXT}`,
    prompt:
      "Man with short dark curly hair and a blue jacket, drawn as chunky pixel art on a dark backdrop.",
    spec: {
      identity: "man, mid 20s",
      face: "pixel face, square jaw, dark eyes",
      hair: "short dark curly hair",
      skinTone: "medium",
      body: "average, blocky pixel silhouette",
      marks: "none",
      outfit: "blue jacket",
      palette: ["#241c18", "#c48a62", "#2f5f9e", "#141820"],
    },
  },
  {
    id: "wren",
    name: "Wren",
    styleId: "watercolor",
    gender: "woman",
    file: "wren.jpg",
    imagePrompt: `9:16 watercolor portrait. New woman, wavy black hair, sage dress, soft washes, white paper background, full head and shoulders. ${NO_TEXT}`,
    prompt:
      "Woman with wavy black hair in a sage dress, painted in soft watercolor on white paper.",
    spec: {
      identity: "woman, late 20s",
      face: "soft oval, dark eyes, light brows",
      hair: "wavy black hair, shoulder length",
      skinTone: "light, watercolor wash",
      body: "slim, gentle posture",
      marks: "none",
      outfit: "sage dress",
      palette: ["#2b241f", "#f3ddcc", "#8aa384", "#f7f4ef"],
    },
  },
];

export function starterAssetUrl(file: string) {
  return `${getAppUrl()}/starter-cast/${file}`;
}

// Insert the five gift characters once. They do not spend credits or call a provider.
export async function seedStarterCharacters(user: { _id: ObjectId; clerkUserId: string }) {
  const characters = await charactersCollection();
  const already = await characters.countDocuments({
    clerkUserId: user.clerkUserId,
    starterGift: true,
  });
  if (already > 0) return;

  const now = new Date();
  await characters.insertMany(
    STARTER_CAST.map((item) => {
      const versionId = new ObjectId();
      const url = starterAssetUrl(item.file);
      return {
        userId: user._id,
        clerkUserId: user.clerkUserId,
        name: item.name,
        styleId: item.styleId,
        starterGift: true,
        defaultVersionId: versionId,
        versions: [
          {
            id: versionId,
            styleId: item.styleId,
            prompt: item.prompt,
            blueprintKind: "sheet" as const,
            portraitUrl: url,
            profileUrl: url,
            blueprintUrl: url,
            spec: item.spec,
            status: "completed" as const,
            creditsCharged: false,
            creditsCost: 0,
            createdAt: now,
            submittedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
    }),
  );
}
