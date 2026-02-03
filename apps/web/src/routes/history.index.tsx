import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { fetchExtractions } from "@/lib/extractions-queries";
import type { ExtractionSummary } from "@/lib/extractions-types";
import { LLM_MODELS } from "@/lib/llm-models";
import { requireUser } from "@/lib/route-guards";

export const Route = createFileRoute("/history/")({
  component: HistoryPage,
  loader: async () => {
    return fetchExtractions();
  },
  beforeLoad: async () => {
    const user = await requireUser();
    return { user };
  },
});

function getStatusStyles(status: ExtractionSummary["status"]) {
  if (status === "completed") {
    return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20";
  }
  if (status === "failed") {
    return "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20";
  }
  return "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20";
}

function HistoryPage() {
  const runs = (Route.useLoaderData() || []) as ExtractionSummary[];

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="mb-12 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/50 px-3 py-1 font-medium text-muted-foreground text-xs">
              <History className="h-3.5 w-3.5" />
              Extraction History
            </div>
            <h1 className="font-bold text-3xl tracking-tight">
              Recent Extractions
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Review the latest extraction runs, their statuses, and details.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/extraction">
              <Sparkles className="mr-2 h-4 w-4" />
              New extraction
            </Link>
          </Button>
        </div>

        {runs.length === 0 ? (
          <div className="rounded-lg bg-card/40 p-10 text-center shadow-sm ring-1 ring-border/40">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <div className="h-8 w-8 rounded-full bg-primary/20" />
            </div>
            <p className="font-medium text-lg">No extraction history yet</p>
            <p className="mt-2 text-muted-foreground text-sm">
              Run your first extraction to see it show up here.
            </p>
            <Button asChild className="mt-6">
              <Link to="/extraction">Start extraction</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-card/40 shadow-sm ring-1 ring-border/40">
            {runs.map((run, index) => {
              const llmLabel =
                LLM_MODELS.find((model) => model.id === run.llmModelId)
                  ?.label ?? run.llmModelId;

              return (
                <div
                  key={run.id}
                  className={`flex flex-col gap-4 px-6 py-5 transition-colors duration-200 hover:bg-muted/40 ${
                    index === runs.length - 1 ? "" : "border-border/40 border-b"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">
                        {run.modelName}
                      </h3>
                      <p className="mt-1 text-muted-foreground text-sm">
                        Model v{run.modelVersionNumber ?? "-"} · {llmLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 font-medium text-xs ${getStatusStyles(
                          run.status,
                        )}`}
                      >
                        {run.status}
                      </span>
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 shrink-0"
                      >
                        <Link
                          to="/history/$extractionId"
                          params={{ extractionId: run.id }}
                          aria-label={`View extraction ${run.id}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
                    <span className="rounded-full bg-muted/70 px-2.5 py-1 font-medium">
                      Created {formatDate(run.createdAt)}
                    </span>
                    {run.completedAt && (
                      <span className="rounded-full bg-muted/70 px-2.5 py-1 font-medium">
                        Completed {formatDate(run.completedAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
