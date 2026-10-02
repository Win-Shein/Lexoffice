"use client";

import { Paperclip } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

function dataUrlToBlobUrl(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, commaIndex);
  const base64 = dataUrl.slice(commaIndex + 1);
  const mime = meta.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export function ReceiptLink({
  data,
  name,
}: {
  data: string;
  name: string | null;
}) {
  const { t } = useI18n();

  function open() {
    const url = dataUrlToBlobUrl(data);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={open} title={name ?? undefined}>
      <Paperclip className="h-4 w-4" /> {t("expenses.receiptView")}
    </Button>
  );
}
