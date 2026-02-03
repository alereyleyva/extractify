import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IntegrationTarget } from "@/lib/integrations/types";
import type { LlmModelId } from "@/lib/llm-models";

export function ExtractStep({
  canExtract,
  isExtracting,
  onBack,
  onExtract,
  llmModels,
  selectedLlmModelId,
  onLlmModelChange,
  integrations,
  selectedIntegrationIds,
  onToggleIntegration,
}: {
  canExtract: boolean;
  isExtracting: boolean;
  onBack: () => void;
  onExtract: () => void;
  llmModels: ReadonlyArray<{ id: LlmModelId; label: string }>;
  selectedLlmModelId: LlmModelId;
  onLlmModelChange: (modelId: LlmModelId) => void;
  integrations: IntegrationTarget[];
  selectedIntegrationIds: string[];
  onToggleIntegration: (targetId: string) => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="mb-4 font-bold text-4xl tracking-tight md:text-5xl">
        <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Ready to Extract
        </span>
      </h2>
      <p className="mb-12 max-w-2xl text-lg text-muted-foreground">
        Click below to start the extraction process
      </p>
      <div className="mb-10 w-full max-w-md rounded-xl border border-border/60 bg-card/70 p-4 text-left">
        <p className="font-medium text-sm">LLM model</p>
        <p className="mb-3 text-muted-foreground text-xs">
          Select the Bedrock model used for extraction
        </p>
        <Select
          value={selectedLlmModelId}
          onValueChange={(value) => onLlmModelChange(value as LlmModelId)}
          disabled={isExtracting}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {llmModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mb-10 w-full max-w-md rounded-xl border border-border/60 bg-card/70 p-4 text-left">
        <p className="font-medium text-sm">Destinations</p>
        <p className="mb-3 text-muted-foreground text-xs">
          Choose which integrations should receive the results.
        </p>
        {integrations.length === 0 ? (
          <div className="rounded-lg border border-border/40 border-dashed bg-muted/20 px-3 py-4 text-center text-muted-foreground text-xs">
            No enabled integrations yet.
          </div>
        ) : (
          <div className="space-y-2">
            {integrations.map((integration) => {
              const selected = selectedIntegrationIds.includes(integration.id);
              return (
                <button
                  key={integration.id}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selected
                      ? "border-primary/60 bg-primary/10"
                      : "border-border/60 bg-background"
                  }`}
                  onClick={() => onToggleIntegration(integration.id)}
                >
                  <div>
                    <p className="font-medium">{integration.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {integration.type.toUpperCase()}
                      {integration.type === "webhook"
                        ? ` · ${integration.config.method ?? "POST"}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selected ? "Selected" : "Skip"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onExtract} disabled={!canExtract}>
          {isExtracting ? (
            <>
              <span className="mr-2 animate-spin">⏳</span>
              Extracting...
            </>
          ) : (
            <>
              Extract Data
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
