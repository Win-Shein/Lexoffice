import { Download } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/auth";
import { BackupCard } from "@/components/backup-card";
import { ChangePasswordForm } from "@/components/change-password-form";
import { LogoUpload } from "@/components/logo-upload";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n/server";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { t } = await getTranslator();

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} description={t("settings.description")}>
        <Button asChild variant="outline">
          <Link href="/api/export/datev">
            <Download className="h-4 w-4" /> {t("common.export")}
          </Link>
        </Button>
      </PageHeader>

      <SettingsForm
        data={{
          name: user.name,
          companyName: user.companyName,
          address: user.address,
          city: user.city,
          postalCode: user.postalCode,
          country: user.country,
          phone: user.phone,
          taxNumber: user.taxNumber,
          vatId: user.vatId,
          iban: user.iban,
          bic: user.bic,
          bankName: user.bankName,
          isSmallBiz: user.isSmallBiz,
        }}
      />

      <LogoUpload logoUrl={user.logoUrl} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChangePasswordForm />
        <BackupCard />
      </div>
    </div>
  );
}
