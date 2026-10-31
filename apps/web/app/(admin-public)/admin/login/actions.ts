"use server";

import { createClient } from "@/lib/supabase/server";
import { getPlatformAdmin } from "@/lib/admin-auth";
import { getServerT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

export async function adminLogin(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const { t } = await getServerT();
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  if (!email || !password) return { error: t("admin.login.requiredFields") };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: t("admin.login.failed") };

  // Authentication alone does not authorize admin access. Never provision accounts here.
  if (!(await getPlatformAdmin())) {
    await supabase.auth.signOut();
    return { error: t("admin.login.failed") };
  }
  redirect("/admin");
}
