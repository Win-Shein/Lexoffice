import { FileText, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { t } = await getTranslator();
  const branding = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { logoUrl: true, companyName: true },
  });
  const logoUrl = branding?.logoUrl ?? null;
  const brandName = branding?.companyName?.trim() || "MMXeron";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={brandName}
              className="h-10 max-w-[160px] object-contain"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5" />
            </div>
          )}
          <span>{brandName}</span>
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
        <div className="mb-6 flex w-full max-w-sm items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-lg font-semibold">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={brandName}
                className="h-8 max-w-[120px] object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileText className="h-4 w-4" />
              </div>
            )}
            <span className="truncate">{brandName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
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
