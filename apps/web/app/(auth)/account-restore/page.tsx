// Design: D01 `RbzSn` C „Belépés türelmi időben: visszaállítás” (US-M01-017).
// The proxy sends a signed-in user with a pending deletion here before any protected page.
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/Icon";
import { RestoreAccountActions } from "./restore-actions";

export default async function AccountRestorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("account_deletion_status").maybeSingle();
  const status = data as { pending_deletion: boolean; deletion_scheduled_for: string | null } | null;
  if (!status?.pending_deletion || !status.deletion_scheduled_for) redirect("/dashboard");

  const { t, locale } = await getServerT();
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "hu-HU", { dateStyle: "long" }).format(
    new Date(status.deletion_scheduled_for)
  );

  return (
    <main className="min-h-screen bg-slate-50 flex items-end sm:items-center justify-center sm:p-6">
      <section
        aria-labelledby="restore-title"
        className="w-full sm:max-w-[520px] bg-white rounded-t-[20px] sm:rounded-2xl shadow-2xl px-5 pt-6 pb-7 sm:p-8"
      >
        <div className="flex gap-3.5">
          <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-trevu-50 text-trevu-700">
            <Icon name="refresh-cw" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 id="restore-title" className="text-[22px] leading-tight font-semibold text-navy-900">
              {t("account.restore.title")}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{t("account.restore.body", { date })}</p>
          </div>
        </div>
        <p className="mt-5 text-[13px] leading-relaxed text-navy-600">{t("account.restore.note")}</p>
        <RestoreAccountActions />
      </section>
    </main>
  );
}
