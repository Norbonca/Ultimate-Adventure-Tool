"use client";

/**
 * M024 BR-M024-006 — „Új időpont hozzáadása” (design/D02_Trip_Management.pen#vcfZO, `w0MI8K`).
 * Asztalin modal, telefonon alsó lap (a Dialog primitív így viselkedik). Az új időpont a túra másolata,
 * PISZKOZATKÉNT jön létre ugyanabban a sorozatban; a sikerüzenet az új időpontra visz.
 * Hibamegelőzés: a befejezés alapból a kezdés + a túra hossza; a mezők azonnal ellenőrzöttek.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { addSeriesDate } from "@/app/(app)/trips/series-actions";

interface AddSeriesDateDialogProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  title: string;
  currency: string;
  defaultMaxParticipants: number;
  defaultPrice: number | null;
  /** A túra hossza napokban (a befejezés javaslatához). */
  durationDays: number | null;
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export function AddSeriesDateDialog({
  open,
  onClose,
  tripId,
  title,
  currency,
  defaultMaxParticipants,
  defaultPrice,
  durationDays,
}: AddSeriesDateDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTouched, setEndTouched] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(String(defaultMaxParticipants));
  const [price, setPrice] = useState(defaultPrice != null ? String(defaultPrice) : "");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [created, setCreated] = useState<{ slug: string } | null>(null);

  const changeStart = (value: string) => {
    setStartDate(value);
    if (!endTouched && value && durationDays && durationDays > 0) setEndDate(addDays(value, durationDays - 1));
  };

  const datesInvalid = !!startDate && !!endDate && endDate < startDate;
  const deadlineInvalid = !!deadline && !!startDate && deadline > startDate;
  const capacity = Number(maxParticipants);
  const capacityInvalid = maxParticipants !== "" && (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000);
  const canSubmit = !!startDate && !!endDate && !datesInvalid && !deadlineInvalid && !capacityInvalid && maxParticipants !== "";

  const close = () => {
    if (isPending) return;
    setCreated(null);
    setError(null);
    onClose();
  };

  const submit = () => {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const res = await addSeriesDate({
        tripId,
        startDate,
        endDate,
        maxParticipants: capacity,
        priceAmount: price === "" ? null : Number(price),
        registrationDeadline: deadline || null,
      });
      if (!res.ok) {
        setError({ message: res.error, field: res.field });
        return;
      }
      setCreated({ slug: res.data.slug });
      router.refresh();
    });
  };

  if (created) {
    return (
      <Dialog
        open={open}
        onClose={close}
        icon="check"
        tone="primary"
        title={t("series.created")}
        actions={
          <>
            <Button variant="primary" href={`/trips/${created.slug}/edit`} icon="calendar-days">
              {t("series.openCreated")}
            </Button>
            <Button variant="outline" onClick={close}>
              {t("common.close")}
            </Button>
          </>
        }
      />
    );
  }

  const fieldError = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <Dialog
      open={open}
      onClose={close}
      busy={isPending}
      icon="calendar-plus"
      tone="primary"
      title={t("series.addDateTitle")}
      description={t("series.addDateSubtitle", { title })}
      actions={
        <>
          <Button variant="primary" loading={isPending} disabled={!canSubmit} onClick={submit} data-testid="series-create-draft">
            {t("series.createDraft")}
          </Button>
          <Button variant="outline" onClick={close} disabled={isPending}>
            {t("common.cancel")}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input id="series-start" type="date" label={t("series.startDate")} value={startDate} required onChange={(e) => changeStart(e.target.value)} />
        <Input
          id="series-end"
          type="date"
          label={t("series.endDate")}
          value={endDate}
          min={startDate || undefined}
          required
          onChange={(e) => {
            setEndTouched(true);
            setEndDate(e.target.value);
          }}
          error={datesInvalid ? t("series.errors.invalidDates") : fieldError("endDate")}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          id="series-capacity"
          type="number"
          inputMode="numeric"
          min={1}
          max={1000}
          label={t("series.capacity")}
          value={maxParticipants}
          required
          onChange={(e) => setMaxParticipants(e.target.value)}
          error={capacityInvalid ? t("series.errors.invalidCapacity") : fieldError("maxParticipants")}
        />
        <Input
          id="series-price"
          type="number"
          inputMode="decimal"
          min={0}
          label={t("series.price", { currency })}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          hint={t("series.optionalHint")}
        />
        <Input
          id="series-deadline"
          type="date"
          label={t("series.deadline")}
          value={deadline}
          max={startDate || undefined}
          onChange={(e) => setDeadline(e.target.value)}
          hint={t("series.optionalHint")}
          error={deadlineInvalid ? t("series.errors.invalidDeadline") : fieldError("registrationDeadline")}
        />
      </div>
      <div className="rounded-xl bg-navy-50 p-4" data-testid="series-copy-box">
        <p className="text-sm font-bold text-navy-900">{t("series.copyTitle")}</p>
        <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
          <ul className="space-y-1.5">
            {(["series.copyYes1", "series.copyYes2", "series.copyYes3"] as const).map((key) => (
              <li key={key} className="flex items-center gap-2 text-sm text-navy-700">
                <Icon name="check" size={16} className="shrink-0 text-trevu-700" />
                {t(key)}
              </li>
            ))}
          </ul>
          <ul className="space-y-1.5">
            {(["series.copyNo1", "series.copyNo2", "series.copyNo3"] as const).map((key) => (
              <li key={key} className="flex items-center gap-2 text-sm text-navy-500">
                <Icon name="x" size={16} className="shrink-0 text-navy-400" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {error && !error.field && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error.message}
        </p>
      )}
    </Dialog>
  );
}
