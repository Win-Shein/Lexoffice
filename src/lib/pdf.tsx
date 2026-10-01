import { renderToBuffer } from "@react-pdf/renderer";

import {
  InvoicePdfDocument,
  type InvoicePdfData,
} from "@/components/invoice-pdf";
import { prisma } from "@/lib/db";

export async function buildInvoicePdfData(
  invoiceId: string,
  userId: string,
): Promise<InvoicePdfData | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: { customer: true, items: true, user: true },
  });

  if (!invoice) return null;

  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    performanceDate: invoice.performanceDate,
    status: invoice.status,
    notes: invoice.notes,
    subtotalNet: invoice.subtotalNet,
    vatAmount: invoice.vatAmount,
    totalGross: invoice.totalGross,
    isSmallBiz: invoice.isSmallBiz,
    isReverseCharge: invoice.isReverseCharge,
    seller: {
      companyName: invoice.user.companyName ?? invoice.user.name ?? "",
      name: invoice.user.name,
      address: invoice.user.address,
      city: invoice.user.city,
      postalCode: invoice.user.postalCode,
      country: invoice.user.country,
      phone: invoice.user.phone,
      email: invoice.user.email,
      taxNumber: invoice.user.taxNumber,
      vatId: invoice.user.vatId,
      iban: invoice.user.iban,
      bic: invoice.user.bic,
      bankName: invoice.user.bankName,
    },
    customer: {
      name: invoice.customer.name,
      address: invoice.customer.address,
      city: invoice.customer.city,
      postalCode: invoice.customer.postalCode,
      country: invoice.customer.country,
      vatId: invoice.customer.vatId,
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalNet: item.totalNet,
      taxType: item.taxType,
    })),
  };
}

export async function generatePdfBuffer(invoiceId: string, userId: string) {
  const data = await buildInvoicePdfData(invoiceId, userId);
  if (!data) return null;

  const buffer = await renderToBuffer(<InvoicePdfDocument data={data} />);
  return { buffer, filename: `Rechnung-${data.invoiceNumber}.pdf` };
}
