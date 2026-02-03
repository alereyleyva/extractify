import { Skeleton } from "@/components/ui/skeleton";

const listItems = ["one", "two", "three", "four"];

export function HistoryListSkeleton() {
  return (
    <div className="space-y-4">
      {listItems.map((item) => (
        <div
          key={`history-skeleton-${item}`}
          className="flex flex-col gap-4 rounded-lg border border-border/40 bg-card/40 px-6 py-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-60" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HistoryDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-5xl px-6 xl:max-w-6xl">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="rounded-lg border border-border/40 bg-card/40 p-6">
              <Skeleton className="h-5 w-40" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/40 p-6">
              <Skeleton className="h-5 w-32" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-lg border border-border/40 bg-card/40 p-6">
              <Skeleton className="h-5 w-28" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/40 p-6">
              <Skeleton className="h-5 w-28" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
