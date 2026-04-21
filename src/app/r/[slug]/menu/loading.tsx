import { Skeleton } from "@/components/ui/skeleton";

export default function MenuLoading() {
  return (
    <>
      <section className="container pt-4">
        <Skeleton className="h-[140px] w-full rounded-3xl md:h-[160px]" />
      </section>
      <nav className="sticky top-16 z-10 mt-4 border-b border-border bg-background/95">
        <div className="container flex gap-2 overflow-x-auto py-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-20 flex-shrink-0 rounded-full" />
          ))}
        </div>
      </nav>
      <div className="container grid grid-cols-2 gap-3 py-6 pb-28 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="mt-3 h-9 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
