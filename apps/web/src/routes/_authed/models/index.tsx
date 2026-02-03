import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Plus } from "lucide-react";
import { ModelsListSkeleton } from "@/components/skeletons/models-skeletons";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import type { ModelSummary } from "@/lib/models-types";
import { useModelsQuery, usePrefetchModel } from "@/lib/query-hooks";

export const Route = createFileRoute("/_authed/models/")({
  component: ModelsPage,
});

function ModelsPage() {
  const { data, isLoading } = useModelsQuery();
  const prefetchModel = usePrefetchModel();
  const models = (data || []) as unknown as ModelSummary[];

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="mb-12 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/50 px-3 py-1 font-medium text-muted-foreground text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Model Library
            </div>
            <h1 className="font-bold text-3xl tracking-tight">
              Attribute Models
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Reusable schemas for your extraction workflows. Track versions and
              keep an active version ready for each model.
            </p>
          </div>
          <Button asChild>
            <Link to="/models/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Model
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <ModelsListSkeleton />
        ) : models.length === 0 ? (
          <div className="rounded-lg bg-card/40 p-10 text-center shadow-sm ring-1 ring-border/40">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <div className="h-8 w-8 rounded-full bg-primary/20" />
            </div>
            <p className="font-medium text-lg">No models yet</p>
            <p className="mt-2 text-muted-foreground text-sm">
              Create your first schema to reuse across extractions.
            </p>
            <Button asChild className="mt-6">
              <Link to="/models/new">Create model</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-card/40 shadow-sm ring-1 ring-border/40">
            {models.map((model, index) => (
              <div
                key={model.id}
                className={`flex flex-col gap-4 px-6 py-5 transition-colors duration-200 hover:bg-muted/40 ${
                  index === models.length - 1 ? "" : "border-border/40 border-b"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      {model.name}
                    </h3>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {model.description ||
                        "No description provided for this model."}
                    </p>
                  </div>
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0"
                  >
                    <Link
                      to="/models/$modelId"
                      params={{ modelId: model.id }}
                      preload="intent"
                      onMouseEnter={() => prefetchModel(model.id)}
                      aria-label={`View ${model.name}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
                  <span className="rounded-full bg-muted/70 px-2.5 py-1 font-medium">
                    Active v{model.activeVersion?.versionNumber ?? "-"}
                  </span>
                  <span className="rounded-full bg-muted/70 px-2.5 py-1 font-medium">
                    Latest v{model.latestVersionNumber}
                  </span>
                  <span className="rounded-full bg-muted/70 px-2.5 py-1 font-medium">
                    {model.versionCount} versions
                  </span>
                  {model.updatedAt && (
                    <span className="rounded-full bg-muted/70 px-2.5 py-1 font-medium">
                      Updated {formatDate(model.updatedAt)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
