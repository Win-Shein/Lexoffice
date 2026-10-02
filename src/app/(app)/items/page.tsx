import { Package, Pencil, Plus, Tags } from "lucide-react";

import { deleteItem } from "@/actions/item";
import { requireUserId } from "@/auth";
import { CategoryManagerDialog } from "@/components/category-manager-dialog";
import { DeleteButton } from "@/components/delete-button";
import { ItemDialog } from "@/components/item-dialog";
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
import { CategoryType } from "@/generated/prisma/enums";
import { buildCategoryChoices } from "@/lib/category-options";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { getTranslator } from "@/lib/i18n/server";
import { TAX_RATE_BY_TYPE } from "@/lib/vat";

export default async function ItemsPage() {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const [items, categories] = await Promise.all([
    prisma.item.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { userId, type: CategoryType.ITEM },
      orderBy: { name: "asc" },
      select: { id: true, name: true, parentId: true },
    }),
  ]);
  const categoryChoices = buildCategoryChoices(categories);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("items.title")}
        description={t("items.description", { count: items.length })}
      >
        <CategoryManagerDialog
          type={CategoryType.ITEM}
          trigger={
            <Button variant="outline">
              <Tags className="h-4 w-4" /> {t("categories.manage")}
            </Button>
          }
        />
        <ItemDialog
          categories={categoryChoices}
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> {t("items.new")}
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
                <TableHead>{t("items.name")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("items.category")}</TableHead>
                <TableHead>{t("items.unit")}</TableHead>
                <TableHead className="text-right">{t("items.unitPrice")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">{t("items.taxRate")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Package className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {t("items.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {item.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                      {TAX_RATE_BY_TYPE[item.taxType]} %
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <ItemDialog
                          categories={categoryChoices}
                          item={{
                            id: item.id,
                            name: item.name,
                            category: item.category,
                            unit: item.unit,
                            unitPrice: item.unitPrice,
                            taxType: item.taxType,
                          }}
                          trigger={
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" /> {t("common.edit")}
                            </Button>
                          }
                        />
                        <DeleteButton
                          action={deleteItem.bind(null, item.id)}
                          confirmText={t("items.confirmDelete", { name: item.name })}
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
