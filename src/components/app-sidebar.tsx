"use client";

import {
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
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

const COPYRIGHT_YEAR = new Date().getFullYear();

const NAV_ITEMS = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/invoices", key: "nav.invoices", icon: FileText },
  { href: "/customers", key: "nav.customers", icon: Users },
  { href: "/items", key: "nav.items", icon: Package },
  { href: "/expenses", key: "nav.expenses", icon: Receipt },
  { href: "/settings", key: "nav.settings", icon: Settings },
] as const;

export function SidebarContent({
  userName,
  companyName,
  logoUrl,
  onNavigate,
}: {
  userName: string;
  companyName: string;
  logoUrl?: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={companyName}
            className="h-8 w-8 shrink-0 rounded-lg object-contain"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
        )}
        <span className="truncate text-base font-semibold">{companyName}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-4">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{companyName}</p>
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
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          {t("common.copyright", { year: COPYRIGHT_YEAR })}
        </p>
      </div>
    </div>
  );
}

export function AppSidebar({
  userName,
  companyName,
  logoUrl,
}: {
  userName: string;
  companyName: string;
  logoUrl?: string | null;
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
      <SidebarContent userName={userName} companyName={companyName} logoUrl={logoUrl} />
    </aside>
  );
}
