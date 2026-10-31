import { getPlatformAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "./login-form";

export default async function AdminLoginPage() {
  if (await getPlatformAdmin()) redirect("/admin");
  return <AdminLoginForm />;
}
