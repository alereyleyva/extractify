import { Skeleton } from "@/components/ui/skeleton";

const listItems = ["one", "two", "three", "four"];

export function ModelsListSkeleton() {
  return (
    <div className="space-y-4">
      {listItems.map((item) => (
        <div
          key={`model-skeleton-${item}`}
          className="flex flex-col gap-4 rounded-lg border border-border/40 bg-card/40 px-6 py-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ModelDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-8 w-28" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="rounded-lg bg-card/40 p-6 shadow-sm ring-1 ring-border/40">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModelEditSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-4xl px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="rounded-lg bg-card/40 p-6 shadow-sm ring-1 ring-border/40">
          <Skeleton className="h-6 w-40" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VersionEditorSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="rounded-lg bg-card/40 p-6 shadow-sm ring-1 ring-border/40">
          <Skeleton className="h-6 w-48" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
