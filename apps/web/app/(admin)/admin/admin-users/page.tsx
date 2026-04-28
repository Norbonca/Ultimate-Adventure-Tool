import { getServerT } from "@/lib/i18n/server";
import { getAdminRoles } from "./actions";
import { AdminUsersClient } from "./admin-users-client";

export default async function AdminUsersPage() {
  const { t } = await getServerT();
  const { admins, currentUserId } = await getAdminRoles();

  return (
    <div className="p-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t("admin.adminUsers.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("admin.adminUsers.subtitle")}
          </p>
        </div>

        <AdminUsersClient
          admins={admins}
          currentUserId={currentUserId}
          t_colUser={t("admin.adminUsers.colUser")}
          t_colRole={t("admin.adminUsers.colRole")}
          t_colStatus={t("admin.adminUsers.colStatus")}
          t_colActions={t("admin.adminUsers.colActions")}
          t_addAdmin={t("admin.adminUsers.addAdmin")}
          t_revokeAdmin={t("admin.adminUsers.revokeAdmin")}
          t_revokeConfirm={t("admin.adminUsers.revokeConfirm")}
          t_addTitle={t("admin.adminUsers.addTitle")}
          t_emailLabel={t("admin.adminUsers.emailLabel")}
          t_emailPlaceholder={t("admin.adminUsers.emailPlaceholder")}
          t_roleLabel={t("admin.adminUsers.roleLabel")}
          t_notesLabel={t("admin.adminUsers.notesLabel")}
          t_notesPlaceholder={t("admin.adminUsers.notesPlaceholder")}
          t_addConfirm={t("admin.adminUsers.addConfirm")}
          t_roleSuper={t("admin.adminUsers.roleSuper")}
          t_roleOperations={t("admin.adminUsers.roleOperations")}
          t_roleContent={t("admin.adminUsers.roleContent")}
          t_roleSupport={t("admin.adminUsers.roleSupport")}
          t_roleFinance={t("admin.adminUsers.roleFinance")}
          t_statusActive={t("admin.adminUsers.statusActive")}
          t_statusRevoked={t("admin.adminUsers.statusRevoked")}
          t_userNotFound={t("admin.adminUsers.userNotFound")}
          t_addSuccess={t("admin.adminUsers.addSuccess")}
          t_revokeSuccess={t("admin.adminUsers.revokeSuccess")}
          t_alreadyAdmin={t("admin.adminUsers.alreadyAdmin")}
          t_noAdmins={t("admin.adminUsers.noAdmins")}
          t_saveRole={t("admin.adminUsers.saveRole")}
          t_editRole={t("admin.adminUsers.editRole")}
          t_lastAdminError={t("admin.adminUsers.lastAdminError")}
          t_cancel={t("common.cancel")}
          t_createNewUserToggle={t("admin.adminUsers.createNewUserToggle")}
          t_displayNameLabel={t("admin.adminUsers.displayNameLabel")}
          t_displayNamePlaceholder={t("admin.adminUsers.displayNamePlaceholder")}
          t_passwordLabel={t("admin.adminUsers.passwordLabel")}
          t_passwordPlaceholder={t("admin.adminUsers.passwordPlaceholder")}
          t_passwordHint={t("admin.adminUsers.passwordHint")}
          t_userAlreadyExists={t("admin.adminUsers.userAlreadyExists")}
          t_passwordTooShort={t("admin.adminUsers.passwordTooShort")}
          t_createUserFailed={t("admin.adminUsers.createUserFailed")}
        />
      </div>
    </div>
  );
}
