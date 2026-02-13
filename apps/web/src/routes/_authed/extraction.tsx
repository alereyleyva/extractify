import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Attribute } from "@/components/AttributeBuilder";
import { RouteError } from "@/components/route-error";
import { ExtractionPageSkeleton } from "@/components/skeletons/extraction-skeleton";
import { AttributesStep } from "@/components/steps/AttributesStep";
import { ExtractStep } from "@/components/steps/ExtractStep";
import { ResultsStep } from "@/components/steps/ResultsStep";
import { Stepper } from "@/components/steps/Stepper";
import { StepSection } from "@/components/steps/StepSection";
import { UploadStep } from "@/components/steps/UploadStep";
import { getErrorMessage } from "@/lib/error-handling";
import type {
  IntegrationDeliveryResult,
  IntegrationTarget,
} from "@/lib/integrations/types";
import {
  DEFAULT_LLM_MODEL_ID,
  LLM_MODELS,
  type LlmModelId,
} from "@/lib/llm-models";
import {
  useActiveModelVersionQuery,
  useExtractDataMutation,
  useIntegrationsQuery,
  useModelsQuery,
} from "@/lib/query-hooks";
import { areAttributesValid } from "@/lib/validation";

export const Route = createFileRoute("/_authed/extraction")({
  component: ExtractionPage,
  errorComponent: ({ error }) => (
    <RouteError
      error={error}
      title="Unable to load extraction"
      actionHref="/"
      actionLabel="Back home"
    />
  ),
});

type Step = "upload" | "attributes" | "extract" | "results";

