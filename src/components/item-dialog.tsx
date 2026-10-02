"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createItem, updateItem } from "@/actions/item";
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

export type ItemData = {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  taxType: string;
};

const CATEGORIES_FALLBACK = ["Dienstleistung", "Produkt", "Material", "Lizenz", "Sonstiges"];

export function ItemDialog({
  item,
  categories,
  trigger,
}: {
  item?: ItemData;
  categories: string[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const options = categories.length > 0 ? categories : CATEGORIES_FALLBACK;
  const [category, setCategory] = useState(item?.category ?? options[0]);
  const [taxType, setTaxType] = useState(item?.taxType ?? "STANDARD_19");
  const isEdit = Boolean(item);

  function onSubmit(formData: FormData) {
    const payload = {
      name: String(formData.get("name") ?? ""),
      category,
      unit: String(formData.get("unit") ?? "Stück"),
      unitPrice: Number(String(formData.get("unitPrice") ?? "0").replace(",", ".")) || 0,
      taxType,
    };

    startTransition(async () => {
      const result = item
        ? await updateItem(item.id, payload)
        : await createItem(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? t("items.updated") : t("items.created"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("items.edit") : t("items.new")}</DialogTitle>
          <DialogDescription>{t("items.formHint")}</DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("items.formName")}</Label>
            <Input id="name" name="name" defaultValue={item?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("items.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {entry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t("items.unit")}</Label>
              <Input id="unit" name="unit" defaultValue={item?.unit ?? "Stück"} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="unitPrice">{t("items.unitPrice")}</Label>
              <Input
                id="unitPrice"
                name="unitPrice"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={item ? String(item.unitPrice).replace(".", ",") : ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("items.taxRate")}</Label>
              <Select value={taxType} onValueChange={setTaxType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD_19">19 %</SelectItem>
                  <SelectItem value="REDUCED_7">7 %</SelectItem>
                  <SelectItem value="EXEMPT_0">0 %</SelectItem>
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
