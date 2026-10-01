import { z } from "zod";

import { InvoiceStatus, TaxType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

export const BACKUP_APP = "MMXeron";
export const BACKUP_VERSION = 1;

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().nullable().optional(),
  address: z.string().min(1),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().default("Deutschland"),
  vatId: z.string().nullable().optional(),
});

const itemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit: z.string().default("Stück"),
  unitPrice: z.number(),
  totalNet: z.number(),
  taxType: z.enum([TaxType.STANDARD_19, TaxType.REDUCED_7, TaxType.EXEMPT_0]).default(TaxType.STANDARD_19),
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  issueDate: z.string(),
  dueDate: z.string(),
  performanceDate: z.string(),
  subtotalNet: z.number(),
  vatRate: z.number(),
  vatAmount: z.number(),
  totalGross: z.number(),
  taxType: z
    .enum([TaxType.STANDARD_19, TaxType.REDUCED_7, TaxType.EXEMPT_0])
    .default(TaxType.STANDARD_19),
  isSmallBiz: z.boolean().default(false),
  isReverseCharge: z.boolean().default(false),
  notes: z.string().nullable().optional(),
  status: z
    .enum([
      InvoiceStatus.DRAFT,
      InvoiceStatus.SENT,
      InvoiceStatus.PAID,
      InvoiceStatus.OVERDUE,
      InvoiceStatus.CANCELLED,
    ])
    .default(InvoiceStatus.DRAFT),
  paidAt: z.string().nullable().optional(),
  sentAt: z.string().nullable().optional(),
  customerIndex: z.number().int().min(0),
  items: z.array(itemSchema).default([]),
});

const expenseSchema = z.object({
  description: z.string(),
  vendor: z.string().nullable().optional(),
  category: z.string().default("Sonstiges"),
  documentNumber: z.string().nullable().optional(),
  amountNet: z.number(),
  vatRate: z.number(),
  vatAmount: z.number(),
  amountGross: z.number(),
  date: z.string(),
});

const profileSchema = z.object({
  name: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().optional(),
  phone: z.string().nullable().optional(),
  taxNumber: z.string().nullable().optional(),
  vatId: z.string().nullable().optional(),
  iban: z.string().nullable().optional(),
  bic: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  isSmallBiz: z.boolean().default(false),
  invoiceSeq: z.number().int().min(0).default(0),
});

export const backupSchema = z.object({
  meta: z
    .object({
      app: z.string().optional(),
      version: z.number().optional(),
      exportedAt: z.string().optional(),
    })
    .optional(),
  profile: profileSchema,
  customers: z.array(customerSchema).default([]),
  invoices: z.array(invoiceSchema).default([]),
  expenses: z.array(expenseSchema).default([]),
});

export type BackupPayload = z.infer<typeof backupSchema>;

export type RestoreResult =
  | { ok: true; customers: number; invoices: number; expenses: number }
  | { ok: false; reason: "invalid" | "error" };

export async function buildBackup(userId: string): Promise<BackupPayload> {
  const [user, customers, invoices, expenses] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.customer.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.invoice.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { issueDate: "asc" },
    }),
    prisma.expense.findMany({ where: { userId }, orderBy: { date: "asc" } }),
  ]);

  const customerIndex = new Map(customers.map((customer, index) => [customer.id, index]));

  return {
    meta: {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
    },
    profile: {
      name: user.name,
      companyName: user.companyName,
      address: user.address,
      city: user.city,
      postalCode: user.postalCode,
      country: user.country,
      phone: user.phone,
      taxNumber: user.taxNumber,
      vatId: user.vatId,
      iban: user.iban,
      bic: user.bic,
      bankName: user.bankName,
      isSmallBiz: user.isSmallBiz,
      invoiceSeq: user.invoiceSeq,
    },
    customers: customers.map((customer) => ({
      name: customer.name,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      postalCode: customer.postalCode,
      country: customer.country,
      vatId: customer.vatId,
    })),
    invoices: invoices.map((invoice) => ({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      performanceDate: invoice.performanceDate.toISOString(),
      subtotalNet: invoice.subtotalNet,
      vatRate: invoice.vatRate,
      vatAmount: invoice.vatAmount,
      totalGross: invoice.totalGross,
      taxType: invoice.taxType,
      isSmallBiz: invoice.isSmallBiz,
      isReverseCharge: invoice.isReverseCharge,
      notes: invoice.notes,
      status: invoice.status,
      paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
      sentAt: invoice.sentAt ? invoice.sentAt.toISOString() : null,
      customerIndex: customerIndex.get(invoice.customerId) ?? 0,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalNet: item.totalNet,
        taxType: item.taxType,
      })),
    })),
    expenses: expenses.map((expense) => ({
      description: expense.description,
      vendor: expense.vendor,
      category: expense.category,
      documentNumber: expense.documentNumber,
      amountNet: expense.amountNet,
      vatRate: expense.vatRate,
      vatAmount: expense.vatAmount,
      amountGross: expense.amountGross,
      date: expense.date.toISOString(),
    })),
  };
}