function ExtractionPage() {
  const navigate = useNavigate();
  const { data: modelsData, isLoading: isLoadingModels } = useModelsQuery();
  const { data: integrationTargetsData, isLoading: isLoadingIntegrations } =
    useIntegrationsQuery();
  const models = (modelsData || []) as unknown as {
    id: string;
    name: string;
    activeVersion?: {
      versionNumber: number;
    } | null;
  }[];
  const integrationTargets = (integrationTargetsData ||
    []) as IntegrationTarget[];
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const {
    data: activeModelVersion,
    isLoading: isLoadingActiveVersion,
    error: activeModelVersionError,
  } = useActiveModelVersionQuery(selectedModelId);
  const currentModelVersion = (activeModelVersion || null) as {
    modelId: string;
    modelName: string;
    versionId: string;
    versionNumber: number;
    attributes: Attribute[];
  } | null;
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [integrationDeliveries, setIntegrationDeliveries] = useState<
    IntegrationDeliveryResult[]
  >([]);
  const [usage, setUsage] = useState<{
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null>(null);
  const [selectedLlmModelId, setSelectedLlmModelId] =
    useState<LlmModelId>(DEFAULT_LLM_MODEL_ID);
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [hasTouchedIntegrations, setHasTouchedIntegrations] = useState(false);
  const previousStepRef = useRef<Step | null>(null);

  const enabledIntegrationTargets = useMemo(
    () => integrationTargets.filter((target) => target.enabled),
    [integrationTargets],
  );

  const enabledIntegrationIds = useMemo(
    () => enabledIntegrationTargets.map((target) => target.id),
    [enabledIntegrationTargets],
  );

  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState(
    enabledIntegrationIds,
  );

  const extractDataMutation = useExtractDataMutation();
  const goToStep = useCallback((nextStep: Step) => {
    setCurrentStep((prev) => (prev === nextStep ? prev : nextStep));
  }, []);

  const clearExtractionRunState = () => {
    setResults(null);
    setUsage(null);
    setIntegrationDeliveries([]);
  };

  useEffect(() => {
    if (results && currentStep === "extract") {
      const timeoutId = setTimeout(() => goToStep("results"), 300);
      return () => clearTimeout(timeoutId);
    }
  }, [results, currentStep, goToStep]);

  useEffect(() => {
    if (previousStepRef.current === null) {
      previousStepRef.current = currentStep;
      return;
    }

    if (previousStepRef.current === currentStep) {
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    previousStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    if (selectedModelId || models.length === 0) {
      return;
    }
    setSelectedModelId(models[0]?.id ?? null);
  }, [models, selectedModelId]);

  useEffect(() => {
    if (!currentModelVersion) {
      setAttributes([]);
      return;
    }
    setAttributes(currentModelVersion.attributes ?? []);
  }, [currentModelVersion]);

  useEffect(() => {
    if (!activeModelVersionError) {
      return;
    }
    toast.error(getErrorMessage(activeModelVersionError));
  }, [activeModelVersionError]);

  useEffect(() => {
    if (!hasTouchedIntegrations) {
      setSelectedIntegrationIds(enabledIntegrationIds);
      return;
    }

    setSelectedIntegrationIds((prev) =>
      prev.filter((id) => enabledIntegrationIds.includes(id)),
    );
  }, [enabledIntegrationIds, hasTouchedIntegrations]);

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    clearExtractionRunState();
    goToStep("upload");
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, current) => current !== index));
    clearExtractionRunState();
    goToStep("upload");
  };

  const handleFileRemoveAll = () => {
    setSelectedFiles([]);
    clearExtractionRunState();
    goToStep("upload");
  };

  const handleExtract = async () => {
    if (selectedFiles.length === 0 || !selectedModelId) {
      toast.error("Please upload documents and select a model");
      return;
    }
    if (!areAttributesValid(attributes)) {
      toast.error("The active model has no valid attributes");
      return;
    }

    clearExtractionRunState();

    try {
      const selectedModel = models.find(
        (model) => model.id === selectedModelId,
      );
      const extractionId = crypto.randomUUID();

      extractDataMutation.mutate(
        {
          extractionId,
          modelId: selectedModelId,
          modelName: selectedModel?.name ?? "Unknown model",
          modelVersionId: currentModelVersion?.versionId ?? null,
          modelVersionNumber: currentModelVersion?.versionNumber ?? null,
          llmModelId: selectedLlmModelId,
          files: selectedFiles,
          integrationTargetIds: selectedIntegrationIds,
        },
        {
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        },
      );

      toast.success("Extraction queued! Redirecting to view progress...");

      navigate({
        to: "/history/$extractionId",
        params: { extractionId },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setAttributes(currentModelVersion?.attributes ?? []);
    clearExtractionRunState();
    goToStep("upload");
  };

  const canExtract =
    selectedFiles.length > 0 &&
    selectedModelId &&
    areAttributesValid(attributes) &&
    !extractDataMutation.isPending;

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

  const isInitialLoading =
    (isLoadingModels && models.length === 0) ||
    (isLoadingIntegrations && integrationTargets.length === 0);
  const isActiveVersionLoading = isLoadingActiveVersion && !currentModelVersion;

  if (isInitialLoading || isActiveVersionLoading) {
    return <ExtractionPageSkeleton />;
  }

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

          <Stepper steps={steps} current={currentStep} onNavigate={goToStep} />
        </div>

        <div className="relative min-h-[600px]">
          <StepSection active={currentStep === "upload"}>
            <UploadStep
              selectedFiles={selectedFiles}
              onFileSelect={handleFileSelect}
              onRemoveFile={handleFileRemove}
              onRemoveAll={handleFileRemoveAll}
              onContinue={() => goToStep("attributes")}
            />
          </StepSection>

          {selectedFiles.length > 0 && (
            <StepSection active={currentStep === "attributes"}>
              <AttributesStep
                attributes={attributes}
                onAttributesChange={setAttributes}
                valid={areAttributesValid(attributes)}
                onBack={() => goToStep("upload")}
                onContinue={() => goToStep("extract")}
                models={models}
                selectedModelId={selectedModelId}
                onModelChange={(modelId) => {
                  setSelectedModelId(modelId);
                  goToStep("attributes");
                }}
                modelVersionNumber={currentModelVersion?.versionNumber}
                readOnly
              />
            </StepSection>
          )}

          {selectedFiles.length > 0 && areAttributesValid(attributes) && (
            <StepSection active={currentStep === "extract"}>
              <ExtractStep
                canExtract={!!canExtract}
                isExtracting={extractDataMutation.isPending}
                onBack={() => goToStep("attributes")}
                onExtract={handleExtract}
                llmModels={LLM_MODELS}
                selectedLlmModelId={selectedLlmModelId}
                onLlmModelChange={setSelectedLlmModelId}
                integrations={enabledIntegrationTargets}
                selectedIntegrationIds={selectedIntegrationIds}
                onToggleIntegration={(targetId: string) => {
                  setHasTouchedIntegrations(true);
                  setSelectedIntegrationIds((prev) =>
                    prev.includes(targetId)
                      ? prev.filter((id) => id !== targetId)
                      : [...prev, targetId],
                  );
                }}
              />
            </StepSection>
          )}

          {results && (
            <StepSection active={currentStep === "results"}>
              <ResultsStep
                results={results}
                usage={usage}
                isLoading={extractDataMutation.isPending}
                modelId={selectedLlmModelId}
                integrationDeliveries={integrationDeliveries}
                onBack={() => goToStep("attributes")}
                onRetry={() => {
                  goToStep("extract");
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
