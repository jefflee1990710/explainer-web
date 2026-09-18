import type { LocaleId } from "../locales";
import type { Messages } from "./types";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { id } from "./id";
import { ja } from "./ja";
import { ko } from "./ko";
import { mergeMessages } from "./merge";
import { pt } from "./pt";
import { ru } from "./ru";
import { zhHans } from "./zh-Hans";
import { zhHant } from "./zh-Hant";

const LOCALE_OVERRIDES: Record<LocaleId, Partial<Messages>> = {
  en,
  "zh-Hant": zhHant,
  "zh-Hans": zhHans,
  ja,
  ko,
  es,
  fr,
  de,
  pt,
  ru,
  id,
};

export function getMessages(locale: LocaleId): Messages {
  const override = LOCALE_OVERRIDES[locale] ?? en;
  if (locale === "en") return en;
  return mergeMessages(en, override);
}

export { en };
