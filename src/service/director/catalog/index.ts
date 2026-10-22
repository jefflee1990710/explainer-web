import {
  DEFAULT_DIRECTOR_SLUG,
  isDirectorSlug,
  type DirectorSlug,
  type IDirector,
} from "@/model/director";
import { cartoonExplainerVideoDirector } from "@/service/director/catalog/cartoon-explainer-video-director";
import { storyShortDirector } from "@/service/director/catalog/story-short-director";
import { productDemoDirector } from "@/service/director/catalog/product-demo-director";
import { dialogueQaDirector } from "@/service/director/catalog/dialogue-qa-director";
import { listicleDirector } from "@/service/director/catalog/listicle-director";
import { tutorialDirector } from "@/service/director/catalog/tutorial-director";
import { openingDirector } from "@/service/director/catalog/opening-director";
import { endingDirector } from "@/service/director/catalog/ending-director";
import { talkingHeadDirector } from "@/service/director/catalog/talking-head-director";
import { fullBodyTalkingHeadDirector } from "@/service/director/catalog/full-body-talking-head-director";
import { comparisonCardDirector } from "@/service/director/catalog/comparison-card-director";
import { talkingBrollDirector } from "@/service/director/catalog/talking-broll-director";
import { surpriseInterviewDirector } from "@/service/director/catalog/surprise-interview-director";
import { outfitReelDirector } from "@/service/director/catalog/outfit-reel-director";
import { followShotDirector } from "@/service/director/catalog/follow-shot-director";

export const DIRECTORS: readonly IDirector[] = [
  cartoonExplainerVideoDirector,
  storyShortDirector,
  productDemoDirector,
  dialogueQaDirector,
  listicleDirector,
  tutorialDirector,
  openingDirector,
  endingDirector,
  talkingHeadDirector,
  fullBodyTalkingHeadDirector,
  comparisonCardDirector,
  talkingBrollDirector,
  surpriseInterviewDirector,
  outfitReelDirector,
  followShotDirector,
].sort((a, b) => a.sortOrder - b.sortOrder);

export const DIRECTORS_BY_SLUG: Record<DirectorSlug, IDirector> = Object.fromEntries(
  DIRECTORS.map((director) => [director.slug, director]),
) as Record<DirectorSlug, IDirector>;

export const DIRECTORS_BY_ID: Record<string, IDirector> = Object.fromEntries(
  DIRECTORS.map((director) => [director._id.toHexString(), director]),
);

export function getDirectorBySlug(slug: string | undefined | null): IDirector | null {
  if (!slug || !isDirectorSlug(slug)) return null;
  return DIRECTORS_BY_SLUG[slug];
}

export function getDirectorById(id: string | { toHexString(): string } | undefined | null): IDirector | null {
  if (!id) return null;
  const key = typeof id === "string" ? id : id.toHexString();
  return DIRECTORS_BY_ID[key] ?? null;
}

// Resolves a director by slug or ObjectId hex string, falling back to the default director for legacy custom IDs.
export function resolveDirector(slugOrId?: string | { toHexString(): string } | null): IDirector {
  if (typeof slugOrId === "string") {
    const bySlug = getDirectorBySlug(slugOrId);
    if (bySlug) return bySlug;
    const byId = getDirectorById(slugOrId);
    if (byId) return byId;
  } else if (slugOrId) {
    const byId = getDirectorById(slugOrId);
    if (byId) return byId;
  }
  return DIRECTORS_BY_SLUG[DEFAULT_DIRECTOR_SLUG];
}
