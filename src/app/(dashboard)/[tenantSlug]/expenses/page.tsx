import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function ExpensesPage() {
  return (
    <ComingSoon
      label="EXPENSES"
      title="Daily expense log"
      tagline="Track every rupee out — rent, utilities, ingredient purchases, misc."
      phase="Phase 4"
      icon={<Wallet className="h-5 w-5" />}
      features={[
        {
          title: "Categorised expenses",
          body: "Rent, utilities, maintenance, ingredients, staff advances — with custom categories per tenant.",
        },
        {
          title: "Recurring expenses",
          body: "Set rent / electricity as monthly recurring so they auto-log on the 1st each month.",
        },
        {
          title: "Receipt photo upload",
          body: "Attach the actual bill. Searchable by supplier and bill number later.",
        },
        {
          title: "Revenue vs expense",
          body: "Dashboard stat shows today's and this month's profit in real time (revenue minus expenses).",
        },
        {
          title: "Export CSV / PDF",
          body: "For your accountant, or to feed into your own spreadsheets.",
        },
        {
          title: "Per-branch P&L",
          body: "Compare branches side-by-side; spot the underperformer before it hurts.",
        },
      ]}
    />
  );
}
