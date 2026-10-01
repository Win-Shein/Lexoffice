"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

const CATEGORIES = [
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
}: {
  trigger: React.ReactNode;
  defaultDate: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState("Sonstiges");
  const [vatRate, setVatRate] = useState("19");

  function onSubmit(formData: FormData) {
    const payload = {
      description: String(formData.get("description") ?? ""),
      vendor: String(formData.get("vendor") ?? ""),
      category,
      documentNumber: String(formData.get("documentNumber") ?? ""),
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
                  {CATEGORIES.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {entry}
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
