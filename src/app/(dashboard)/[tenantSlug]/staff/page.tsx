import { Users } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function StaffPage() {
  return (
    <ComingSoon
      label="STAFF"
      title="Team & roles"
      tagline="Invite cashiers, waiters, kitchen & delivery staff — with per-role permissions."
      phase="Phase 4"
      icon={<Users className="h-5 w-5" />}
      features={[
        {
          title: "Invite by email or phone",
          body: "One click sends an invite. Staff set their own password; delivery boys use phone + PIN.",
        },
        {
          title: "Role-based access",
          body: "Owner, Manager, Cashier, Kitchen, Waiter, Delivery — each sees only what they need.",
        },
        {
          title: "Staff profile",
          body: "Photo, CNIC, phone, joining date, salary — in one place, per-tenant.",
        },
        {
          title: "Per-branch assignment",
          body: "Staff can be tied to specific branches so multi-outlet ops stay clean.",
        },
        {
          title: "Active / inactive toggle",
          body: "Suspend without deleting. Rehire keeps history intact.",
        },
        {
          title: "Audit trail",
          body: "Who voided what order, who took payment — per action, forever.",
        },
      ]}
    />
  );
}
