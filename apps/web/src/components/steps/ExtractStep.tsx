import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExtractStep({
  canExtract,
  isExtracting,
  onBack,
  onExtract,
}: {
  canExtract: boolean;
  isExtracting: boolean;
  onBack: () => void;
  onExtract: () => void;
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
