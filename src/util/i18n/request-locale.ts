import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  isLocaleId,
  LOCALE_STORAGE_KEY,
  REQUEST_LOCALE_HEADER,
  type LocaleId,
} from "@/util/i18n/locales";

// ?hl= wins (set on the request by proxy), then the language cookie, then English.
export async function getRequestLocale(): Promise<LocaleId> {
  const headerStore = await headers();
  const fromHeader = headerStore.get(REQUEST_LOCALE_HEADER);
  if (isLocaleId(fromHeader)) return fromHeader;
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  return isLocaleId(stored) ? stored : DEFAULT_LOCALE;
}
