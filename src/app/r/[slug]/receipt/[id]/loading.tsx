import { Skeleton } from "@/components/ui/skeleton";

export default function ReceiptLoading() {
  return (
    <div className="bg-surface-muted">
      <div className="mx-auto max-w-md py-6">
        <div className="mb-4 flex items-center justify-end gap-2 px-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="mx-4 space-y-3 rounded-2xl bg-background p-5 font-mono shadow-sm">
          <div className="space-y-2 border-b border-dashed border-border pb-3 text-center">
            <Skeleton className="mx-auto h-12 w-12 rounded-md" />
            <Skeleton className="mx-auto h-4 w-40" />
            <Skeleton className="mx-auto h-3 w-32" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between border-b border-dashed border-border py-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    </div>
  );
}
