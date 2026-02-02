import { ArrowRight } from "lucide-react";
import type { Attribute } from "@/components/AttributeBuilder";
import { AttributeBuilder } from "@/components/AttributeBuilder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ModelOption = {
  id: string;
  name: string;
  activeVersion?: {
    versionNumber: number;
  } | null;
};

export function AttributesStep({
  attributes,
  onAttributesChange,
  valid,
  onBack,
  onContinue,
  models,
  selectedModelId,
  onModelChange,
  modelVersionNumber,
  readOnly = false,
}: {
  attributes: Attribute[];
  onAttributesChange: (attrs: Attribute[]) => void;
  valid: boolean;
  onBack: () => void;
  onContinue: () => void;
  models: ModelOption[];
  selectedModelId: string | null;
  onModelChange: (modelId: string) => void;
  modelVersionNumber?: number | null;
  readOnly?: boolean;
}) {
  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="mb-4 font-bold text-4xl tracking-tight md:text-5xl">
          <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Select Model
          </span>
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Choose a model and review its active version attributes before running
          extraction.
        </p>
      </div>
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/70 px-4 py-3">
          <div>
            <p className="font-medium text-sm">Extraction model</p>
            <p className="text-muted-foreground text-xs">
              Active version v{modelVersionNumber ?? "-"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
            <Select
              value={selectedModelId ?? ""}
              onValueChange={(value) => {
                if (value) {
                  onModelChange(value);
                }
              }}
            >
              <SelectTrigger className="h-9 min-w-[220px]">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <AttributeBuilder
          attributes={attributes}
          onAttributesChange={onAttributesChange}
          readOnly={readOnly}
        />
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onContinue} disabled={!valid}>
            Continue to Extract
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
