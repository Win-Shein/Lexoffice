import { renderToBuffer } from "@react-pdf/renderer";

import {
  InvoicePdfDocument,
  type InvoicePdfData,
} from "@/components/invoice-pdf";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  parseCustomerSnapshot,
  parseSellerSnapshot,
} from "@/lib/invoice-snapshot";

export type InvoiceWithPdfRelations = Prisma.InvoiceGetPayload<{
  include: { customer: true; items: true; user: true };
}>;

export function toInvoicePdfData(invoice: InvoiceWithPdfRelations): InvoicePdfData {
  // Prefer the immutable snapshot captured at issuance. This guarantees that
  // later edits to the customer or company settings do not alter an already
  // issued document (Revisionssicherheit).
  const sellerSnapshot = parseSellerSnapshot(invoice.sellerSnapshot);
  const customerSnapshot = parseCustomerSnapshot(invoice.customerSnapshot);

  const seller = sellerSnapshot ?? {
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
  };

  const customer = customerSnapshot ?? {
    name: invoice.customer.name,
    address: invoice.customer.address,
    city: invoice.customer.city,
    postalCode: invoice.customer.postalCode,
    country: invoice.customer.country,
    vatId: invoice.customer.vatId,
  };

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
    seller,
    customer,
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

export async function buildInvoicePdfData(
  invoiceId: string,
  userId: string,
): Promise<InvoicePdfData | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: { customer: true, items: true, user: true },
  });

  if (!invoice) return null;
  return toInvoicePdfData(invoice);
}

export async function generatePdfBuffer(invoiceId: string, userId: string) {
  const data = await buildInvoicePdfData(invoiceId, userId);
  if (!data) return null;

  const buffer = await renderToBuffer(<InvoicePdfDocument data={data} />);
  return { buffer, filename: `Rechnung-${data.invoiceNumber}.pdf` };
}
