"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Button } from "@/components/ui";
import { restoreAccount } from "@/app/(app)/settings/account-actions";

export function RestoreAccountActions() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restore = async () => {
    setBusy(true);
    setError(null);
    const res = await restoreAccount();
    if (res.ok) {
      // Teljes újratöltés: a fiókállapot a proxyban dől el, a kliensoldali átmenet nem kéri le újra.
      window.location.replace("/dashboard");
      return;
    }
    setBusy(false);
    setError(res.error ?? t("account.restore.failed"));
  };

  return (
    <>
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex flex-col sm:flex-row-reverse gap-2.5 sm:gap-3">
        <Button icon="refresh-cw" loading={busy} onClick={restore}>
          {t("account.restore.confirm")}
        </Button>
        <form action="/api/v1/auth/signout" method="post" className="contents">
          <Button type="submit" variant="outline" disabled={busy}>
            {t("account.restore.signOut")}
          </Button>
        </form>
      </div>
    </>
  );
}
