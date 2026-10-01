"use client";

import { useTransition } from "react";

import { setLocale } from "@/actions/locale";
import { useI18n } from "@/components/i18n-provider";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      void setLocale(next);
    });
  }

  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-background p-0.5"
      role="group"
      aria-label={t("nav.language")}
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          disabled={pending}
          onClick={() => change(option)}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium uppercase transition-colors disabled:opacity-60",
            option === locale
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
