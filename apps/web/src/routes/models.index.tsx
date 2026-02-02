import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import { fetchModels } from "@/lib/models-queries";
import type { ModelSummary } from "@/lib/models-types";
import { requireUser } from "@/lib/route-guards";

export const Route = createFileRoute("/models/")({
  component: ModelsPage,
  loader: async () => {
    return fetchModels();
  },
  beforeLoad: async () => {
    const user = await requireUser();
    return { user };
  },
});

function ModelsPage() {
  const models = (Route.useLoaderData() || []) as ModelSummary[];

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 font-medium text-muted-foreground text-xs">
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

        {models.length === 0 ? (
          <Card className="border">
            <CardContent className="py-16 text-center">
              <p className="font-medium">No models yet</p>
              <p className="mt-2 text-muted-foreground text-sm">
                Create your first schema to reuse across extractions.
              </p>
              <Button asChild className="mt-6">
                <Link to="/models/new">Create model</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {models.map((model) => (
              <Card key={model.id} className="border">
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{model.name}</h3>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {model.description ||
                          "No description provided for this model."}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to="/models/$modelId"
                        params={{ modelId: model.id }}
                      >
                        View
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3 text-muted-foreground text-xs">
                    <span className="rounded-full border border-border/60 px-2.5 py-1">
                      Active v{model.activeVersion?.versionNumber ?? "-"}
                    </span>
                    <span className="rounded-full border border-border/60 px-2.5 py-1">
                      Latest v{model.latestVersionNumber}
                    </span>
                    <span className="rounded-full border border-border/60 px-2.5 py-1">
                      {model.versionCount} versions
                    </span>
                    {model.updatedAt && (
                      <span className="rounded-full border border-border/60 px-2.5 py-1">
                        Updated {formatDate(model.updatedAt)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
