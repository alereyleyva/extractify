import {
  getExtractionRunForOwner,
  listExtractionRunsForOwner,
} from "@extractify/db/extractions";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { IntegrationDeliverySummary } from "@/lib/integrations/types";
import { requireUserId } from "@/lib/server/require-user-id";

type ExtractionRunListItem = {
  id: string;
  status: "processing" | "completed" | "failed";
  modelId: string;
  llmModelId: string;
  createdAt: Date;
  completedAt: Date | null;
  model?: {
    name: string | null;
  } | null;
  modelVersion?: {
    versionNumber: number | null;
  } | null;
};

type ExtractionInputItem = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  sourceOrder: number;
};

type ExtractionRunDetail = ExtractionRunListItem & {
  modelVersionId: string;
  result: Record<string, object> | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
  inputs: ExtractionInputItem[];
  deliveries?:
    | {
        id: string;
        targetId: string;
        status: "pending" | "processing" | "succeeded" | "failed";
        responseStatus?: number | null;
        errorMessage?: string | null;
        target?: {
          name: string | null;
          type: "webhook" | "sheets" | "postgres";
        } | null;
      }[]
    | null;
  errors?:
    | {
        message: string;
      }[]
    | null;
};

type ExtractionDetailResponse = {
  id: string;
  status: "processing" | "completed" | "failed";
  modelId: string;
  modelName: string;
  modelVersionId: string;
  modelVersionNumber: number | null;
  llmModelId: string;
  createdAt: Date;
  completedAt: Date | null;
  result: Record<string, object> | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
  errorMessage: string | null;
  inputs: ExtractionInputItem[];
  integrationDeliveries: IntegrationDeliverySummary[];
};

const GetExtractionSchema = z.object({
  extractionId: z.string().min(1),
});

export const listExtractions = createServerFn({ method: "GET" }).handler(
  async () => {
    const ownerId = await requireUserId();
    const runs = (await listExtractionRunsForOwner(
      ownerId,
      20,
    )) as ExtractionRunListItem[];

    return runs.map((run: ExtractionRunListItem) => ({
      id: run.id,
      status: run.status,
      modelId: run.modelId,
      modelName: run.model?.name ?? "Unknown model",
      modelVersionNumber: run.modelVersion?.versionNumber ?? null,
      llmModelId: run.llmModelId,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
    }));
  },
);

export const getExtraction = createServerFn({ method: "POST" })
  .inputValidator(GetExtractionSchema)
  .handler(
    async ({
      data,
    }: {
      data: z.infer<typeof GetExtractionSchema>;
    }): Promise<ExtractionDetailResponse> => {
      const ownerId = await requireUserId();
      const run = (await getExtractionRunForOwner(
        ownerId,
        data.extractionId,
      )) as ExtractionRunDetail | null;

      if (!run) {
        throw new Error("Extraction not found");
      }

      const integrationDeliveries = (run.deliveries ?? []).map((delivery) => ({
        targetId: delivery.targetId,
        name: delivery.target?.name ?? "Unknown target",
        type: delivery.target?.type ?? "webhook",
        status: delivery.status,
        responseStatus: delivery.responseStatus ?? null,
        errorMessage: delivery.errorMessage ?? null,
      }));

      return {
        id: run.id,
        status: run.status,
        modelId: run.modelId,
        modelName: run.model?.name ?? "Unknown model",
        modelVersionId: run.modelVersionId,
        modelVersionNumber: run.modelVersion?.versionNumber ?? null,
        llmModelId: run.llmModelId,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
        result: run.result as Record<string, object> | null,
        usage: run.usage
          ? {
              inputTokens: run.usage.inputTokens,
              outputTokens: run.usage.outputTokens,
              totalTokens: run.usage.inputTokens + run.usage.outputTokens,
            }
          : null,
        errorMessage: run.errors?.[0]?.message ?? null,
        inputs: run.inputs.map((input: ExtractionInputItem) => ({
          id: input.id,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          sourceOrder: input.sourceOrder,
        })),
        integrationDeliveries,
      };
    },
  );
