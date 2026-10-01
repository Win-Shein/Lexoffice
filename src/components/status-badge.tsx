"use client";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { InvoiceStatus } from "@/generated/prisma/enums";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const CONFIG: Record<
  InvoiceStatus,
  { key: TranslationKey; variant: "neutral" | "default" | "success" | "warning" | "destructive" }
> = {
  [InvoiceStatus.DRAFT]: { key: "status.DRAFT", variant: "neutral" },
  [InvoiceStatus.SENT]: { key: "status.SENT", variant: "default" },
  [InvoiceStatus.PAID]: { key: "status.PAID", variant: "success" },
  [InvoiceStatus.OVERDUE]: { key: "status.OVERDUE", variant: "destructive" },
  [InvoiceStatus.CANCELLED]: { key: "status.CANCELLED", variant: "warning" },
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useI18n();
  const config = CONFIG[status] ?? CONFIG[InvoiceStatus.DRAFT];
  return <Badge variant={config.variant}>{t(config.key)}</Badge>;
}
