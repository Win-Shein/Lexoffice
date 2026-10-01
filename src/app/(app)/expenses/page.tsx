import { Plus, Receipt } from "lucide-react";

import { deleteExpense } from "@/actions/expense";
import { requireUserId } from "@/auth";
import { DeleteButton } from "@/components/delete-button";
import { ExpenseDialog } from "@/components/expense-dialog";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
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
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { getTranslator } from "@/lib/i18n/server";

export default async function ExpensesPage() {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const expenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  const net = expenses.reduce((sum, expense) => sum + expense.amountNet, 0);
  const vat = expenses.reduce((sum, expense) => sum + expense.vatAmount, 0);
  const gross = expenses.reduce((sum, expense) => sum + expense.amountGross, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("expenses.title")}
        description={t("expenses.description", { count: expenses.length })}
      >
        <ExpenseDialog
          defaultDate={toDateInputValue(new Date())}
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> {t("expenses.new")}
            </Button>
          }
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title={t("common.net")}
          value={formatCurrency(net)}
          icon={<Receipt className="h-5 w-5" />}
        />
        <MetricCard
          title={t("expenses.inputVat")}
          value={formatCurrency(vat)}
          icon={<Receipt className="h-5 w-5" />}
          tone="warning"
        />
        <MetricCard
          title={t("common.gross")}
          value={formatCurrency(gross)}
          icon={<Receipt className="h-5 w-5" />}
          tone="destructive"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("expenses.descriptionLabel")}</TableHead>
                <TableHead>{t("expenses.category")}</TableHead>
                <TableHead className="text-right">{t("common.net")}</TableHead>
                <TableHead className="text-right">{t("common.vatShort")}</TableHead>
                <TableHead className="text-right">{t("common.gross")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {t("expenses.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{expense.description}</div>
                      <div className="text-xs text-muted-foreground">{expense.vendor ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {expense.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.amountNet)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(expense.vatAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amountGross)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton
                        action={deleteExpense.bind(null, expense.id)}
                        confirmText={t("expenses.confirmDelete", { name: expense.description })}
                      />
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
