import { ArrowRight } from "lucide-react";
import type { Attribute } from "@/components/AttributeBuilder";
import { AttributeBuilder } from "@/components/AttributeBuilder";
import { Button } from "@/components/ui/button";

export function AttributesStep({
  attributes,
  onAttributesChange,
  valid,
  onBack,
  onContinue,
}: {
  attributes: Attribute[];
  onAttributesChange: (attrs: Attribute[]) => void;
  valid: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="mb-4 font-bold text-4xl tracking-tight md:text-5xl">
          <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Define Attributes
          </span>
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Specify what data to extract from your PDF. Add as many attributes as
          needed.
        </p>
      </div>
      <div className="mx-auto w-full max-w-5xl">
        <AttributeBuilder
          attributes={attributes}
          onAttributesChange={onAttributesChange}
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
