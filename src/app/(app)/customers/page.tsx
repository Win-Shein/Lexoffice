import { Pencil, Plus, Users } from "lucide-react";

import { deleteCustomer } from "@/actions/customer";
import { requireUserId } from "@/auth";
import { CustomerDialog } from "@/components/customer-dialog";
import { DeleteButton } from "@/components/delete-button";
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
import { getTranslator } from "@/lib/i18n/server";

export default async function CustomersPage() {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const customers = await prisma.customer.findMany({
    where: { userId },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("customers.title")}
        description={t("customers.description", { count: customers.length })}
      >
        <CustomerDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> {t("customers.new")}
            </Button>
          }
        />
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table bordered>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{t("common.no")}</TableHead>
                <TableHead>{t("customers.name")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("common.email")}</TableHead>
                <TableHead>{t("common.city")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("common.vatId")}</TableHead>
                <TableHead className="text-right">{t("customers.invoiceCount")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {t("customers.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer, index) => (
                  <TableRow key={customer.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {customer.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[customer.postalCode, customer.city].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {customer.vatId ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">{customer._count.invoices}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <CustomerDialog
                          customer={{
                            id: customer.id,
                            name: customer.name,
                            email: customer.email,
                            address: customer.address,
                            city: customer.city,
                            postalCode: customer.postalCode,
                            country: customer.country,
                            vatId: customer.vatId,
                          }}
                          trigger={
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" /> {t("common.edit")}
                            </Button>
                          }
                        />
                        <DeleteButton
                          action={deleteCustomer.bind(null, customer.id)}
                          confirmText={t("customers.confirmDelete", { name: customer.name })}
                        />
                      </div>
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
