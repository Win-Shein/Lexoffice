"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/auth";
import { InvoiceStatus, TaxType } from "@/generated/prisma/enums";
import { exportDatevCsv as buildDatevExport } from "@/lib/datev-export";
import { prisma } from "@/lib/db";
import { generatePdfBuffer } from "@/lib/pdf";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import { getTranslator } from "@/lib/i18n/server";
import type { ActionResult } from "@/lib/types";
import { TAX_RATE_BY_TYPE, calcInvoiceTotals, isKleinbetrag } from "@/lib/vat";

const taxTypeSchema = z.enum([
  TaxType.STANDARD_19,
  TaxType.REDUCED_7,
  TaxType.EXEMPT_0,
]);

const statusSchema = z.enum([
  InvoiceStatus.DRAFT,
  InvoiceStatus.SENT,
  InvoiceStatus.PAID,
  InvoiceStatus.OVERDUE,
  InvoiceStatus.CANCELLED,
]);

const itemSchema = z.object({
  description: z.string().trim().min(1, "Beschreibung fehlt"),
  quantity: z.coerce.number().positive("Menge muss positiv sein"),
  unit: z.string().trim().min(1).default("Stück"),
  unitPrice: z.coerce.number().min(0, "Einzelpreis ungültig"),
  taxType: taxTypeSchema,
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Kunde erforderlich"),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  performanceDate: z.string().min(1),
  notes: z.string().optional(),
  status: statusSchema,
  isSmallBiz: z.boolean(),
  isReverseCharge: z.boolean(),
  taxType: taxTypeSchema,
  items: z.array(itemSchema).min(1, "Mindestens eine Position erforderlich"),
});

export async function peekNextInvoiceNumber(): Promise<string> {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { invoiceSeq: true },
  });
  return formatInvoiceNumber(new Date().getFullYear(), (user?.invoiceSeq ?? 0) + 1);
}

export async function createInvoice(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const parsed = invoiceSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t("error.invalidInput") };
  }

  const data = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: t("error.userNotFound") };

  const customerRecord = await prisma.customer.findUnique({
    where: { id: data.customerId },
  });
  if (!customerRecord) {
    return { ok: false, error: t("error.customerNotFound") };
  }

  const isSmallBiz = data.isSmallBiz || user.isSmallBiz;
  const isReverseCharge = data.isReverseCharge;

  const totals = calcInvoiceTotals(data.items, { isSmallBiz, isReverseCharge });
  const vatRate = isSmallBiz || isReverseCharge ? 0 : TAX_RATE_BY_TYPE[data.taxType];

  const warnings: string[] = [];
  if (!user.taxNumber && !user.vatId) {
    warnings.push(t("warning.taxIdMissing"));
  }
  if (isReverseCharge && !customerRecord.vatId) {
    warnings.push(t("warning.reverseChargeVatId"));
  }
  if (isKleinbetrag(totals.totalGross)) {
    warnings.push(t("warning.kleinbetrag"));
  }

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { invoiceSeq: { increment: 1 } },
        select: { invoiceSeq: true },
      });

      const invoiceNumber = formatInvoiceNumber(
        new Date(data.issueDate).getFullYear(),
        updatedUser.invoiceSeq,
      );

      return tx.invoice.create({
        data: {
          invoiceNumber,
          issueDate: new Date(data.issueDate),
          dueDate: new Date(data.dueDate),
          performanceDate: new Date(data.performanceDate),
          userId,
          customerId: customerRecord.id,
          subtotalNet: totals.subtotalNet,
          vatRate,
          vatAmount: totals.vatAmount,
          totalGross: totals.totalGross,
          taxType: data.taxType,
          isSmallBiz,
          isReverseCharge,
          notes: data.notes ?? null,
          status: data.status,
          sentAt: data.status === InvoiceStatus.DRAFT ? null : new Date(),
          paidAt: data.status === InvoiceStatus.PAID ? new Date() : null,
          items: {
            create: data.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit || "Stück",
              unitPrice: item.unitPrice,
              totalNet: Math.round(item.quantity * item.unitPrice * 100) / 100,
              taxType: item.taxType,
            })),
          },
        },
      });
    });

    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    return { ok: true, id: invoice.id, warnings };
  } catch (error) {
    console.error("createInvoice failed", error);
    return { ok: false, error: t("error.invoiceSaveFailed") };
  }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedStatus.success) return { ok: false, error: t("error.invalidStatus") };

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, userId } });
  if (!invoice) return { ok: false, error: t("error.invoiceNotFound") };

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: parsedStatus.data,
      paidAt: parsedStatus.data === InvoiceStatus.PAID ? new Date() : null,
      sentAt:
        parsedStatus.data === InvoiceStatus.DRAFT
          ? null
          : (invoice.sentAt ?? new Date()),
    },
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  return { ok: true, id: invoiceId };
}

export async function deleteInvoice(invoiceId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, userId } });
  if (!invoice) return { ok: false, error: t("error.invoiceNotFound") };

  await prisma.invoice.delete({ where: { id: invoiceId } });
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function generatePdfBufferAction(
  invoiceId: string,
): Promise<{ ok: true; filename: string; base64: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const result = await generatePdfBuffer(invoiceId, userId);
  if (!result) return { ok: false, error: t("error.invoiceNotFound") };
  return {
    ok: true,
    filename: result.filename,
    base64: Buffer.from(result.buffer).toString("base64"),
  };
}

export async function exportDatevCsvAction(): Promise<
  { ok: true; filename: string; csv: string } | { ok: false; error: string }
> {
  const userId = await requireUserId();
  const result = await buildDatevExport(userId);
  return { ok: true, filename: result.filename, csv: result.csv };
}
