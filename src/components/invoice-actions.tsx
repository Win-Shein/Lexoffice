"use client";

import { Ban, CheckCircle2, Loader2, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteInvoice, updateInvoiceStatus } from "@/actions/invoice";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { InvoiceStatus } from "@/generated/prisma/enums";

export function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  function changeStatus(next: InvoiceStatus) {
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoiceId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("invoiceActions.statusUpdated"));
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(t("invoiceActions.confirmDelete"))) return;
    setDeleting(true);
    startTransition(async () => {
      const result = await deleteInvoice(invoiceId);
      if (!result.ok) {
        toast.error(result.error);
        setDeleting(false);
        return;
      }
      toast.success(t("invoiceActions.deleted"));
      router.push("/invoices");
    });
  }

  const busy = pending || deleting;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== InvoiceStatus.SENT && status !== InvoiceStatus.PAID ? (
        <Button variant="outline" disabled={busy} onClick={() => changeStatus(InvoiceStatus.SENT)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("invoiceActions.markSent")}
        </Button>
      ) : null}

      {status !== InvoiceStatus.PAID ? (
        <Button variant="success" disabled={busy} onClick={() => changeStatus(InvoiceStatus.PAID)}>
          <CheckCircle2 className="h-4 w-4" /> {t("invoiceActions.markPaid")}
        </Button>
      ) : null}

      {status !== InvoiceStatus.CANCELLED ? (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => changeStatus(InvoiceStatus.CANCELLED)}
        >
          <Ban className="h-4 w-4" /> {t("invoiceActions.cancel")}
        </Button>
      ) : null}

      <Button variant="ghost" className="text-destructive" disabled={busy} onClick={remove}>
        <Trash2 className="h-4 w-4" /> {t("common.delete")}
      </Button>
    </div>
  );
}
