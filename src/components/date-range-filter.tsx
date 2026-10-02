"use client";

import { useRouter } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateRangeFilter({
  path,
  from,
  to,
  extraParams,
}: {
  path: string;
  from?: string;
  to?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const { t } = useI18n();

  function buildUrl(nextFrom?: string, nextTo?: string) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extraParams ?? {})) {
      if (value && value !== "all") params.set(key, value);
    }
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    const qs = params.toString();
    return `${path}${qs ? `?${qs}` : ""}`;
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFrom = String(formData.get("from") ?? "");
    const nextTo = String(formData.get("to") ?? "");
    router.push(buildUrl(nextFrom, nextTo));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3"
    >
      <div className="space-y-1">
        <Label htmlFor="filter-from" className="text-xs">
          {t("common.from")}
        </Label>
        <Input
          id="filter-from"
          name="from"
          type="date"
          defaultValue={from ?? ""}
          className="h-9 w-[150px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-to" className="text-xs">
          {t("common.to")}
        </Label>
        <Input
          id="filter-to"
          name="to"
          type="date"
          defaultValue={to ?? ""}
          className="h-9 w-[150px]"
        />
      </div>
      <Button type="submit" variant="outline" size="sm">
        {t("common.apply")}
      </Button>
      {from || to ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(buildUrl())}
        >
          {t("common.reset")}
        </Button>
      ) : null}
    </form>
  );
}
