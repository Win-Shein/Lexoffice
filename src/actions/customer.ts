"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import type { ActionResult } from "@/lib/types";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name erforderlich"),
  email: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().min(1, "Adresse erforderlich"),
  city: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().default("Deutschland"),
  vatId: z.string().trim().optional(),
});

export async function createCustomer(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t("error.invalidInput") };
  }
  const data = parsed.data;

  const customer = await prisma.customer.create({
    data: {
      userId,
      name: data.name,
      email: data.email || null,
      address: data.address,
      city: data.city || null,
      postalCode: data.postalCode || null,
      country: data.country || "Deutschland",
      vatId: data.vatId || null,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/invoices/new");
  return { ok: true, id: customer.id };
}

export async function updateCustomer(id: string, input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t("error.invalidInput") };
  }
  const data = parsed.data;

  const existing = await prisma.customer.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: t("error.customerNotFound") };

  await prisma.customer.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email || null,
      address: data.address,
      city: data.city || null,
      postalCode: data.postalCode || null,
      country: data.country || "Deutschland",
      vatId: data.vatId || null,
    },
  });

  revalidatePath("/customers");
  return { ok: true, id };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const customer = await prisma.customer.findFirst({ where: { id, userId } });
  if (!customer) return { ok: false, error: t("error.customerNotFound") };

  const invoiceCount = await prisma.invoice.count({ where: { customerId: id, userId } });
  if (invoiceCount > 0) {
    return { ok: false, error: t("error.customerHasInvoices") };
  }
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  return { ok: true };
}
