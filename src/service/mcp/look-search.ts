import { en } from "@/util/i18n/messages/en";
import { zhHant } from "@/util/i18n/messages/zh-Hant";
import type { CharacterWardrobePart } from "@/service/character/character-look";
import {
  listWardrobeCatalogOptions,
  type PublicWardrobeCatalogOption,
} from "@/service/mcp/wardrobe-catalog";
import type { PublicCustomWardrobeItem } from "@/model/custom-wardrobe-item";
import type { PublicStyle } from "@/presentation/serialize";

export type SearchableLookKind = "catalog" | "custom" | "style";

export type LookSearchHit = {
  kind: SearchableLookKind;
  id: string;
  part?: CharacterWardrobePart;
  category?: string;
  name: string;
  nameZh?: string;
  prompt?: string;
  description?: string;
  tags?: string[];
  score: number;
};

type LabelMaps = Partial<Record<CharacterWardrobePart, Record<string, string>>>;

function labelMaps(): { en: LabelMaps; zh: LabelMaps } {
  const enOptions = en.characters.look.options as LabelMaps;
  const zhOptions = zhHant.characters.look.options as LabelMaps;
  return { en: enOptions, zh: zhOptions };
}

function labelsFor(part: CharacterWardrobePart, id: string) {
  const maps = labelMaps();
  return {
    nameEn: maps.en[part]?.[id] || id,
    nameZh: maps.zh[part]?.[id] || "",
  };
}

// Tokenize a free-text query for id / label / prompt / tag matching.
export function normalizeSearchQuery(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s,，、/|]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function scoreText(haystack: string, tokens: string[]) {
  if (!tokens.length) return 0;
  const text = haystack.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    if (text === token) score += 12;
    else if (text.startsWith(token)) score += 8;
    else if (text.includes(token)) score += 5;
  }
  return score;
}

function scoreTagList(tags: readonly string[], tokens: string[]) {
  let score = 0;
  for (const tag of tags) {
    score += scoreText(tag, tokens) * 2;
  }
  return score;
}

function scoreCatalogOption(option: PublicWardrobeCatalogOption, tokens: string[]): LookSearchHit | null {
  const { nameEn, nameZh } = labelsFor(option.part, option.id);
  const score =
    scoreText(option.id, tokens) * 2 +
    scoreText(nameEn, tokens) * 3 +
    scoreText(nameZh, tokens) * 3 +
    scoreText(option.prompt, tokens) +
    scoreText(option.description, tokens) * 2 +
    scoreTagList(option.tags, tokens) +
    scoreText(option.part, tokens) +
    scoreText(option.category, tokens);
  if (score <= 0) return null;
  return {
    kind: "catalog",
    id: option.id,
    part: option.part,
    category: option.category,
    name: nameEn,
    nameZh: nameZh || undefined,
    prompt: option.prompt,
    description: option.description,
    tags: option.tags,
    score,
  };
}

function scoreCustomItem(item: PublicCustomWardrobeItem, tokens: string[]): LookSearchHit | null {
  const score =
    scoreText(item.optionId, tokens) * 2 +
    scoreText(item.id, tokens) * 2 +
    scoreText(item.name, tokens) * 3 +
    scoreText(item.nameZh, tokens) * 3 +
    scoreText(item.prompt, tokens) +
    scoreText(item.part, tokens) +
    scoreText(item.category, tokens);
  if (score <= 0) return null;
  return {
    kind: "custom",
    id: item.optionId,
    part: item.part,
    category: item.category,
    name: item.name,
    nameZh: item.nameZh,
    prompt: item.prompt,
    score,
  };
}

function scoreStyle(style: PublicStyle, tokens: string[]): LookSearchHit | null {
  const score =
    scoreText(style.id, tokens) * 2 +
    scoreText(style.name, tokens) * 3 +
    scoreText(style.description, tokens);
  if (score <= 0) return null;
  return {
    kind: "style",
    id: style.id,
    name: style.name,
    description: style.description,
    score,
  };
}

export function searchWardrobeCatalog(input: {
  query: string;
  part?: CharacterWardrobePart;
  category?: PublicWardrobeCatalogOption["category"];
  tags?: readonly string[];
  limit?: number;
}): LookSearchHit[] {
  const tokens = normalizeSearchQuery(input.query);
  if (!tokens.length) return [];
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const rows = listWardrobeCatalogOptions({
    part: input.part,
    category: input.category,
    tags: input.tags,
  });
  return rows
    .map((row) => scoreCatalogOption(row, tokens))
    .filter((hit): hit is LookSearchHit => Boolean(hit))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function searchCustomWardrobeItems(
  items: PublicCustomWardrobeItem[],
  input: { query: string; part?: CharacterWardrobePart; limit?: number },
): LookSearchHit[] {
  const tokens = normalizeSearchQuery(input.query);
  if (!tokens.length) return [];
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  return items
    .filter((item) => !input.part || item.part === input.part)
    .map((item) => scoreCustomItem(item, tokens))
    .filter((hit): hit is LookSearchHit => Boolean(hit))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function searchStyles(
  styles: PublicStyle[],
  input: { query: string; limit?: number },
): LookSearchHit[] {
  const tokens = normalizeSearchQuery(input.query);
  if (!tokens.length) return [];
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  return styles
    .map((style) => scoreStyle(style, tokens))
    .filter((hit): hit is LookSearchHit => Boolean(hit))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

// Combined search used by MCP: catalog clothes/hair + custom wardrobe (+ optional styles).
export function searchLooks(input: {
  query: string;
  part?: CharacterWardrobePart;
  category?: PublicWardrobeCatalogOption["category"];
  tags?: readonly string[];
  includeStyles?: boolean;
  styles?: PublicStyle[];
  customItems?: PublicCustomWardrobeItem[];
  limit?: number;
}): LookSearchHit[] {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const hits: LookSearchHit[] = [
    ...searchWardrobeCatalog({
      query: input.query,
      part: input.part,
      category: input.category,
      tags: input.tags,
      limit,
    }),
    ...searchCustomWardrobeItems(input.customItems ?? [], {
      query: input.query,
      part: input.part,
      limit,
    }),
  ];
  if (input.includeStyles && !input.part) {
    hits.push(
      ...searchStyles(input.styles ?? [], {
        query: input.query,
        limit,
      }),
    );
  }
  return hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}
