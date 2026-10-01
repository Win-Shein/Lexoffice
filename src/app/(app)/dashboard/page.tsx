import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Euro,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { requireUserId } from "@/auth";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { RevenueChart } from "@/components/revenue-chart";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { getTranslator } from "@/lib/i18n/server";
import { getDashboardData } from "@/lib/queries";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const { metrics, series, recentInvoices, statusCounts, totalInvoices } =
    await getDashboardData(userId);

  return (
    <div className="space-y-8">
      <PageHeader title={t("dashboard.title")} description={t("dashboard.description")}>
        <Button asChild variant="outline">
          <Link href="/invoices">{t("dashboard.allInvoices")}</Link>
        </Button>
        <Button asChild>
          <Link href="/invoices/new">{t("dashboard.newInvoice")}</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t("dashboard.revenue")}
          value={formatCurrency(metrics.revenue)}
          hint={`${metrics.profit >= 0 ? t("dashboard.profit") : t("dashboard.loss")}: ${formatCurrency(
            Math.abs(metrics.profit),
          )}`}
          icon={<ArrowUpRight className="h-5 w-5" />}
          tone="success"
        />
        <MetricCard
          title={t("dashboard.expenses")}
          value={formatCurrency(metrics.expenses)}
          hint={t("dashboard.allReceipts")}
          icon={<ArrowDownRight className="h-5 w-5" />}
          tone="warning"
        />
        <MetricCard
          title={t("dashboard.openInvoices")}
          value={String(metrics.openCount)}
          hint={formatCurrency(metrics.openAmount)}
          icon={<Clock className="h-5 w-5" />}
          tone="default"
        />
        <MetricCard
          title={t("dashboard.overdue")}
          value={formatCurrency(metrics.overdueAmount)}
          hint={t("dashboard.overdueCount", { count: metrics.overdueCount })}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="destructive"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("dashboard.revenueVsExpenses")}</CardTitle>
            <CardDescription>{t("dashboard.monthly")}</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            {formatCurrency(metrics.profit)} {t("dashboard.result")}
          </div>
        </CardHeader>
        <CardContent>
          <RevenueChart data={series} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.recent")}</CardTitle>
            <CardDescription>{t("dashboard.recentDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("nav.invoices")}</TableHead>
                  <TableHead>{t("common.customer")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      {t("dashboard.noInvoices")}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.customer.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.totalGross)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.statusDistribution")}</CardTitle>
            <CardDescription>
              {t("dashboard.invoicesTotal", { count: totalInvoices })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusCounts.map((entry) => {
              const percent = totalInvoices
                ? Math.round((entry.count / totalInvoices) * 100)
                : 0;
              return (
                <div key={entry.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <StatusBadge status={entry.status} />
                    <span className="font-medium">{entry.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <Euro className="h-4 w-4" />
              {t("dashboard.average")}:{" "}
              {formatCurrency(totalInvoices ? metrics.revenue / totalInvoices : 0)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
