import { CircleDollarSign } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function PayrollPage() {
  return (
    <ComingSoon
      label="PAYROLL"
      title="Monthly salary & slips"
      tagline="Base + OT − advances − deductions = take-home. Auto-calculated from shifts."
      phase="Phase 4"
      icon={<CircleDollarSign className="h-5 w-5" />}
      features={[
        {
          title: "Auto salary calculation",
          body: "Pulls attended hours from Shifts, applies OT rate, subtracts advances — zero manual math.",
        },
        {
          title: "PDF salary slips",
          body: "One-click generate + download per employee, or bulk for the whole team.",
        },
        {
          title: "Advances tracking",
          body: "Staff asks for an advance; manager approves; auto-deducted from next payslip.",
        },
        {
          title: "Bonus & deduction",
          body: "Ad-hoc line items with a reason — Eid bonus, late-coming cut, damage cost.",
        },
        {
          title: "Payment log",
          body: "Cash in hand / bank transfer with reference number. Searchable by staff.",
        },
        {
          title: "WhatsApp salary slip",
          body: "Auto-send the slip to the employee's WhatsApp on payment day.",
        },
      ]}
    />
  );
}
