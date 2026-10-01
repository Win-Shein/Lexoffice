import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUserId } from "@/auth";
import { InvoiceActions } from "@/components/invoice-actions";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { getTranslator } from "@/lib/i18n/server";
import { KLEINBETRAG_LIMIT, TAX_RATE_BY_TYPE } from "@/lib/vat";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: { customer: true, items: true, user: true },
  });

  if (!invoice) notFound();

  const taxRates = new Map<number, { net: number; tax: number }>();
  for (const item of invoice.items) {
    const rate = invoice.isSmallBiz || invoice.isReverseCharge
      ? 0
      : TAX_RATE_BY_TYPE[item.taxType] ?? 19;
    const entry = taxRates.get(rate) ?? { net: 0, tax: 0 };
    entry.net += item.totalNet;
    entry.tax += (item.totalNet * rate) / 100;
    taxRates.set(rate, entry);
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </Link>
        </Button>
        <PageHeader
          title={t("invoiceDetail.title", { number: invoice.invoiceNumber })}
          description={invoice.customer.name}
        >
          <StatusBadge status={invoice.status} />
        </PageHeader>
      </div>

      <InvoiceActions invoiceId={invoice.id} status={invoice.status} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("invoiceDetail.recipient")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{invoice.customer.name}</p>
                <p className="text-muted-foreground">{invoice.customer.address}</p>
                <p className="text-muted-foreground">
                  {[invoice.customer.postalCode, invoice.customer.city]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                <p className="text-muted-foreground">{invoice.customer.country}</p>
                {invoice.customer.vatId ? (
                  <p className="text-muted-foreground">
                    {t("common.vatId")} {invoice.customer.vatId}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("invoices.issued")}</span>
                  <span>{formatDate(invoice.issueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("invoiceForm.performanceDate")}
                  </span>
                  <span>{formatDate(invoice.performanceDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("invoices.due")}</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
                {invoice.paidAt ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("invoiceDetail.paidAt")}
                    </span>
                    <span>{formatDate(invoice.paidAt)}</span>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("invoiceDetail.items")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoiceDetail.description")}</TableHead>
                    <TableHead className="text-right">{t("invoiceForm.quantity")}</TableHead>
                    <TableHead className="text-right">{t("invoiceForm.unitPrice")}</TableHead>
                    <TableHead className="text-right">{t("common.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(item.quantity)} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalNet)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="ml-auto w-full space-y-2 border-t border-border p-5 text-sm sm:w-80">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("common.subtotal")}</span>
                  <span>{formatCurrency(invoice.subtotalNet)}</span>
                </div>
                {invoice.isSmallBiz || invoice.isReverseCharge ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {invoice.isSmallBiz
                        ? t("invoiceDetail.vatSmallBiz")
                        : t("invoiceDetail.vatReverseCharge")}
                    </span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                ) : (
                  Array.from(taxRates.entries()).map(([rate, entry]) => (
                    <div className="flex justify-between" key={rate}>
                      <span className="text-muted-foreground">USt {rate} %</span>
                      <span>{formatCurrency(entry.tax)}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <span>{t("common.total")}</span>
                  <span>{formatCurrency(invoice.totalGross)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {invoice.isSmallBiz || invoice.isReverseCharge || invoice.totalGross <= KLEINBETRAG_LIMIT ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("invoiceDetail.taxNotices")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {invoice.isSmallBiz ? (
                  <p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>
                ) : null}
                {invoice.isReverseCharge ? (
                  <p>
                    Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge, §13b
                    UStG).
                  </p>
                ) : null}
                {invoice.totalGross <= KLEINBETRAG_LIMIT && !invoice.isSmallBiz ? (
                  <p>
                    Kleinbetragsrechnung gemäß § 33 UStDV (bis{" "}
                    {formatCurrency(KLEINBETRAG_LIMIT)}).
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {invoice.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("invoiceDetail.notes")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{invoice.notes}</CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <Button asChild variant="outline" className="w-full">
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" /> {t("common.downloadPdf")}
            </a>
          </Button>
          <Card className="overflow-hidden">
            <div className="h-[720px]">
              <iframe
                title={`${invoice.invoiceNumber}`}
                src={`/api/invoices/${invoice.id}/pdf#toolbar=0&navpanes=0`}
                className="h-full w-full border-0 bg-white"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
