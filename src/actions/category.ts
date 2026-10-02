"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/auth";
import { CategoryType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import type { ActionResult } from "@/lib/types";

const DEFAULT_CATEGORY = "Sonstiges";

const typeSchema = z.enum([CategoryType.ITEM, CategoryType.EXPENSE]);

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name erforderlich"),
});

export type CategoryOption = {
  id: string;
  name: string;
};

function revalidateForType(type: CategoryType) {
  revalidatePath(type === CategoryType.ITEM ? "/items" : "/expenses");
}

export async function listCategories(type: CategoryType): Promise<CategoryOption[]> {
  const userId = await requireUserId();
  const parsed = typeSchema.safeParse(type);
  if (!parsed.success) return [];

  return prisma.category.findMany({
    where: { userId, type: parsed.data },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function createCategory(
  type: CategoryType,
  input: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const parsedType = typeSchema.safeParse(type);
  const parsed = categorySchema.safeParse(input);
  if (!parsedType.success || !parsed.success) {
    return { ok: false, error: parsed.error?.issues[0]?.message ?? t("error.invalidInput") };
  }
  const name = parsed.data.name;

  const existing = await prisma.category.findFirst({
    where: { userId, type: parsedType.data, name },
  });
  if (existing) return { ok: false, error: t("error.categoryExists") };

  const category = await prisma.category.create({
    data: { userId, type: parsedType.data, name },
  });

  revalidateForType(parsedType.data);
  return { ok: true, id: category.id };
}

export async function updateCategory(id: string, input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t("error.invalidInput") };
  }
  const name = parsed.data.name;

  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) return { ok: false, error: t("error.categoryNotFound") };
  if (category.name === name) return { ok: true, id };

  const duplicate = await prisma.category.findFirst({
    where: { userId, type: category.type, name, NOT: { id } },
  });
  if (duplicate) return { ok: false, error: t("error.categoryExists") };

  const previousName = category.name;
  await prisma.$transaction(async (tx) => {
    await tx.category.update({ where: { id }, data: { name } });
    if (category.type === CategoryType.ITEM) {
      await tx.item.updateMany({
        where: { userId, category: previousName },
        data: { category: name },
      });
    } else {
      await tx.expense.updateMany({
        where: { userId, category: previousName },
        data: { category: name },
      });
    }
  });

  revalidateForType(category.type);
  return { ok: true, id };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();

  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) return { ok: false, error: t("error.categoryNotFound") };
  if (category.name === DEFAULT_CATEGORY) {
    return { ok: false, error: t("error.categoryDefaultProtected") };
  }

  await prisma.$transaction(async (tx) => {
    if (category.type === CategoryType.ITEM) {
      await tx.item.updateMany({
        where: { userId, category: category.name },
        data: { category: DEFAULT_CATEGORY },
      });
    } else {
      await tx.expense.updateMany({
        where: { userId, category: category.name },
        data: { category: DEFAULT_CATEGORY },
      });
    }

    const fallback = await tx.category.findFirst({
      where: { userId, type: category.type, name: DEFAULT_CATEGORY },
    });
    if (!fallback) {
      await tx.category.create({
        data: { userId, type: category.type, name: DEFAULT_CATEGORY },
      });
    }

    await tx.category.delete({ where: { id } });
  });

  revalidateForType(category.type);
  return { ok: true };
}
