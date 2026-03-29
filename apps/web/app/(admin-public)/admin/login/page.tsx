import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "./login-form";

export default async function AdminLoginPage() {
  // Ha már be van jelentkezve admin-ként → átirányítás
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()) {
      redirect("/admin");
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "";

  return <AdminLoginForm adminEmail={adminEmail} />;
}
