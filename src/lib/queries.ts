import { InvoiceDocumentType, InvoiceStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

export type MonthlyPoint = {
  month: string;
  label: string;
  einnahmen: number;
  ausgaben: number;
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

export async function getDashboardData(userId: string) {
  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId },
      include: { customer: true },
      orderBy: { issueDate: "desc" },
    }),
    prisma.expense.findMany({ where: { userId }, orderBy: { date: "desc" } }),
  ]);

  // Credit notes (Stornorechnungen) are corrections, not revenue/receivables:
  // a cancelled invoice is excluded and its credit note offsets nothing.
  const paid = invoices.filter(
    (inv) =>
      inv.documentType === InvoiceDocumentType.INVOICE &&
      inv.status === InvoiceStatus.PAID,
  );
  const open = invoices.filter(
    (inv) =>
      inv.documentType === InvoiceDocumentType.INVOICE &&
      (inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.OVERDUE),
  );
  const overdue = invoices.filter(
    (inv) =>
      inv.documentType === InvoiceDocumentType.INVOICE &&
      inv.status === InvoiceStatus.OVERDUE,
  );

  const revenue = paid.reduce((sum, inv) => sum + inv.totalGross, 0);
  const expenseTotal = expenses.reduce((sum, exp) => sum + exp.amountGross, 0);
  const openAmount = open.reduce((sum, inv) => sum + inv.totalGross, 0);
  const overdueAmount = overdue.reduce((sum, inv) => sum + inv.totalGross, 0);

  const now = new Date();
  const series: MonthlyPoint[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    series.push({
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[date.getMonth()],
      einnahmen: 0,
      ausgaben: 0,
    });
  }
  const index = new Map(series.map((point) => [point.month, point]));

  for (const inv of paid) {
    const date = inv.paidAt ?? inv.issueDate;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const point = index.get(key);
    if (point) point.einnahmen += inv.totalGross;
  }

  for (const exp of expenses) {
    const key = `${exp.date.getFullYear()}-${String(exp.date.getMonth() + 1).padStart(2, "0")}`;
    const point = index.get(key);
    if (point) point.ausgaben += exp.amountGross;
  }

  const statusCounts = Object.values(InvoiceStatus).map((status) => ({
    status,
    count: invoices.filter((inv) => inv.status === status).length,
  }));

  return {
    metrics: {
      revenue,
      expenses: expenseTotal,
      profit: revenue - expenseTotal,
      openCount: open.length,
      openAmount,
      overdueCount: overdue.length,
      overdueAmount,
    },
    series,
    recentInvoices: invoices.slice(0, 5),
    statusCounts,
    totalInvoices: invoices.length,
  };
}
