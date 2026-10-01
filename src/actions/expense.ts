"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import type { ActionResult } from "@/lib/types";
import { round2 } from "@/lib/vat";

const expenseSchema = z.object({
  description: z.string().trim().min(1, "Beschreibung erforderlich"),
  vendor: z.string().trim().optional(),
  category: z.string().trim().min(1).default("Sonstiges"),
  documentNumber: z.string().trim().optional(),
  amountNet: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100),
  date: z.string().min(1),
});

export async function createExpense(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t("error.invalidInput") };
  }
  const data = parsed.data;
  const vatAmount = round2(data.amountNet * (data.vatRate / 100));

  const expense = await prisma.expense.create({
    data: {
      userId,
      description: data.description,
      vendor: data.vendor || null,
      category: data.category,
      documentNumber: data.documentNumber || null,
      amountNet: data.amountNet,
      vatRate: data.vatRate,
      vatAmount,
      amountGross: round2(data.amountNet + vatAmount),
      date: new Date(data.date),
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: true, id: expense.id };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const expense = await prisma.expense.findFirst({ where: { id, userId } });
  if (!expense) return { ok: false, error: t("error.expenseNotFound") };

  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: true };
}
