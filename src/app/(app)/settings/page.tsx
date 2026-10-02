import { getCurrentUser } from "@/auth";
import { BackupCard } from "@/components/backup-card";
import { ChangePasswordForm } from "@/components/change-password-form";
import { LogoUpload } from "@/components/logo-upload";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { getTranslator } from "@/lib/i18n/server";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { t } = await getTranslator();

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} description={t("settings.description")} />

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

      <ChangePasswordForm email={user.email} />

      <BackupCard />
    </div>
  );
}
