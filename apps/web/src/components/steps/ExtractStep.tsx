import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LlmModelId } from "@/lib/llm-models";

export function ExtractStep({
  canExtract,
  isExtracting,
  onBack,
  onExtract,
  llmModels,
  selectedLlmModelId,
  onLlmModelChange,
}: {
  canExtract: boolean;
  isExtracting: boolean;
  onBack: () => void;
  onExtract: () => void;
  llmModels: ReadonlyArray<{ id: LlmModelId; label: string }>;
  selectedLlmModelId: LlmModelId;
  onLlmModelChange: (modelId: LlmModelId) => void;
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
