"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { banUser, unbanUser } from "../../actions";
import { BanUserModal, type BanDuration, type BanUserModalLabels } from "@/components/admin/BanUserModal";

interface UserDetailActionsProps {
  userId: string;
  userName: string;
  isBanned: boolean;
  labels: { ban: string; unban: string; banSuccess: string; unbanSuccess: string; modal: BanUserModalLabels };
}

/** Header actions of the admin user detail page (D15 `CMUG6` actions3): ban / unban. */
export function UserDetailActions({ userId, userName, isBanned, labels }: UserDetailActionsProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (action: () => Promise<{ success: boolean; error?: string }>, success: string) => {
    setLoading(true);
    const res = await action();
    setLoading(false);
    setMessage(res.success ? success : res.error ?? null);
    if (res.success) {
      setModalOpen(false);
      router.refresh();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {message && <span role="status" className="text-xs text-slate-500">{message}</span>}
      {isBanned ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => run(() => unbanUser(userId), labels.unbanSuccess)}
          className="px-3.5 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {labels.unban}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          {labels.ban}
        </button>
      )}
      {modalOpen && (
        <BanUserModal
          userName={userName}
          loading={loading}
          labels={labels.modal}
          onCancel={() => setModalOpen(false)}
          onConfirm={(reason: string, duration: BanDuration) => run(() => banUser(userId, reason, duration), labels.banSuccess)}
        />
      )}
    </div>
  );
}
