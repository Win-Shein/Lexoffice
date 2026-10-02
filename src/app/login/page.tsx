import { FileText, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTranslator } from "@/lib/i18n/server";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { t } = await getTranslator();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-5 w-5" />
          </div>
          MMXeron
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl font-semibold leading-tight">{t("login.tagline")}</h1>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              {t("login.bullet1")}
            </li>
            <li className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-amber-300" />
              {t("login.bullet2")}
            </li>
            <li className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-sky-400" />
              {t("login.bullet3")}
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-400">
          {t("login.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-8">
        <div className="mb-6 flex w-full max-w-sm items-center justify-end gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight">{t("login.welcome")}</h2>
            <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
