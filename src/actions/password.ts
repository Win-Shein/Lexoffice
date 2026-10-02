"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import type { ActionResult } from "@/lib/types";

const accountSchema = z.object({
  email: z.email(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

/**
 * Updates the account email and (optionally) the password. The new password
 * may be left blank to keep the current one; when it is provided the current
 * password must match.
 */
export async function updateAccount(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t("error.invalidInput") };
  }

  const email = parsed.data.email.toLowerCase();
  const currentPassword = parsed.data.currentPassword ?? "";
  const newPassword = (parsed.data.newPassword ?? "").trim();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: t("error.userNotFound") };

  const data: { email?: string; passwordHash?: string } = {};

  if (email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      return { ok: false, error: t("register.emailTaken") };
    }
    data.email = email;
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      return { ok: false, error: t("password.tooShort") };
    }
    if (!user.passwordHash) {
      return { ok: false, error: t("error.userNotFound") };
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return { ok: false, error: t("password.wrongCurrent") };
    }
    if (currentPassword === newPassword) {
      return { ok: false, error: t("password.sameAsCurrent") };
    }
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (!data.email && !data.passwordHash) {
    return { ok: true };
  }

  await prisma.user.update({ where: { id: userId }, data });
  revalidatePath("/settings");
  return { ok: true };
}
