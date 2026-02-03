export type ExtractionSummary = {
  id: string;
  status: "processing" | "completed" | "failed";
  modelId: string;
  modelName: string;
  modelVersionNumber: number | null;
  llmModelId: string;
  createdAt: string | Date;
  completedAt: string | Date | null;
};

export type ExtractionInput = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  sourceOrder: number;
};

import type { IntegrationDeliverySummary } from "@/lib/integrations/types";

export type ExtractionDetail = {
  id: string;
  status: "processing" | "completed" | "failed";
  modelId: string;
  modelName: string;
  modelVersionId: string;
  modelVersionNumber: number | null;
  llmModelId: string;
  createdAt: string | Date;
  completedAt: string | Date | null;
  result: Record<string, object> | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
  errorMessage: string | null;
  inputs: ExtractionInput[];
  integrationDeliveries: IntegrationDeliverySummary[];
};
