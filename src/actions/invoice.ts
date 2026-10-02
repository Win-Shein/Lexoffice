"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/auth";
import { InvoiceDocumentType, InvoiceStatus, TaxType } from "@/generated/prisma/enums";
import { writeAudit } from "@/lib/audit";
import { exportDatevCsv as buildDatevExport } from "@/lib/datev-export";
import { prisma } from "@/lib/db";
import { generatePdfBuffer } from "@/lib/pdf";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import {
  canTransitionStatus,
  formatCreditNoteNumber,
  isFinalizedStatus,
} from "@/lib/invoice-rules";
import {
  buildCustomerSnapshot,
  buildFinalization,
  buildSellerSnapshot,
  parseCustomerSnapshot,
  parseSellerSnapshot,
  type CustomerSnapshot,
  type SellerSnapshot,
} from "@/lib/invoice-snapshot";
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

type HashableItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalNet: number;
  taxType: TaxType;
};

function toHashableItems(
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalNet: number;
    taxType: TaxType;
  }>,
): HashableItem[] {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    totalNet: item.totalNet,
    taxType: item.taxType,
  }));
}

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

  const finalized = isFinalizedStatus(data.status);
  const seller = buildSellerSnapshot(user);
  const customer = buildCustomerSnapshot(customerRecord);

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

      const itemRows: HashableItem[] = data.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || "Stück",
        unitPrice: item.unitPrice,
        totalNet: Math.round(item.quantity * item.unitPrice * 100) / 100,
        taxType: item.taxType,
      }));

      const finalization = finalized
        ? buildFinalization({
            core: {
              invoiceNumber,
              documentType: InvoiceDocumentType.INVOICE,
              issueDate: new Date(data.issueDate),
              dueDate: new Date(data.dueDate),
              performanceDate: new Date(data.performanceDate),
              notes: data.notes ?? null,
              subtotalNet: totals.subtotalNet,
              vatAmount: totals.vatAmount,
              totalGross: totals.totalGross,
              isSmallBiz,
              isReverseCharge,
            },
            items: itemRows,
            seller,
            customer,
          })
        : null;

      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          documentType: InvoiceDocumentType.INVOICE,
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
          finalizedAt: finalized ? new Date() : null,
          sellerSnapshot: finalization?.sellerSnapshot ?? null,
          customerSnapshot: finalization?.customerSnapshot ?? null,
          contentHash: finalization?.contentHash ?? null,
          items: { create: itemRows },
        },
      });

      await writeAudit(tx, {
        userId,
        entity: "Invoice",
        entityId: created.id,
        action: "CREATE",
        after: { invoiceNumber, status: created.status, totalGross: created.totalGross },
      });
      if (finalized) {
        await writeAudit(tx, {
          userId,
          entity: "Invoice",
          entityId: created.id,
          action: "ISSUE",
          after: { invoiceNumber, contentHash: created.contentHash },
        });
      }

      return created;
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

  const target = parsedStatus.data;
  if (invoice.status === target) return { ok: true, id: invoiceId };

  if (!canTransitionStatus(invoice.status, target)) {
    return { ok: false, error: t("error.invoiceStatusLocked") };
  }

  await prisma.$transaction(async (tx) => {
    const becomingFinalized = !invoice.finalizedAt && isFinalizedStatus(target);

    let finalizationData: {
      sellerSnapshot: string;
      customerSnapshot: string;
      contentHash: string;
    } | null = null;

    if (becomingFinalized) {
      const [seller, customer] = await Promise.all([
        tx.user.findUniqueOrThrow({ where: { id: userId } }),
        tx.customer.findUniqueOrThrow({ where: { id: invoice.customerId } }),
      ]);
      const items = await tx.invoiceItem.findMany({ where: { invoiceId } });
      finalizationData = buildFinalization({
        core: {
          invoiceNumber: invoice.invoiceNumber,
          documentType: invoice.documentType,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          performanceDate: invoice.performanceDate,
          notes: invoice.notes,
          subtotalNet: invoice.subtotalNet,
          vatAmount: invoice.vatAmount,
          totalGross: invoice.totalGross,
          isSmallBiz: invoice.isSmallBiz,
          isReverseCharge: invoice.isReverseCharge,
        },
        items: toHashableItems(items),
        seller: buildSellerSnapshot(seller),
        customer: buildCustomerSnapshot(customer),
      });
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: target,
        paidAt: target === InvoiceStatus.PAID ? new Date() : null,
        sentAt: invoice.sentAt ?? new Date(),
        ...(finalizationData
          ? { finalizedAt: new Date(), ...finalizationData }
          : {}),
      },
    });

    await writeAudit(tx, {
      userId,
      entity: "Invoice",
      entityId: invoiceId,
      action: "STATUS_CHANGE",
      before: { status: invoice.status },
      after: { status: target },
    });
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

  // Revisionssicherheit: only draft documents may be deleted. Issued documents
  // must be corrected via a credit note (Stornorechnung / Gutschrift).
  if (invoice.finalizedAt || invoice.status !== InvoiceStatus.DRAFT) {
    return { ok: false, error: t("error.invoiceLocked") };
  }

  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, {
      userId,
      entity: "Invoice",
      entityId: invoiceId,
      action: "DELETE",
      before: {
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        totalGross: invoice.totalGross,
      },
    });
    await tx.invoice.delete({ where: { id: invoiceId } });
  });

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Creates a Stornorechnung / Gutschrift (credit note) that fully reverses an
 * issued invoice, then marks the original as CANCELLED. The original document
 * is left untouched (immutability) and remains linked to its correction.
 */
