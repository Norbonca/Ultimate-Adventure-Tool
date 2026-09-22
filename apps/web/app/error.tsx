"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { StateTemplate, Button } from "@/components/ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useTranslation();
  return <StateTemplate variant="error" title={t("errors.loadFailed")}
    actions={<Button onClick={reset}>{t("common.retry")}</Button>} />;
}
