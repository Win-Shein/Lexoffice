"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/auth";
import { restoreBackup } from "@/lib/backup";
import { getTranslator } from "@/lib/i18n/server";

export type RestoreActionResult =
  | { ok: true; customers: number; invoices: number; expenses: number }
  | { ok: false; error: string };

export async function restoreBackupAction(json: string): Promise<RestoreActionResult> {
  const userId = await requireUserId();
  const { t } = await getTranslator();

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return { ok: false, error: t("backup.invalid") };
  }

  const result = await restoreBackup(userId, payload);
  if (!result.ok) {
    return {
      ok: false,
      error: result.reason === "invalid" ? t("backup.invalid") : t("backup.restoreFailed"),
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath("/customers");
  revalidatePath("/expenses");
  revalidatePath("/settings");

  return {
    ok: true,
    customers: result.customers,
    invoices: result.invoices,
    expenses: result.expenses,
  };
}
