export const LOCALES = ["de", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "de";

export const LOCALE_COOKIE = "locale";

export const LOCALE_LABEL: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "de" || value === "en";
}
