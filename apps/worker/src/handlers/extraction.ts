import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import {
  setExtractionError,
  updateExtractionRun,
} from "@extractify/db/extractions";
import { getModelVersionById } from "@extractify/db/models";
import { env } from "@extractify/env/worker";
import type { ExtractionJobData } from "@extractify/queue";
import type { AttributeSchema } from "@extractify/shared/attribute-model";
import {
  buildExtractionPrompt,
  createAttributeSchema,
} from "@extractify/shared/extraction-schema";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { ExtractionStrategyFactory } from "../extraction/strategy-factory";
import { deliverIntegrations } from "../integrations/deliver";
import { deleteExtractionFile, downloadExtractionFile } from "../storage/s3";

type LlmModelId = string;

function getBedrockModel(modelId: LlmModelId) {
  const bedrock = createAmazonBedrock({
    region: env.AWS_REGION,
    credentialProvider: fromNodeProviderChain(),
  });

  return bedrock(modelId);
}

async function runExtraction(input: {
  files: Array<{
    fileName: string;
    fileType: string;
    fileData: ArrayBuffer;
    fileUrl: string;
  }>;
  attributes: z.infer<typeof AttributeSchema>[];
  llmModelId: LlmModelId;
  systemPrompt?: string | null;
}) {
  const factory = new ExtractionStrategyFactory();
  const documentSections: string[] = [];

  for (const file of input.files) {
    const strategy = factory.getStrategy(file.fileType);
    const documentText = await strategy.extractText(
      file.fileData,
      file.fileName,
      file.fileUrl,
    );
    documentSections.push(
      `--- Document: ${file.fileName} ---\n${documentText}`,
    );
  }

  const combinedText = documentSections.join("\n\n");

  const schema = createAttributeSchema(input.attributes);
  const bedrockModel = getBedrockModel(input.llmModelId);
  const prompt = buildExtractionPrompt(combinedText, input.attributes);

  const { output, totalUsage } = await generateText({
    model: bedrockModel,
    output: Output.object({
      schema,
    }),
    system: input.systemPrompt?.trim() || undefined,
    prompt,
  });

  return {
    data: output as Record<string, object>,
    usage: totalUsage,
    modelId: input.llmModelId,
  };
}

export async function processExtraction(job: ExtractionJobData): Promise<void> {
  const {
    extractionId,
    ownerId,
    modelVersionId,
    llmModelId,
    files,
    integrationTargetIds,
  } = job;

  try {
    const modelVersion = await getModelVersionById(modelVersionId);

    if (!modelVersion) {
      throw new Error(`Model version ${modelVersionId} not found`);
    }

    const downloadedFiles = await Promise.all(
      files.map(async (file) => {
        const fileData = await downloadExtractionFile(file.fileUrl);
        return {
          fileName: file.fileName,
          fileType: file.fileType,
          fileData,
          fileUrl: file.fileUrl,
        };
      }),
    );

    const result = await runExtraction({
      files: downloadedFiles,
      attributes: modelVersion.attributes,
      llmModelId,
      systemPrompt: modelVersion.systemPrompt,
    });

    const usage = result.usage
      ? {
          inputTokens: result.usage.inputTokens ?? 0,
          outputTokens: result.usage.outputTokens ?? 0,
        }
      : null;

    await updateExtractionRun({
      ownerId,
      extractionId,
      status: "completed",
      result: result.data as Record<string, unknown>,
      usage,
      completedAt: new Date(),
    });

    if (integrationTargetIds && integrationTargetIds.length > 0) {
      try {
        await deliverIntegrations({
          ownerId,
          extractionId,
          targetIds: integrationTargetIds,
        });
      } catch (error) {
        console.error(
          `[worker] Integration delivery failed for ${extractionId}:`,
          error,
        );
      }
    }

    try {
      await Promise.all(
        files.map((file) => deleteExtractionFile(file.fileUrl)),
      );
    } catch (error) {
      console.error(
        `[worker] Failed to remove extraction files for ${extractionId}:`,
        error,
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    await setExtractionError({
      ownerId,
      extractionId,
      message,
    });

    await updateExtractionRun({
      ownerId,
      extractionId,
      status: "failed",
      completedAt: new Date(),
    });

    throw error;
  }
}
