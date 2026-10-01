"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateSettings } from "@/actions/settings";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type SettingsData = {
  name: string | null;
  companyName: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  taxNumber: string | null;
  vatId: string | null;
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  isSmallBiz: boolean;
};

export function SettingsForm({ data }: { data: SettingsData }) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [isSmallBiz, setIsSmallBiz] = useState(data.isSmallBiz);

  function onSubmit(formData: FormData) {
    const payload = {
      name: String(formData.get("name") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      address: String(formData.get("address") ?? ""),
      city: String(formData.get("city") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      country: String(formData.get("country") ?? "Deutschland"),
      phone: String(formData.get("phone") ?? ""),
      taxNumber: String(formData.get("taxNumber") ?? ""),
      vatId: String(formData.get("vatId") ?? ""),
      iban: String(formData.get("iban") ?? ""),
      bic: String(formData.get("bic") ?? ""),
      bankName: String(formData.get("bankName") ?? ""),
      isSmallBiz,
    };

    startTransition(async () => {
      const result = await updateSettings(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("settings.saved"));
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.company")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">{t("settings.companyName")}</Label>
            <Input id="companyName" name="companyName" defaultValue={data.companyName ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">{t("settings.owner")}</Label>
            <Input id="name" name="name" defaultValue={data.name ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">{t("common.address")}</Label>
            <Input id="address" name="address" defaultValue={data.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">{t("common.postalCode")}</Label>
            <Input id="postalCode" name="postalCode" defaultValue={data.postalCode ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">{t("common.city")}</Label>
            <Input id="city" name="city" defaultValue={data.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">{t("common.country")}</Label>
            <Input id="country" name="country" defaultValue={data.country ?? "Deutschland"} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("settings.phone")}</Label>
            <Input id="phone" name="phone" defaultValue={data.phone ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.taxTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="taxNumber">{t("settings.taxNumber")}</Label>
            <Input id="taxNumber" name="taxNumber" defaultValue={data.taxNumber ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vatId">{t("common.vatId")}</Label>
            <Input id="vatId" name="vatId" defaultValue={data.vatId ?? ""} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">{t("settings.smallBiz")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.smallBizDesc")}</p>
            </div>
            <Switch
              checked={isSmallBiz}
              onCheckedChange={setIsSmallBiz}
              aria-label={t("settings.smallBiz")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.bank")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bankName">{t("settings.bankName")}</Label>
            <Input id="bankName" name="bankName" defaultValue={data.bankName ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" name="iban" defaultValue={data.iban ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bic">BIC</Label>
            <Input id="bic" name="bic" defaultValue={data.bic ?? ""} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("settings.save")}
        </Button>
      </div>
    </form>
  );
}
