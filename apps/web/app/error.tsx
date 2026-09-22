"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { StateTemplate, Button } from "@/components/ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-canvas px-5 py-12">
      <StateTemplate
        variant="error"
        title={t("errors.loadFailed")}
        actions={<Button onClick={reset}>{t("common.retry")}</Button>}
        className="max-w-2xl border border-line bg-surface"
      />
    </main>
  );
}
