"use client";

import {
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/actions/auth";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/invoices", key: "nav.invoices", icon: FileText },
  { href: "/customers", key: "nav.customers", icon: Users },
  { href: "/expenses", key: "nav.expenses", icon: Receipt },
  { href: "/settings", key: "nav.settings", icon: Settings },
] as const;

export function AppSidebar({
  userName,
  companyName,
}: {
  userName: string;
  companyName: string;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <span className="text-base font-semibold">MMXeron</span>
      </div>

      <div className="p-4">
        <Button asChild className="w-full justify-start">
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" /> {t("nav.newInvoice")}
          </Link>
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{companyName}</p>
            </div>
          </div>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t("nav.language")}</span>
          <LanguageSwitcher />
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t("theme.label")}</span>
          <ThemeToggle />
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm" className="w-full justify-start">
            <LogOut className="h-4 w-4" /> {t("nav.signOut")}
          </Button>
        </form>
      </div>
    </aside>
  );
}
