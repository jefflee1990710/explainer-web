import type { LocaleId } from "@/util/i18n/locales";
import type { Messages } from "@/util/i18n/messages/types";
import { de } from "@/util/i18n/messages/de";
import { en } from "@/util/i18n/messages/en";
import { es } from "@/util/i18n/messages/es";
import { fr } from "@/util/i18n/messages/fr";
import { id } from "@/util/i18n/messages/id";
import { ja } from "@/util/i18n/messages/ja";
import { ko } from "@/util/i18n/messages/ko";
import { mergeMessages } from "@/util/i18n/messages/merge";
import { pt } from "@/util/i18n/messages/pt";
import { ru } from "@/util/i18n/messages/ru";
import { zhHans } from "@/util/i18n/messages/zh-Hans";
import { zhHant } from "@/util/i18n/messages/zh-Hant";

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
