import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Attribute } from "@/components/AttributeBuilder";
import { AttributesStep } from "@/components/steps/AttributesStep";
import { ExtractStep } from "@/components/steps/ExtractStep";
import { ResultsStep } from "@/components/steps/ResultsStep";
import { Stepper } from "@/components/steps/Stepper";
import { StepSection } from "@/components/steps/StepSection";
import { UploadStep } from "@/components/steps/UploadStep";
import { extractData } from "@/functions/extract-data";
import { getCurrentUser } from "@/functions/get-current-user";
import { getErrorMessage } from "@/lib/error-handling";
import { areAttributesValid, validateAttributes } from "@/lib/validation";

export const Route = createFileRoute("/extraction")({
  component: ExtractionPage,
  beforeLoad: async () => {
    const user = await getCurrentUser();

    if (!user) {
      throw redirect({
        to: "/",
      });
    }

    return { user };
  },
});

type Step = "upload" | "attributes" | "extract" | "results";

function ExtractionPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [usage, setUsage] = useState<{
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("upload");

  const extractDataFn = useServerFn(extractData);

  useEffect(() => {
    if (results && currentStep === "extract") {
      setTimeout(() => setCurrentStep("results"), 300);
    }
  }, [results, currentStep]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResults(null);
    setUsage(null);
    setCurrentStep("upload");
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setResults(null);
    setUsage(null);
    setCurrentStep("upload");
  };

  const handleExtract = async () => {
    if (!selectedFile || attributes.length === 0) {
      toast.error("Please upload a document and define at least one attribute");
      return;
    }

    const validAttributes = validateAttributes(attributes);

    if (validAttributes.length === 0) {
      toast.error("Please fill in all attribute names");
      return;
    }

    setIsExtracting(true);
    setResults(null);
    setUsage(null);

    try {
      const fileType =
        selectedFile.type === "image/jpg" ? "image/jpeg" : selectedFile.type;
      const result = await extractDataFn({
        data: {
          fileData: await selectedFile.arrayBuffer(),
          fileName: selectedFile.name,
          fileType,
          attributes: validAttributes.map(({ id, ...rest }) => rest),
        },
      });

      if (result && typeof result === "object" && "data" in result) {
        setResults(result.data as Record<string, unknown>);
        if (
          "usage" in result &&
          result.usage &&
          typeof result.usage === "object" &&
          "inputTokens" in result.usage &&
          "outputTokens" in result.usage &&
          "totalTokens" in result.usage
        ) {
          const usageData = result.usage as {
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
          };
          setUsage(usageData);
        }
        toast.success("Data extracted successfully!");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setAttributes([]);
    setResults(null);
    setUsage(null);
    setCurrentStep("upload");
  };

  const canExtract =
    selectedFile && areAttributesValid(attributes) && !isExtracting;

  const steps = useMemo(
    () =>
      [
        { key: "upload", label: "Upload", number: 1 },
        { key: "attributes", label: "Attributes", number: 2 },
        { key: "extract", label: "Extract", number: 3 },
        { key: "results", label: "Results", number: 4 },
      ] as { key: Step; label: string; number: number }[],
    [],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-12 pt-20">
      <div className="container mx-auto w-full max-w-7xl px-6">
        <div className="mb-12 text-center">
          <div className="mb-10 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="font-bold text-3xl tracking-tight">Extractify</h1>
          </div>

          <Stepper
            steps={steps}
            current={currentStep}
            onNavigate={(step) => setCurrentStep(step)}
          />
        </div>

        <div className="relative min-h-[600px]">
          <StepSection active={currentStep === "upload"}>
            <UploadStep
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onRemove={handleFileRemove}
              onContinue={() => setCurrentStep("attributes")}
            />
          </StepSection>

          {selectedFile && (
            <StepSection active={currentStep === "attributes"}>
              <AttributesStep
                attributes={attributes}
                onAttributesChange={setAttributes}
                valid={areAttributesValid(attributes)}
                onBack={() => setCurrentStep("upload")}
                onContinue={() => setCurrentStep("extract")}
              />
            </StepSection>
          )}

          {selectedFile && areAttributesValid(attributes) && (
            <StepSection active={currentStep === "extract"}>
              <ExtractStep
                canExtract={!!canExtract}
                isExtracting={isExtracting}
                onBack={() => setCurrentStep("attributes")}
                onExtract={handleExtract}
              />
            </StepSection>
          )}

          {results && (
            <StepSection active={currentStep === "results"}>
              <ResultsStep
                results={results}
                usage={usage}
                isLoading={isExtracting}
                onBack={() => setCurrentStep("attributes")}
                onRetry={() => {
                  setCurrentStep("extract");
                  handleExtract();
                }}
                onRestart={handleReset}
              />
            </StepSection>
          )}
        </div>
      </div>
    </div>
  );
}
