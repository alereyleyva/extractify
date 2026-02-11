import { ExtractionResults } from "@/components/ExtractionResults";
import { IntegrationDeliveries } from "@/components/steps/IntegrationDeliveries";
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
        <IntegrationDeliveries deliveries={integrationDeliveries} />
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
