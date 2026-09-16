"use client";

// Design: D01 `npAu4` deleteRow → `RbzSn` A (confirm) / B (blocked) + `kHbUE` (mobile). US-M01-017, UC-M01-003.

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Button, Dialog } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { requestAccountDeletion, type BlockingTrip } from "@/app/(app)/settings/account-actions";

const STATUS_KEY = {
  published: "trips.status.published",
  registration_open: "trips.status.registrationOpen",
  active: "trips.status.active",
} as const;

export function DeleteAccountButton() {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [blocking, setBlocking] = useState<BlockingTrip[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [restoreBy, setRestoreBy] = useState("");

  const openDialog = () => {
    setRestoreBy(
      new Intl.DateTimeFormat(locale === "en" ? "en-US" : "hu-HU", { dateStyle: "long" }).format(
        new Date(Date.now() + 30 * 86_400_000)
      )
    );
    setOpen(true);
  };

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword("");
    setBlocking(null);
    setError(null);
  };

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    const res = await requestAccountDeletion(password);
    setBusy(false);
    if (res.status === "blocked") setBlocking(res.trips);
    else if (res.status === "error") setError(res.error);
    // Teljes újratöltés: a munkamenet a szerveren már megszűnt.
    else window.location.replace("/login?account=deletion-scheduled");
  };

  const consequences: [string, string][] = [
    ["lock", t("settings.privacy.deleteConsequenceHidden")],
    ["calendar", t("settings.privacy.deleteConsequenceApplications")],
    ["hourglass", t("settings.privacy.deleteConsequenceRestore", { date: restoreBy })],
    ["shield-check", t("settings.privacy.deleteConsequenceAnonymize")],
  ];

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
      >
        <Icon name="trash-2" size={16} />
        {t("settings.privacy.deleteBtn")}
      </button>

      {open && blocking && (
        <Dialog
          open
          onClose={close}
          icon="alert-triangle"
          tone="warning"
          title={t("settings.privacy.deleteBlockedTitle")}
          description={t("settings.privacy.deleteBlockedBody")}
          actions={
            <>
              <Button href="/trips" icon="arrow-right">{t("settings.privacy.deleteBlockedOpenTrips")}</Button>
              <Button variant="outline" onClick={close}>{t("common.close")}</Button>
            </>
          }
        >
          <ul className="divide-y divide-navy-100 border-y border-navy-100">
            {blocking.map((trip) => (
              <li key={trip.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">{trip.title}</p>
                  <p className="text-xs text-navy-500 mt-0.5">
                    {t("settings.privacy.deleteBlockedTripMeta", {
                      status: t(STATUS_KEY[trip.status as keyof typeof STATUS_KEY] ?? "trips.status.published"),
                      participants: trip.current_participants,
                    })}
                  </p>
                </div>
                <Link href={`/trips/${trip.slug}/edit`} className="text-[13px] font-semibold text-trevu-700 hover:underline shrink-0">
                  {t("settings.privacy.deleteBlockedEdit")}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-navy-500">{t("settings.privacy.deleteBlockedNote")}</p>
        </Dialog>
      )}

      {open && !blocking && (
        <Dialog
          open
          onClose={close}
          busy={busy}
          icon="user-minus"
          tone="danger"
          title={t("settings.privacy.deleteModalTitle")}
          description={t("settings.privacy.deleteModalBody")}
          actions={
            <>
              <Button variant="danger" icon="user-minus" loading={busy} onClick={() => submit()}>
                {t("settings.privacy.deleteConfirm")}
              </Button>
              <Button variant="outline" onClick={close} disabled={busy}>{t("common.cancel")}</Button>
            </>
          }
        >
          <ul className="space-y-2.5 rounded-xl bg-slate-50 px-4 py-3.5">
            {consequences.map(([icon, text]) => (
              <li key={icon} className="flex gap-2.5 text-[13px] leading-relaxed text-navy-700">
                <Icon name={icon} size={16} className="mt-0.5 shrink-0 text-navy-400" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={submit}>
            <label htmlFor="delete-password" className="block text-sm font-semibold text-navy-900 mb-1.5">
              {t("settings.privacy.deletePasswordLabel")} <span className="text-coral">*</span>
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-trevu w-full min-h-[48px] px-4 text-[15px]"
            />
            <p className="text-xs text-navy-500 mt-1.5">{t("settings.privacy.deletePasswordHint")}</p>
          </form>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </Dialog>
      )}
    </>
  );
}
