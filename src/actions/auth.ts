"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { getTranslator } from "@/lib/i18n/server";

export type LoginState = { error?: string } | undefined;

export async function authenticate(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const { t } = await getTranslator();
      return { error: t("login.error") };
    }
    throw error;
  }
  return undefined;
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
