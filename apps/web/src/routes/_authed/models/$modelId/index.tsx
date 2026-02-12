import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Pencil, Plus } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { RouteError } from "@/components/route-error";
import { ModelDetailSkeleton } from "@/components/skeletons/models-skeletons";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { getErrorMessage } from "@/lib/error-handling";
import type { ModelDetail } from "@/lib/models-types";
import {
  useModelQuery,
  useSetActiveModelVersionMutation,
} from "@/lib/query-hooks";
export const Route = createFileRoute("/_authed/models/$modelId/")({
  component: ModelDetailPage,
  errorComponent: ({ error }) => (
    <RouteError
      error={error}
      title="Unable to load model"
      actionHref="/models"
      actionLabel="Back to models"
    />
  ),
});

function ModelDetailPage() {
  const { modelId } = Route.useParams();
  const { data, isLoading, isError, error } = useModelQuery(modelId);
  const model = data as ModelDetail | undefined;
  const setActiveMutation = useSetActiveModelVersionMutation();

  const sortedVersions = useMemo(() => {
    if (!model?.versions) {
      return [];
    }
    return [...model.versions].sort(
      (a, b) => b.versionNumber - a.versionNumber,
    );
  }, [model]);

  const handleSetActive = async (versionId: string) => {
    try {
      await setActiveMutation.mutateAsync({ versionId, modelId });
      toast.success("Active version updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return <ModelDetailSkeleton />;
  }

  if (isError || !model) {
    return (
      <RouteError
        error={error instanceof Error ? error : new Error("Unable to load")}
        title="Unable to load model"
        actionHref="/models"
        actionLabel="Back to models"
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <Button asChild size="sm" variant="ghost">
              <Link to="/models">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="font-bold text-3xl tracking-tight">
                {model.name}
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">
                {model.description || "No description added yet."}
              </p>
            </div>
          </div>
          <Button asChild variant="ghost" className="h-9 px-3">
            <Link to="/models/$modelId/edit" params={{ modelId: model.id }}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit model
            </Link>
          </Button>
        </div>

        <div className="rounded-lg bg-card/40 p-6 shadow-sm ring-1 ring-border/40">
          <div className="mb-6 rounded-lg bg-background/60 p-4 ring-1 ring-border/40">
            <h2 className="font-semibold text-base">System Prompt</h2>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground text-sm">
              {model.systemPrompt?.trim() ||
                "No system prompt configured. Extractions will use the default extraction instructions only."}
            </p>
          </div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-xl">Versions</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Review version history and manage the active schema.
              </p>
            </div>
            <Button asChild>
              <Link
                to="/models/$modelId/versions/new"
                params={{ modelId: model.id }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New version
              </Link>
            </Button>
          </div>

          {sortedVersions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No versions yet.</p>
          ) : (
            <div className="divide-y divide-border/40 rounded-lg bg-background/60">
              {sortedVersions.map((version) => (
                <div
                  key={version.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors duration-200 hover:bg-muted/30"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">
                        v{version.versionNumber}
                      </span>
                      {version.isActive && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                          Active
                        </span>
                      )}
                      {version.createdAt && (
                        <span className="text-muted-foreground text-xs">
                          {formatDate(version.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-muted-foreground text-sm">
                      {version.changelog ||
                        "No changelog provided for this version."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!version.isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSetActive(version.id)}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Set active
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        to="/models/$modelId/versions/$versionId"
                        params={{
                          modelId: model.id,
                          versionId: version.id,
                        }}
                      >
                        View details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
