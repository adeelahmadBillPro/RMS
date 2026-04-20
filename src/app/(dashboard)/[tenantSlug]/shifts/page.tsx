import { CalendarClock } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function ShiftsPage() {
  return (
    <ComingSoon
      label="SHIFTS"
      title="Shift planner & attendance"
      tagline="Plan the week ahead. PIN-based clock-in. Overtime auto-calculates."
      phase="Phase 4"
      icon={<CalendarClock className="h-5 w-5" />}
      features={[
        {
          title: "Shift templates",
          body: "Morning 8–4, Evening 4–12 — define once, assign by drag-and-drop.",
        },
        {
          title: "PIN clock-in / clock-out",
          body: "Staff punch in via 6-digit PIN on the POS. No paper, no WhatsApp.",
        },
        {
          title: "Overtime auto-math",
          body: "Anything beyond scheduled hours counts as OT at a configurable rate.",
        },
        {
          title: "Leaves & holidays",
          body: "Approve leave requests in-app; they show on the shift calendar.",
        },
        {
          title: "Shift handover notes",
          body: "Outgoing staff leaves notes; incoming sees them on clock-in.",
        },
        {
          title: "Shift P&L",
          body: "Revenue per shift vs labour cost — know which shifts actually make money.",
        },
      ]}
    />
  );
}
