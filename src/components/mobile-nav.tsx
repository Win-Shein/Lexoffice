"use client";

import { FileText, Menu, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SidebarContent } from "@/components/app-sidebar";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav({
  userName,
  companyName,
}: {
  userName: string;
  companyName: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-3 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("nav.dashboard")}>
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarContent
            userName={userName}
            companyName={companyName}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold">MMXeron</span>
      </div>

      <Button asChild variant="ghost" size="icon" aria-label={t("nav.newInvoice")}>
        <Link href="/invoices/new">
          <Plus className="h-5 w-5" />
        </Link>
      </Button>
    </header>
  );
}
