import { Skeleton } from "@/components/ui/skeleton";

export default function OrderTrackingLoading() {
  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="flex items-center justify-between gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2 rounded-2xl border border-border bg-background p-5">
        <Skeleton className="h-4 w-32" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
