import { InvoiceDocumentType, InvoiceStatus } from "@/generated/prisma/enums";
import { buildDatevCsv, type DatevRow } from "@/lib/datev";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";

const REVENUE_ACCOUNT_19 = "8400";
const REVENUE_ACCOUNT_7 = "8300";
const REVENUE_ACCOUNT_0 = "8336";
const EXPENSE_ACCOUNT = "4900";
const DEBTORS_ACCOUNT = "10000";
const CREDITORS_ACCOUNT = "10000";

export async function exportDatevCsv(userId: string) {
  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        userId,
        documentType: InvoiceDocumentType.INVOICE,
        status: { in: [InvoiceStatus.PAID, InvoiceStatus.SENT] },
      },
      include: { customer: true },
      orderBy: { issueDate: "asc" },
    }),
    prisma.expense.findMany({ where: { userId }, orderBy: { date: "asc" } }),
  ]);

  const rows: DatevRow[] = [];

  for (const invoice of invoices) {
    const revenueAccount =
      invoice.vatRate >= 19
        ? REVENUE_ACCOUNT_19
        : invoice.vatRate >= 7
          ? REVENUE_ACCOUNT_7
          : REVENUE_ACCOUNT_0;

    rows.push({
      account: DEBTORS_ACCOUNT,
      contraAccount: revenueAccount,
      amount: invoice.subtotalNet,
      debitCredit: "S",
      date: invoice.issueDate,
      documentNumber: invoice.invoiceNumber,
      text: `${invoice.customer.name} – ${formatCurrency(invoice.subtotalNet)}`,
    });

    if (invoice.vatAmount > 0) {
      rows.push({
        account: DEBTORS_ACCOUNT,
        contraAccount: "1776",
        amount: invoice.vatAmount,
        debitCredit: "S",
        date: invoice.issueDate,
        documentNumber: invoice.invoiceNumber,
        text: `Umsatzsteuer ${invoice.vatRate}% – ${invoice.invoiceNumber}`,
      });
    }
  }

  for (const expense of expenses) {
    rows.push({
      account: EXPENSE_ACCOUNT,
      contraAccount: CREDITORS_ACCOUNT,
      amount: expense.amountNet,
      debitCredit: "S",
      date: expense.date,
      documentNumber: expense.documentNumber ?? expense.id.slice(0, 8),
      text: `${expense.vendor ?? expense.description} – ${formatCurrency(expense.amountNet)}`,
    });

    if (expense.vatAmount > 0) {
      rows.push({
        account: "1576",
        contraAccount: CREDITORS_ACCOUNT,
        amount: expense.vatAmount,
        debitCredit: "S",
        date: expense.date,
        documentNumber: expense.documentNumber ?? expense.id.slice(0, 8),
        text: `Vorsteuer ${expense.vatRate}% – ${expense.description}`,
      });
    }
  }

  const now = new Date();
  const period = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { csv } = buildDatevCsv(rows, {
    period,
    consultantNumber: "1000000",
    clientNumber: "1",
  });

  return {
    csv,
    filename: `DATEV-Export-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.csv`,
    rowCount: rows.length,
  };
}
