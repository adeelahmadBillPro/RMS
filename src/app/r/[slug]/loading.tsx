import { Skeleton } from "@/components/ui/skeleton";

export default function LandingLoading() {
  return (
    <div className="space-y-6 pb-10">
      <section className="container pt-4">
        <Skeleton className="h-[260px] w-full rounded-3xl md:h-[340px]" />
      </section>
      <section className="container">
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </section>
      <section className="container">
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[260px] w-[200px] flex-shrink-0 rounded-2xl sm:w-[220px]" />
          ))}
        </div>
      </section>
      <section className="container">
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[180px] w-[140px] flex-shrink-0 rounded-2xl sm:w-[160px]" />
          ))}
        </div>
      </section>
    </div>
  );
}
