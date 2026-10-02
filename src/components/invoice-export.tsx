"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ExportFormat = "datev" | "pdf";

export function InvoiceExport({
  status,
  from,
  to,
  count,
}: {
  status: string;
  from?: string;
  to?: string;
  count: number;
}) {
  const { t } = useI18n();
  const [format, setFormat] = useState<ExportFormat>("datev");

  function onExport() {
    if (count === 0) return;
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    let base = "/api/export/datev";
    if (format === "pdf") {
      base = "/api/export/invoices/pdf";
      if (status && status !== "all") params.set("status", status);
    }
    const qs = params.toString();
    window.open(`${base}${qs ? `?${qs}` : ""}`, "_blank");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
        <SelectTrigger className="h-9 w-[170px]" aria-label={t("export.format")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="datev">{t("export.datev")}</SelectItem>
          <SelectItem value="pdf">{t("export.pdf")}</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={onExport} disabled={count === 0}>
        <Download className="h-4 w-4" /> {t("export.submit")}
      </Button>
    </div>
  );
}
