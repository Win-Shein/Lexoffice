"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";

export function DeleteButton({
  action,
  confirmText,
  label,
}: {
  action: () => Promise<ActionResult>;
  confirmText?: string;
  label?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(confirmText ?? t("common.delete"))) return;
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("common.deleted"));
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={onClick}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {label}
    </Button>
  );
}
