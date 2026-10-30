"use client";

/**
 * RemoveMemberModal — résztvevő eltávolítása a csapatból (spec §11.5.3).
 * Design: D02 „Résztvevő eltávolítása" modal (`o4u2N6`): `action.remove_member` ikon (user-minus),
 * cím „Eltávolítod {name}-t a csapatból?", a következmény kimondva (a vendéghely azonnal felszabadul,
 * a jelentkezés „eltávolítva" státuszba kerül, újra jelentkezhet, értesítést kap — M07),
 * opcionális üzenet (max 1000), „Mégse" + destruktív „Eltávolítás". A `Dialog` primitívre épül
 * (asztalon 520 px kártya, telefonon alsó lap).
 */

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Button, Dialog } from "@/components/ui";

const MESSAGE_MAX = 1000;

interface RemoveMemberModalProps {
  name: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (message?: string) => void;
}

export function RemoveMemberModal({ name, busy, onCancel, onConfirm }: RemoveMemberModalProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");

  return (
    <Dialog
      open
      onClose={onCancel}
      busy={busy}
      icon="user-minus"
      tone="danger"
      title={t("trips.crew.removeTitle", { name })}
      description={t("trips.crew.removeBody", { name })}
      actions={
        <>
          <Button
            variant="danger"
            icon="user-minus"
            loading={busy}
            onClick={() => onConfirm(message.trim() || undefined)}
          >
            {t("trips.crew.removeConfirm")}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </Button>
        </>
      }
    >
      <div>
        <label htmlFor="remove-member-message" className="block text-sm font-semibold text-navy-900 mb-1.5">
          {t("trips.crew.removeMessageLabel", { name })}
        </label>
        <textarea
          id="remove-member-message"
          value={message}
          maxLength={MESSAGE_MAX}
          rows={3}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("trips.crew.removeMessagePlaceholder")}
          className="input-trevu w-full px-3.5 py-3 text-sm resize-none"
        />
      </div>
    </Dialog>
  );
}
