import type { Locale } from "@/lib/i18n/config";
import { dictionaries, type TranslationKey } from "@/lib/i18n/dictionaries";

export type TranslateVars = Record<string, string | number>;

export function createTranslator(locale: Locale) {
  const dict = dictionaries[locale];
  return (key: TranslationKey, vars?: TranslateVars) => {
    let value: string = dict[key] ?? key;
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.split(`{${name}}`).join(String(replacement));
      }
    }
    return value;
  };
}

export type Translator = ReturnType<typeof createTranslator>;
