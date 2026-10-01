import { cookies } from "next/headers";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n/translator";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getTranslator(): Promise<{ locale: Locale; t: Translator }> {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale) };
}
