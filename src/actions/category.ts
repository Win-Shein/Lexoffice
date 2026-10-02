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
  parentId: z.string().trim().min(1).nullish(),
});

export type CategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
};

function revalidateForType(type: CategoryType) {
  revalidatePath(type === CategoryType.ITEM ? "/items" : "/expenses");
}

async function resolveParent(
  userId: string,
  type: CategoryType,
  parentId: string | null,
  selfId?: string,
) {
  if (!parentId) return { ok: true as const, parentId: null };
  if (selfId && parentId === selfId) return { ok: false as const };

  const parent = await prisma.category.findFirst({
    where: { id: parentId, userId, type },
  });
  // Only one sub-level: a parent must itself be a top-level category.
  if (!parent || parent.parentId) return { ok: false as const };
  return { ok: true as const, parentId: parent.id };
}

export async function listCategories(type: CategoryType): Promise<CategoryOption[]> {
  const userId = await requireUserId();
  const parsed = typeSchema.safeParse(type);
  if (!parsed.success) return [];

  return prisma.category.findMany({
    where: { userId, type: parsed.data },
    orderBy: { name: "asc" },
    select: { id: true, name: true, parentId: true },
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
  const parentId = parsed.data.parentId || null;

  const existing = await prisma.category.findFirst({
    where: { userId, type: parsedType.data, name },
  });
  if (existing) return { ok: false, error: t("error.categoryExists") };

  const parent = await resolveParent(userId, parsedType.data, parentId);
  if (!parent.ok) return { ok: false, error: t("error.invalidParent") };

  const category = await prisma.category.create({
    data: { userId, type: parsedType.data, name, parentId: parent.parentId },
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
  const parentId = parsed.data.parentId || null;

  const category = await prisma.category.findFirst({
    where: { id, userId },
    include: { _count: { select: { children: true } } },
  });
  if (!category) return { ok: false, error: t("error.categoryNotFound") };

  const parent = await resolveParent(userId, category.type, parentId, id);
  if (!parent.ok) return { ok: false, error: t("error.invalidParent") };

  // A category that has subcategories must stay top-level (max. one level).
  if (category._count.children > 0 && parent.parentId) {
    return { ok: false, error: t("error.invalidParent") };
  }

  if (category.name !== name) {
    const duplicate = await prisma.category.findFirst({
      where: { userId, type: category.type, name, NOT: { id } },
    });
    if (duplicate) return { ok: false, error: t("error.categoryExists") };
  }

  const previousName = category.name;
  await prisma.$transaction(async (tx) => {
    await tx.category.update({
      where: { id },
      data: { name, parentId: parent.parentId },
    });
    if (previousName !== name) {
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
    }
  });

  revalidateForType(category.type);
  return { ok: true, id };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();

  const category = await prisma.category.findFirst({
    where: { id, userId },
    include: { children: { select: { id: true, name: true } } },
  });
  if (!category) return { ok: false, error: t("error.categoryNotFound") };
  if (category.name === DEFAULT_CATEGORY) {
    return { ok: false, error: t("error.categoryDefaultProtected") };
  }

  const affectedNames = [category.name, ...category.children.map((child) => child.name)];
  const childIds = category.children.map((child) => child.id);

  await prisma.$transaction(async (tx) => {
    if (category.type === CategoryType.ITEM) {
      await tx.item.updateMany({
        where: { userId, category: { in: affectedNames } },
        data: { category: DEFAULT_CATEGORY },
      });
    } else {
      await tx.expense.updateMany({
        where: { userId, category: { in: affectedNames } },
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

    if (childIds.length > 0) {
      await tx.category.deleteMany({ where: { id: { in: childIds } } });
    }
    await tx.category.delete({ where: { id } });
  });

  revalidateForType(category.type);
  return { ok: true };
}
