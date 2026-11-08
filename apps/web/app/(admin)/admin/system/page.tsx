/**
 * Admin · Rendszerállapot `/admin/system` — M151 (spec: modules/15_Admin_Panel/151_System_Status/README.md).
 * Terv: design/D15_Admin.pen#ihHfu (1440) · #oDiPb (390). Day felület, mint a többi admin oldal.
 * Az adat kliensoldalon jön és 30 mp-enként frissül (`/api/v1/admin/system-status`), így a lap gyorsan nyílik
 * akkor is, ha egy külső szolgáltatás lassan válaszol.
 */
import { SystemStatusView } from "@/components/admin/system-status/SystemStatusView";

export default function AdminSystemPage() {
  return (
    <div className="p-4 md:p-8">
      <SystemStatusView />
    </div>
  );
}
