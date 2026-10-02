"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateAccount } from "@/actions/password";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm({ email }: { email: string }) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    const nextEmail = String(formData.get("email") ?? "").trim();
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "").trim();
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword) {
      if (newPassword.length < 8) {
        setError(t("password.tooShort"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t("password.mismatch"));
        return;
      }
    }

    startTransition(async () => {
      const result = await updateAccount({ email: nextEmail, currentPassword, newPassword });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(t("password.changed"));
      formRef.current?.reset();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("password.title")}</CardTitle>
        <CardDescription>{t("password.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={onSubmit} className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="email">{t("password.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={email}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t("password.current")}</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("password.new")}</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("password.confirm")}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
            />
          </div>

          <p className="text-xs text-muted-foreground sm:col-span-3">
            {t("password.optional")}
          </p>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-300 sm:col-span-3">
              {error}
            </p>
          ) : null}

          <div className="sm:col-span-3 sm:justify-self-end">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {t("password.submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
