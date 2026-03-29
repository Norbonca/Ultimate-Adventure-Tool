"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { redirect } from "next/navigation";

export async function adminLogin(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    return { error: "ADMIN_EMAIL nincs beállítva a szerveren." };
  }

  if (email !== adminEmail.toLowerCase()) {
    return { error: "Ezzel az email-lel nincs admin hozzáférés." };
  }

  if (!email || !password) {
    return { error: "Add meg az email-t és a jelszót." };
  }

  const supabase = await createClient();

  // Bejelentkezési kísérlet
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInError) {
    redirect("/admin");
  }

  // Ha a fiók még nem létezik → automatikus létrehozás service role-lal
  if (
    signInError.message.includes("Invalid login credentials") ||
    signInError.message.includes("invalid_credentials")
  ) {
    const adminClient = createAdminClient();

    // Próbálunk fiókot létrehozni
    const { error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // email megerősítés kihagyása lokálban
    });

    if (createError && !createError.message.includes("already registered")) {
      return { error: `Fiók létrehozása sikertelen: ${createError.message}` };
    }

    // Bejelentkezés az új fiókkal
    const { error: retryError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (retryError) {
      return { error: retryError.message };
    }

    redirect("/admin");
  }

  return { error: signInError.message };
}
