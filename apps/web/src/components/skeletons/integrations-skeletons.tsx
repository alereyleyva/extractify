import { Skeleton } from "@/components/ui/skeleton";

const listItems = ["one", "two", "three"];

export function IntegrationsListSkeleton() {
  return (
    <div className="space-y-3">
      {listItems.map((item) => (
        <div
          key={`integration-skeleton-${item}`}
          className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/40 px-5 py-4"
        >
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