export async function createCreditNote(originalInvoiceId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();

  const original = await prisma.invoice.findFirst({
    where: { id: originalInvoiceId, userId },
    include: { items: true, customer: true, user: true, corrections: true },
  });
  if (!original) return { ok: false, error: t("error.invoiceNotFound") };
  if (original.documentType !== InvoiceDocumentType.INVOICE) {
    return { ok: false, error: t("error.invalidInput") };
  }
  if (original.status === InvoiceStatus.CANCELLED || original.corrections.length > 0) {
    return { ok: false, error: t("error.invoiceAlreadyCancelled") };
  }

  try {
    const creditNote = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { creditNoteSeq: { increment: 1 } },
        select: { creditNoteSeq: true },
      });

      const creditNoteNumber = formatCreditNoteNumber(
        original.issueDate.getFullYear(),
        updatedUser.creditNoteSeq,
      );

      const seller: SellerSnapshot =
        parseSellerSnapshot(original.sellerSnapshot) ?? buildSellerSnapshot(original.user);
      const customer: CustomerSnapshot =
        parseCustomerSnapshot(original.customerSnapshot) ??
        buildCustomerSnapshot(original.customer);

      const items: HashableItem[] = original.items.map((item) => ({
        description: item.description,
        quantity: -item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalNet: -item.totalNet,
        taxType: item.taxType,
      }));

      const notes = `Stornorechnung zu ${original.invoiceNumber}`;

      const finalization = buildFinalization({
        core: {
          invoiceNumber: creditNoteNumber,
          documentType: InvoiceDocumentType.CREDIT_NOTE,
          issueDate: new Date(),
          dueDate: new Date(),
          performanceDate: original.performanceDate,
          notes,
          subtotalNet: -original.subtotalNet,
          vatAmount: -original.vatAmount,
          totalGross: -original.totalGross,
          isSmallBiz: original.isSmallBiz,
          isReverseCharge: original.isReverseCharge,
        },
        items,
        seller,
        customer,
      });

      const created = await tx.invoice.create({
        data: {
          invoiceNumber: creditNoteNumber,
          documentType: InvoiceDocumentType.CREDIT_NOTE,
          originalInvoiceId: original.id,
          issueDate: new Date(),
          dueDate: new Date(),
          performanceDate: original.performanceDate,
          userId,
          customerId: original.customerId,
          subtotalNet: -original.subtotalNet,
          vatRate: original.vatRate,
          vatAmount: -original.vatAmount,
          totalGross: -original.totalGross,
          taxType: original.taxType,
          isSmallBiz: original.isSmallBiz,
          isReverseCharge: original.isReverseCharge,
          notes,
          status: InvoiceStatus.SENT,
          sentAt: new Date(),
          paidAt: null,
          finalizedAt: new Date(),
          sellerSnapshot: finalization.sellerSnapshot,
          customerSnapshot: finalization.customerSnapshot,
          contentHash: finalization.contentHash,
          items: { create: items },
        },
      });

      // Lock the original by marking it cancelled; its content stays untouched.
      await tx.invoice.update({
        where: { id: original.id },
        data: { status: InvoiceStatus.CANCELLED },
      });

      await writeAudit(tx, {
        userId,
        entity: "Invoice",
        entityId: created.id,
        action: "CREDIT_NOTE",
        after: {
          invoiceNumber: creditNoteNumber,
          originalInvoiceId: original.id,
          totalGross: created.totalGross,
        },
      });
      await writeAudit(tx, {
        userId,
        entity: "Invoice",
        entityId: original.id,
        action: "STATUS_CHANGE",
        before: { status: original.status },
        after: { status: InvoiceStatus.CANCELLED, creditNoteId: created.id },
      });

      return created;
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${originalInvoiceId}`);
    revalidatePath("/dashboard");
    return { ok: true, id: creditNote.id };
  } catch (error) {
    console.error("createCreditNote failed", error);
    return { ok: false, error: t("error.invoiceSaveFailed") };
  }
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
