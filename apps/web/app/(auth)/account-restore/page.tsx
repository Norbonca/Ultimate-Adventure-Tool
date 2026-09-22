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
    <main className="flex min-h-[100dvh] items-end justify-center bg-canvas sm:items-center sm:p-6">
      <section
        aria-labelledby="restore-title"
        className="w-full border border-line border-t-4 border-t-accent bg-surface px-5 pb-7 pt-6 sm:max-w-[520px] sm:p-8"
      >
        <div className="flex gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-accent text-accent-on">
            <Icon name="refresh-cw" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 id="restore-title" className="font-display text-[28px] font-semibold leading-tight text-ink">
              {t("account.restore.title")}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-body">{t("account.restore.body", { date })}</p>
          </div>
        </div>
        <p className="mt-5 text-[13px] leading-relaxed text-ink-muted">{t("account.restore.note")}</p>
        <RestoreAccountActions />
      </section>
    </main>
  );
}
