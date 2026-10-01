"use client";

import { createContext, useContext, useMemo } from "react";

import type { Locale } from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n/translator";

type I18nContextValue = {
  locale: Locale;
  t: Translator;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, t: createTranslator(locale) }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
