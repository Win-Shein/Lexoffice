"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { requireUserId } from "@/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import type { ActionResult } from "@/lib/types";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function changePassword(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t("password.tooShort") };
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return { ok: false, error: t("error.userNotFound") };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false, error: t("password.wrongCurrent") };
  }

  if (currentPassword === newPassword) {
    return { ok: false, error: t("password.sameAsCurrent") };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { ok: true };
}
