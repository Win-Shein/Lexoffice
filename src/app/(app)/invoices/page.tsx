import { FileText, Plus } from "lucide-react";
import Link from "next/link";

import { requireUserId } from "@/auth";
import { DateRangeFilter } from "@/components/date-range-filter";
import { InvoiceExport } from "@/components/invoice-export";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
import { getTranslator } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ value: string; key: TranslationKey }> = [
  { value: "all", key: "invoices.filterAll" },
  { value: InvoiceStatus.DRAFT, key: "invoices.filterDrafts" },
  { value: InvoiceStatus.SENT, key: "invoices.filterSent" },
  { value: InvoiceStatus.PAID, key: "invoices.filterPaid" },
  { value: InvoiceStatus.OVERDUE, key: "invoices.filterOverdue" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const { status, from: rawFrom, to: rawTo } = await searchParams;
  const activeFilter = status ?? "all";

  const validStatus = Object.values(InvoiceStatus).includes(
    activeFilter as InvoiceStatus,
  )
    ? (activeFilter as InvoiceStatus)
    : undefined;

  const isValidDate = (value: string | undefined): value is string =>
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const from = isValidDate(rawFrom) ? rawFrom : undefined;
  const to = isValidDate(rawTo) ? rawTo : undefined;

  const dateFilter =
    from || to
      ? {
          issueDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {};

  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      ...(validStatus ? { status: validStatus } : {}),
      ...dateFilter,
    },
    include: { customer: true },
    orderBy: { issueDate: "desc" },
  });

  const total = invoices.reduce((sum, invoice) => sum + invoice.totalGross, 0);

  const filterHref = (value: string) => {
    const params = new URLSearchParams();
    if (value !== "all") params.set("status", value);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    return qs ? `/invoices?${qs}` : "/invoices";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("invoices.title")}
        description={t("invoices.description", {
          count: invoices.length,
          total: formatCurrency(total),
        })}
      >
        <InvoiceExport
          status={activeFilter}
          from={from}
          to={to}
          count={invoices.length}
        />
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" /> {t("nav.newInvoice")}
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={filterHref(filter.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                activeFilter === filter.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {t(filter.key)}
            </Link>
          ))}
        </div>
        <DateRangeFilter
          key={`${activeFilter}-${from ?? ""}-${to ?? ""}`}
          path="/invoices"
          extraParams={{ status: activeFilter }}
          from={from}
          to={to}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table bordered>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{t("common.no")}</TableHead>
                <TableHead>{t("invoices.number")}</TableHead>
                <TableHead>{t("common.customer")}</TableHead>
                <TableHead>{t("invoices.issued")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("invoices.due")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {t("common.net")}
                </TableHead>
                <TableHead className="text-right">{t("common.gross")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {t("invoices.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice, index) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium">{invoice.customer.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {invoice.customer.city}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.issueDate)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      {formatCurrency(invoice.subtotalNet)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.totalGross)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/invoices/${invoice.id}`}>{t("common.open")}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
