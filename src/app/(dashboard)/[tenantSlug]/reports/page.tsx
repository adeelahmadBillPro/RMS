import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function ReportsPage() {
  return (
    <ComingSoon
      label="REPORTS"
      title="Analytics & reports"
      tagline="Today's sales, top items, food cost %, channel mix — charts you can act on."
      phase="Phase 4"
      icon={<BarChart3 className="h-5 w-5" />}
      features={[
        {
          title: "Revenue trend",
          body: "Line chart by day / week / month. Compare this week vs last week.",
        },
        {
          title: "Top items + slow movers",
          body: "What's flying off the pass. What's sitting in the fridge too long.",
        },
        {
          title: "Food cost %",
          body: "Ingredient cost vs revenue — the one number that tells you if you're making money.",
        },
        {
          title: "Channel mix",
          body: "Dine-in vs delivery vs WhatsApp vs online — which channel really pays.",
        },
        {
          title: "Hourly heat-map",
          body: "When you're slammed, when you're dead. Schedule staff accordingly.",
        },
        {
          title: "Per-rider scorecard",
          body: "Avg delivery time, count, cash discrepancies — fair and transparent.",
        },
        {
          title: "Export CSV / PDF",
          body: "For your accountant, investor updates, or your own records.",
        },
      ]}
    />
  );
}
