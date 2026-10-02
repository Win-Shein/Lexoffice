"use client";

import { FileDown } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export function ExpenseExport({
  from,
  to,
  count,
}: {
  from?: string;
  to?: string;
  count: number;
}) {
  const { t } = useI18n();

  function onExport() {
    if (count === 0) return;
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    window.open(`/api/export/expenses/pdf${qs ? `?${qs}` : ""}`, "_blank");
  }

  return (
    <Button variant="outline" onClick={onExport} disabled={count === 0}>
      <FileDown className="h-4 w-4" /> {t("expenses.exportPdf")}
    </Button>
  );
}
