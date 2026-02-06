import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, FileText, History } from "lucide-react";
import { useEffect, useState } from "react";
import { ExtractionResults } from "@/components/ExtractionResults";
import { RouteError } from "@/components/route-error";
import { HistoryDetailSkeleton } from "@/components/skeletons/history-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import type { ExtractionDetail } from "@/lib/extractions-types";
import { LLM_MODELS, type LlmModelId } from "@/lib/llm-models";
import { useExtractionQuery } from "@/lib/query-hooks";

export const Route = createFileRoute("/_authed/history/$extractionId")({
  component: HistoryDetailPage,
  errorComponent: ({ error }) => (
    <RouteError
      error={error}
      title="Unable to load extraction"
      actionHref="/history"
      actionLabel="Back to history"
    />
  ),
});

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) {
    return "-";
  }
  if (size >= 1_000_000) {
    return `${(size / 1_000_000).toFixed(2)} MB`;
  }
  if (size >= 1_000) {
    return `${(size / 1_000).toFixed(1)} KB`;
  }
  return `${size} B`;
}

function getStatusStyles(status: ExtractionDetail["status"]) {
  if (status === "completed") {
    return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20";
  }
  if (status === "failed") {
    return "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20";
  }
  return "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20";
}

function getDeliveryStyles(
  status: ExtractionDetail["integrationDeliveries"][number]["status"],
) {
  if (status === "succeeded") {
    return "bg-emerald-500/15 text-emerald-600";
  }
  if (status === "failed") {
    return "bg-rose-500/15 text-rose-600";
  }
  if (status === "processing") {
    return "bg-amber-500/15 text-amber-600";
  }
  return "bg-muted text-muted-foreground";
}

function HistoryDetailPage() {
  const { extractionId } = Route.useParams();
  const [isPolling, setIsPolling] = useState(true);
  const { data, isLoading, isError, error } = useExtractionQuery(extractionId, {
    refetchInterval: isPolling ? 2000 : false,
  });
  const extraction = data as ExtractionDetail | undefined;
  const navigate = useNavigate();

  useEffect(() => {
    if (extraction && extraction.status !== "processing") {
      setIsPolling(false);
    }
  }, [extraction]);

  if (isLoading) {
    return <HistoryDetailSkeleton />;
  }

  if (isError || !extraction) {
    return (
      <RouteError
        error={error instanceof Error ? error : new Error("Unable to load")}
        title="Unable to load extraction"
        actionHref="/history"
        actionLabel="Back to history"
      />
    );
  }
  const llmLabel =
    LLM_MODELS.find((model) => model.id === extraction.llmModelId)?.label ??
    extraction.llmModelId;
  const hasResults = Boolean(extraction.result);

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-5xl px-6 xl:max-w-6xl">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/50 px-3 py-1 font-medium text-muted-foreground text-xs">
              <History className="h-3.5 w-3.5" />
              Extraction detail
            </div>
            <h1 className="font-bold text-3xl tracking-tight">
              {extraction.modelName}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Model v{extraction.modelVersionNumber ?? "-"} · {llmLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 font-medium text-xs ${getStatusStyles(
                extraction.status,
              )}`}
            >
              {extraction.status}
            </span>
            <Button asChild variant="outline">
              <Link to="/history">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to history
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            {extraction.status === "failed" && (
              <Card className="border-rose-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-rose-600">
                    <AlertTriangle className="h-5 w-5" />
                    Extraction failed
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {extraction.errorMessage ||
                    "We were unable to complete this extraction."}
                </CardContent>
              </Card>
            )}

            {extraction.status === "processing" && !hasResults && (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  This extraction is still running. Refresh to see updates.
                </CardContent>
              </Card>
            )}

            {hasResults && (
              <ExtractionResults
                results={extraction.result as Record<string, unknown>}
                usage={extraction.usage}
                isLoading={extraction.status === "processing"}
                modelId={extraction.llmModelId as LlmModelId}
                onReset={() => navigate({ to: "/extraction" })}
              />
            )}
          </div>

          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Run details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground text-sm">
                <div className="flex items-center justify-between">
                  <span>Created</span>
                  <span className="font-medium text-foreground">
                    {formatDate(extraction.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Completed</span>
                  <span className="font-medium text-foreground">
                    {extraction.completedAt
                      ? formatDate(extraction.completedAt)
                      : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {extraction.inputs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No inputs recorded.
                  </p>
                ) : (
                  extraction.inputs.map((input) => (
                    <div
                      key={input.id}
                      className="flex items-start gap-3 rounded-md border border-border/60 p-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {input.fileName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {input.fileType} · {formatFileSize(input.fileSize)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {extraction.integrationDeliveries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Integrations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {extraction.integrationDeliveries.map((delivery) => (
                    <div
                      key={delivery.targetId}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {delivery.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {delivery.type.toUpperCase()}
                          {delivery.responseStatus
                            ? ` · ${delivery.responseStatus}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${getDeliveryStyles(
                          delivery.status,
                        )}`}
                      >
                        {delivery.status}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
