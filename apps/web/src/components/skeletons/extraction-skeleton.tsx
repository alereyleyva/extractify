import { Skeleton } from "@/components/ui/skeleton";

export function ExtractionPageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-12 pt-20">
      <div className="container mx-auto w-full max-w-7xl px-6">
        <div className="mb-12 text-center">
          <div className="mb-10 flex items-center justify-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="mx-auto h-10 w-full max-w-3xl" />
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/40 p-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
