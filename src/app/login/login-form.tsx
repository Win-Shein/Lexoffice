"use client";

import { Loader2, LogIn } from "lucide-react";
import { useActionState } from "react";

import { authenticate, type LoginState } from "@/actions/auth";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">{t("login.email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="demo@lexoffice.de"
          defaultValue="demo@lexoffice.de"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("login.password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          defaultValue="demo1234"
          required
        />
      </div>

      {state?.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {t("login.submitting")}
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" /> {t("login.submit")}
          </>
        )}
      </Button>
    </form>
  );
}