export async function restoreBackup(
  userId: string,
  input: unknown,
): Promise<RestoreResult> {
  const parsed = backupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const data = parsed.data;

  try {
    const counts = await prisma.$transaction(async (tx) => {
      await tx.expense.deleteMany({ where: { userId } });
      await tx.invoice.deleteMany({ where: { userId } });
      await tx.customer.deleteMany({});

      const createdCustomers = [];
      for (const customer of data.customers) {
        createdCustomers.push(
          await tx.customer.create({
            data: {
              name: customer.name,
              email: customer.email ?? null,
              address: customer.address,
              city: customer.city ?? null,
              postalCode: customer.postalCode ?? null,
              country: customer.country || "Deutschland",
              vatId: customer.vatId ?? null,
            },
          }),
        );
      }

      let invoiceCount = 0;
      for (const invoice of data.invoices) {
        const customer = createdCustomers[invoice.customerIndex];
        if (!customer) continue;

        await tx.invoice.create({
          data: {
            invoiceNumber: invoice.invoiceNumber,
            issueDate: new Date(invoice.issueDate),
            dueDate: new Date(invoice.dueDate),
            performanceDate: new Date(invoice.performanceDate),
            userId,
            customerId: customer.id,
            subtotalNet: invoice.subtotalNet,
            vatRate: invoice.vatRate,
            vatAmount: invoice.vatAmount,
            totalGross: invoice.totalGross,
            taxType: invoice.taxType,
            isSmallBiz: invoice.isSmallBiz,
            isReverseCharge: invoice.isReverseCharge,
            notes: invoice.notes ?? null,
            status: invoice.status,
            paidAt: invoice.paidAt ? new Date(invoice.paidAt) : null,
            sentAt: invoice.sentAt ? new Date(invoice.sentAt) : null,
            items: {
              create: invoice.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unit: item.unit || "Stück",
                unitPrice: item.unitPrice,
                totalNet: item.totalNet,
                taxType: item.taxType,
              })),
            },
          },
        });
        invoiceCount += 1;
      }

      for (const expense of data.expenses) {
        await tx.expense.create({
          data: {
            userId,
            description: expense.description,
            vendor: expense.vendor ?? null,
            category: expense.category,
            documentNumber: expense.documentNumber ?? null,
            amountNet: expense.amountNet,
            vatRate: expense.vatRate,
            vatAmount: expense.vatAmount,
            amountGross: expense.amountGross,
            date: new Date(expense.date),
          },
        });
      }

      const profile = data.profile;
      await tx.user.update({
        where: { id: userId },
        data: {
          name: profile.name ?? null,
          companyName: profile.companyName ?? null,
          address: profile.address ?? null,
          city: profile.city ?? null,
          postalCode: profile.postalCode ?? null,
          country: profile.country || "Deutschland",
          phone: profile.phone ?? null,
          taxNumber: profile.taxNumber ?? null,
          vatId: profile.vatId ?? null,
          iban: profile.iban ?? null,
          bic: profile.bic ?? null,
          bankName: profile.bankName ?? null,
          isSmallBiz: profile.isSmallBiz,
          invoiceSeq: profile.invoiceSeq,
        },
      });

      return {
        customers: createdCustomers.length,
        invoices: invoiceCount,
        expenses: data.expenses.length,
      };
    });

    return { ok: true, ...counts };
  } catch (error) {
    console.error("restoreBackup failed", error);
    return { ok: false, reason: "error" };
  }
}
