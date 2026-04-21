import { Skeleton } from "@/components/ui/skeleton";

export default function TrackLoading() {
  return (
    <div className="container max-w-md space-y-4 py-12">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="space-y-3 rounded-2xl border border-border bg-background p-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
