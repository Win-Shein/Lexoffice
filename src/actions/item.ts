"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/auth";
import { TaxType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import type { ActionResult } from "@/lib/types";

const taxTypeSchema = z.enum([
  TaxType.STANDARD_19,
  TaxType.REDUCED_7,
  TaxType.EXEMPT_0,
]);

const itemSchema = z.object({
  name: z.string().trim().min(1, "Name erforderlich"),
  category: z.string().trim().min(1).default("Sonstiges"),
  unit: z.string().trim().min(1).default("Stück"),
  unitPrice: z.coerce.number().min(0),
  taxType: taxTypeSchema,
});

export async function createItem(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t("error.invalidInput") };
  }
  const data = parsed.data;

  const item = await prisma.item.create({
    data: {
      userId,
      name: data.name,
      category: data.category,
      unit: data.unit,
      unitPrice: data.unitPrice,
      taxType: data.taxType,
    },
  });

  revalidatePath("/items");
  return { ok: true, id: item.id };
}

export async function updateItem(id: string, input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t("error.invalidInput") };
  }
  const data = parsed.data;

  const existing = await prisma.item.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: t("error.itemNotFound") };

  await prisma.item.update({
    where: { id },
    data: {
      name: data.name,
      category: data.category,
      unit: data.unit,
      unitPrice: data.unitPrice,
      taxType: data.taxType,
    },
  });

  revalidatePath("/items");
  return { ok: true, id };
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const item = await prisma.item.findFirst({ where: { id, userId } });
  if (!item) return { ok: false, error: t("error.itemNotFound") };

  await prisma.item.delete({ where: { id } });
  revalidatePath("/items");
  return { ok: true };
}
