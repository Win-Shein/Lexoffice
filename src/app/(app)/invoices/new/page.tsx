import { peekNextInvoiceNumber } from "@/actions/invoice";
import { getCurrentUser } from "@/auth";
import { InvoiceForm, type CustomerOption, type ItemOption } from "@/components/invoice-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { toDateInputValue } from "@/lib/format";
import { getTranslator } from "@/lib/i18n/server";

export default async function NewInvoicePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { t } = await getTranslator();
  const [customers, items, nextInvoiceNumber] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.item.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
    peekNextInvoiceNumber(),
  ]);

  const customerOptions: CustomerOption[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    address: customer.address,
    city: customer.city,
    postalCode: customer.postalCode,
    country: customer.country,
    vatId: customer.vatId,
  }));

  const itemOptions: ItemOption[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    unitPrice: item.unitPrice,
    taxType: item.taxType,
  }));

  const today = new Date();
  const due = new Date();
  due.setDate(due.getDate() + 14);

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.newInvoice")} description={t("invoiceForm.details")} />
      <InvoiceForm
        customers={customerOptions}
        itemOptions={itemOptions}
        nextInvoiceNumber={nextInvoiceNumber}
        seller={{
          companyName: user.companyName ?? user.name ?? "",
          name: user.name,
          address: user.address,
          city: user.city,
          postalCode: user.postalCode,
          country: user.country,
          phone: user.phone,
          email: user.email,
          taxNumber: user.taxNumber,
          vatId: user.vatId,
          iban: user.iban,
          bic: user.bic,
          bankName: user.bankName,
          logoUrl: user.logoUrl,
          isSmallBiz: user.isSmallBiz,
        }}
        defaults={{
          issueDate: toDateInputValue(today),
          dueDate: toDateInputValue(due),
          performanceDate: toDateInputValue(today),
        }}
      />
    </div>
  );
}
