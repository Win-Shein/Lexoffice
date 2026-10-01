"use client";

import { Download, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { restoreBackupAction } from "@/actions/backup";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function BackupCard() {
  const router = useRouter();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(t("backup.tooLarge"));
      event.target.value = "";
      setFileName(null);
      return;
    }

    setFileName(file.name);

    startTransition(async () => {
      try {
        const text = await file.text();
        const result = await restoreBackupAction(text);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(
          t("backup.restored", {
            customers: result.customers,
            invoices: result.invoices,
            expenses: result.expenses,
          }),
        );
        setFileName(null);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } catch {
        toast.error(t("backup.invalid"));
      }
    });
  }

  function pickFile() {
    inputRef.current?.click();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("backup.title")}</CardTitle>
        <CardDescription>{t("backup.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline">
            <a href="/api/export/backup">
              <Download className="h-4 w-4" /> {t("backup.download")}
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={pickFile}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {pending ? t("backup.restoring") : t("backup.restore")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {fileName ? t("backup.fileSelected", { name: fileName }) : t("backup.restoreHint")}
        </p>
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {t("backup.warning")}
        </p>
      </CardContent>
    </Card>
  );
}
