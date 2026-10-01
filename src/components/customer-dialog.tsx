"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createCustomer, updateCustomer } from "@/actions/customer";
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

export type CustomerData = {
  id: string;
  name: string;
  email: string | null;
  address: string;
  city: string | null;
  postalCode: string | null;
  country: string;
  vatId: string | null;
};

export function CustomerDialog({
  customer,
  trigger,
}: {
  customer?: CustomerData;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(customer);

  function onSubmit(formData: FormData) {
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      address: String(formData.get("address") ?? ""),
      city: String(formData.get("city") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      country: String(formData.get("country") ?? "Deutschland"),
      vatId: String(formData.get("vatId") ?? ""),
    };

    startTransition(async () => {
      const result = customer
        ? await updateCustomer(customer.id, payload)
        : await createCustomer(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? t("customers.updated") : t("customers.created"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("customers.edit") : t("customers.new")}</DialogTitle>
          <DialogDescription>{t("customers.formHint")}</DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("customers.formName")}</Label>
            <Input id="name" name="name" defaultValue={customer?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatId">{t("common.vatId")}</Label>
              <Input id="vatId" name="vatId" defaultValue={customer?.vatId ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">{t("customers.formAddress")}</Label>
            <Input id="address" name="address" defaultValue={customer?.address} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="postalCode">{t("common.postalCode")}</Label>
              <Input id="postalCode" name="postalCode" defaultValue={customer?.postalCode ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t("common.city")}</Label>
              <Input id="city" name="city" defaultValue={customer?.city ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">{t("common.country")}</Label>
            <Input id="country" name="country" defaultValue={customer?.country ?? "Deutschland"} />
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
