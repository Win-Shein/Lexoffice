"use client";

import { Loader2, Paperclip, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createExpense } from "@/actions/expense";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryChoice } from "@/lib/category-options";

const CATEGORIES_FALLBACK = [
  "Software",
  "Miete",
  "Bewirtung",
  "Ausstattung",
  "Infrastruktur",
  "Reise",
  "Beratung",
  "Marketing",
  "Sonstiges",
];

export function ExpenseDialog({
  trigger,
  defaultDate,
  categories,
}: {
  trigger: React.ReactNode;
  defaultDate: string;
  categories: CategoryChoice[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const options =
    categories.length > 0
      ? categories
      : CATEGORIES_FALLBACK.map((name) => ({ name, label: name }));
  const [category, setCategory] = useState(options[0]?.name ?? "Sonstiges");
  const [vatRate, setVatRate] = useState("19");
  const [receipt, setReceipt] = useState<{
    data: string;
    name: string;
    type: string;
  } | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  function onReceiptChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!allowed) {
      toast.error(t("error.receiptInvalid"));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error(t("error.receiptTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      setReceipt({ data: String(reader.result ?? ""), name: file.name, type: file.type });
    reader.readAsDataURL(file);
  }

  function onSubmit(formData: FormData) {
    const payload = {
      description: String(formData.get("description") ?? ""),
      vendor: String(formData.get("vendor") ?? ""),
      category,
      documentNumber: String(formData.get("documentNumber") ?? ""),
      receiptData: receipt?.data,
      receiptName: receipt?.name,
      receiptType: receipt?.type,
      amountNet: Number(String(formData.get("amountNet") ?? "0").replace(",", ".")) || 0,
      vatRate: Number(vatRate),
      date: String(formData.get("date") ?? defaultDate),
    };

    startTransition(async () => {
      const result = await createExpense(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("expenses.created"));
      setReceipt(null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("expenses.new")}</DialogTitle>
          <DialogDescription>{t("expenses.formHint")}</DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">{t("expenses.descriptionLabel")} *</Label>
            <Input id="description" name="description" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor">{t("expenses.vendor")}</Label>
              <Input id="vendor" name="vendor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentNumber">{t("expenses.documentNumber")}</Label>
              <Input id="documentNumber" name="documentNumber" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("expenses.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((entry) => (
                    <SelectItem key={entry.name} value={entry.name}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">{t("common.date")}</Label>
              <Input id="date" name="date" type="date" defaultValue={defaultDate} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amountNet">{t("expenses.amountNet")}</Label>
              <Input id="amountNet" name="amountNet" inputMode="decimal" placeholder="0,00" required />
            </div>
            <div className="space-y-2">
              <Label>{t("expenses.vatRate")}</Label>
              <Select value={vatRate} onValueChange={setVatRate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="19">19 %</SelectItem>
                  <SelectItem value="7">7 %</SelectItem>
                  <SelectItem value="0">0 %</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("expenses.receipt")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={onReceiptChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => receiptInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" /> {t("expenses.receiptUpload")}
              </Button>
              {receipt ? (
                <>
                  <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {receipt.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setReceipt(null)}
                  >
                    <X className="h-4 w-4" /> {t("expenses.receiptRemove")}
                  </Button>
                </>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{t("expenses.receiptHint")}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
