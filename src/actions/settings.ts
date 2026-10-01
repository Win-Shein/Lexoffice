"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import type { ActionResult } from "@/lib/types";

const settingsSchema = z.object({
  name: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  vatId: z.string().trim().optional(),
  iban: z.string().trim().optional(),
  bic: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  isSmallBiz: z.boolean().default(false),
});

export async function updateSettings(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t("error.invalidInput") };
  }
  const data = parsed.data;

  if (!data.taxNumber && !data.vatId) {
    return { ok: false, error: t("error.taxIdRequired") };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name || null,
      companyName: data.companyName || null,
      address: data.address || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      country: data.country || "Deutschland",
      phone: data.phone || null,
      taxNumber: data.taxNumber || null,
      vatId: data.vatId || null,
      iban: data.iban || null,
      bic: data.bic || null,
      bankName: data.bankName || null,
      isSmallBiz: data.isSmallBiz,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
