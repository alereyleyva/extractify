import { ExtractionResults } from "@/components/ExtractionResults";
import { Button } from "@/components/ui/button";
import type { IntegrationDeliveryResult } from "@/lib/integrations/types";
import type { LlmModelId } from "@/lib/llm-models";

export function ResultsStep({
  results,
  usage,
  isLoading,
  modelId,
  integrationDeliveries,
  onBack,
  onRetry,
  onRestart,
}: {
  results: Record<string, unknown>;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
  isLoading: boolean;
  modelId: LlmModelId;
  integrationDeliveries: IntegrationDeliveryResult[];
  onBack: () => void;
  onRetry: () => void;
  onRestart: () => void;
}) {
  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="mb-4 font-bold text-4xl tracking-tight md:text-5xl">
          <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Extraction Complete
          </span>
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Review and copy your extracted data
        </p>
      </div>
      <div className="mx-auto w-full max-w-6xl">
        {integrationDeliveries.length > 0 && (
          <div className="mb-6 rounded-xl border border-border/60 bg-card/70 p-4">
            <p className="font-medium text-sm">Integrations</p>
            <div className="mt-3 space-y-2">
              {integrationDeliveries.map((delivery) => (
                <div
                  key={delivery.targetId}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{delivery.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {delivery.type.toUpperCase()}
                      {delivery.responseStatus
                        ? ` · ${delivery.responseStatus}`
                        : ""}
                    </p>
                    {delivery.errorMessage && (
                      <p className="text-rose-600 text-xs">
                        {delivery.errorMessage}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      delivery.status === "succeeded"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-rose-500/15 text-rose-600"
                    }`}
                  >
                    {delivery.status === "succeeded" ? "Delivered" : "Failed"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <ExtractionResults
          results={results}
          usage={usage}
          isLoading={isLoading}
          modelId={modelId}
          onReset={onRestart}
        />
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onRetry}>Retry Extraction</Button>
        </div>
      </div>
    </div>
  );
}
