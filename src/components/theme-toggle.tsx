"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const OPTIONS = [
  { value: "light", icon: Sun, key: "theme.light" },
  { value: "system", icon: Monitor, key: "theme.system" },
  { value: "dark", icon: Moon, key: "theme.dark" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-background p-0.5"
      role="group"
      aria-label={t("theme.label")}
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-label={t(option.key)}
            aria-pressed={active}
            title={t(option.key)}
            className={cn(
              "rounded p-1.5 transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
