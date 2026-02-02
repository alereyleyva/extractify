import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Attribute } from "@/components/AttributeBuilder";
import { RouteError } from "@/components/route-error";
import { AttributesStep } from "@/components/steps/AttributesStep";
import { ExtractStep } from "@/components/steps/ExtractStep";
import { ResultsStep } from "@/components/steps/ResultsStep";
import { Stepper } from "@/components/steps/Stepper";
import { StepSection } from "@/components/steps/StepSection";
import { UploadStep } from "@/components/steps/UploadStep";
import { extractDataFromModel } from "@/functions/extract-data";
import { getActiveModelVersion } from "@/functions/models";
import { getErrorMessage } from "@/lib/error-handling";
import { fetchActiveModelVersion, fetchModels } from "@/lib/models-queries";
import { requireUser } from "@/lib/route-guards";
import { areAttributesValid } from "@/lib/validation";

export const Route = createFileRoute("/extraction")({
  component: ExtractionPage,
  errorComponent: ({ error }) => (
    <RouteError
      error={error}
      title="Unable to load extraction"
      actionHref="/"
      actionLabel="Back home"
    />
  ),
  loader: async () => {
    const models = (await fetchModels()) || [];
    const defaultModelId = models[0]?.id;
    const activeModelVersion = defaultModelId
      ? await fetchActiveModelVersion(defaultModelId)
      : null;

    return {
      models,
      activeModelVersion,
    };
  },
  beforeLoad: async () => {
    const user = await requireUser();
    return { user };
  },
});

type Step = "upload" | "attributes" | "extract" | "results";

function ExtractionPage() {
  const { models, activeModelVersion } = Route.useLoaderData() as {
    models: {
      id: string;
      name: string;
      activeVersion?: {
        versionNumber: number;
      } | null;
    }[];
    activeModelVersion: {
      modelId: string;
      modelName: string;
      versionId: string;
      versionNumber: number;
      attributes: Attribute[];
    } | null;
  };
  const [selectedModelId, setSelectedModelId] = useState<string | null>(
    activeModelVersion?.modelId ?? models[0]?.id ?? null,
  );
  const [currentModelVersion, setCurrentModelVersion] =
    useState<typeof activeModelVersion>(activeModelVersion);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>(
    activeModelVersion?.attributes ?? [],
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [usage, setUsage] = useState<{
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("upload");

  const extractDataFn = useServerFn(extractDataFromModel);
  const getActiveModelVersionFn = useServerFn(getActiveModelVersion);

  useEffect(() => {
    if (results && currentStep === "extract") {
      setTimeout(() => setCurrentStep("results"), 300);
    }
  }, [results, currentStep]);

  useEffect(() => {
    if (!selectedModelId) {
      setCurrentModelVersion(null);
      setAttributes([]);
      return;
    }

    if (currentModelVersion?.modelId === selectedModelId) {
      return;
    }

    const loadModel = async () => {
      try {
        const activeVersion = await getActiveModelVersionFn({
          data: { modelId: selectedModelId },
        });
        setCurrentModelVersion(activeVersion as typeof activeModelVersion);
        setAttributes((activeVersion?.attributes as Attribute[]) || []);
      } catch (error) {
        toast.error(getErrorMessage(error));
        setCurrentModelVersion(null);
        setAttributes([]);
      }
    };

    loadModel();
  }, [selectedModelId, currentModelVersion, getActiveModelVersionFn]);

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
    if (!selectedFile || !selectedModelId) {
      toast.error("Please upload a document and select a model");
      return;
    }
    if (!areAttributesValid(attributes)) {
      toast.error("The active model has no valid attributes");
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
          modelId: selectedModelId,
          fileData: await selectedFile.arrayBuffer(),
          fileName: selectedFile.name,
          fileType,
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
    setAttributes(currentModelVersion?.attributes ?? []);
    setResults(null);
    setUsage(null);
    setCurrentStep("upload");
  };

  const canExtract =
    selectedFile &&
    selectedModelId &&
    areAttributesValid(attributes) &&
    !isExtracting;

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

  if (models.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background py-12 pt-20">
        <div className="container mx-auto w-full max-w-3xl px-6 text-center">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-bold text-3xl tracking-tight">
            Create a model to get started
          </h1>
          <p className="mt-3 text-muted-foreground">
            Extraction uses your active model version. Create a model first,
            then come back to run extraction.
          </p>
          <div className="mt-6">
            <Link
              to="/models/new"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
              Create model
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
                models={models}
                selectedModelId={selectedModelId}
                onModelChange={(modelId) => {
                  setSelectedModelId(modelId);
                  setCurrentStep("attributes");
                }}
                modelVersionNumber={currentModelVersion?.versionNumber}
                readOnly
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
