import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import {
  createExtractionInputs,
  createExtractionRun,
  setExtractionError,
  updateExtractionRun,
} from "@extractify/db/extractions";
import { getActiveModelVersionForOwner } from "@extractify/db/models";
import { env } from "@extractify/env/server";
import {
  AttributeListSchema,
  type AttributeSchema,
} from "@extractify/shared/attribute-model";
import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getErrorMessage } from "@/lib/error-handling";
import { ExtractionStrategyFactory } from "@/lib/extractors/factory";
import { SUPPORTED_FILE_TYPES } from "@/lib/extractors/types";
import { deliverWebhookTargetsForExtraction } from "@/lib/integrations/deliveries";
import type { IntegrationDeliveryResult } from "@/lib/integrations/types";
import {
  DEFAULT_LLM_MODEL_ID,
  LLM_MODEL_ID_LIST,
  type LlmModelId,
} from "@/lib/llm-models";
import { requireUserId } from "@/lib/server/require-user-id";

const FileInputSchema = z.object({
  fileData: z.instanceof(ArrayBuffer),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
});

type ExtractedFile = z.infer<typeof FileInputSchema>;

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_SIZE_BYTES = 200 * 1024 * 1024;
const MODEL_ID_SCHEMA = z.string().uuid();

function normalizeFileType(fileType: string) {
  if (fileType === "image/jpg") {
    return "image/jpeg";
  }
  if (fileType === "audio/mp3") {
    return "audio/mpeg";
  }
  if (fileType === "audio/x-m4a") {
    return "audio/mp4";
  }
  if (fileType === "audio/x-wav") {
    return "audio/wav";
  }
  return fileType;
}

const FILE_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function inferFileType(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) {
    return undefined;
  }
  return FILE_TYPE_BY_EXTENSION[ext];
}

function parseModelId(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    throw new Error("Model ID is required");
  }
  const parsed = MODEL_ID_SCHEMA.safeParse(value.trim());
  if (!parsed.success) {
    throw new Error("Invalid model ID");
  }
  return parsed.data;
}

function parseLlmModelId(value: FormDataEntryValue | null): LlmModelId {
  if (value == null) {
    return DEFAULT_LLM_MODEL_ID;
  }
  if (typeof value !== "string") {
    throw new Error("Invalid LLM model selection");
  }
  if (!LLM_MODEL_ID_LIST.includes(value as LlmModelId)) {
    throw new Error("Invalid LLM model selection");
  }
  return value as LlmModelId;
}

function parseAttributesFromFormData(formData: FormData) {
  const rawAttributes = formData.get("attributes");
  if (typeof rawAttributes !== "string") {
    throw new Error("Attributes are required");
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawAttributes);
  } catch {
    throw new Error("Attributes must be valid JSON");
  }
  const parsed = AttributeListSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Attributes are invalid");
  }
  return parsed.data;
}

function validateFilesFromFormData(formData: FormData): File[] {
  const fileEntries = formData.getAll("files");
  if (fileEntries.length === 0) {
    throw new Error("At least one file is required");
  }
  if (fileEntries.length > MAX_FILES) {
    throw new Error(`Too many files (max ${MAX_FILES})`);
  }

  const files: File[] = [];
  let totalSize = 0;

  for (const entry of fileEntries) {
    if (!(entry instanceof File)) {
      throw new Error("Invalid file upload");
    }

    if (entry.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File ${entry.name || "upload"} exceeds ${formatBytes(
          MAX_FILE_SIZE_BYTES,
        )}`,
      );
    }

    totalSize += entry.size;
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      throw new Error(
        `Total upload exceeds ${formatBytes(MAX_TOTAL_SIZE_BYTES)}`,
      );
    }

    const inferred = entry.type || inferFileType(entry.name);
    const normalizedType = normalizeFileType(
      inferred ?? "application/octet-stream",
    );

    if (
      !SUPPORTED_FILE_TYPES.includes(
        normalizedType as (typeof SUPPORTED_FILE_TYPES)[number],
      )
    ) {
      throw new Error(`Unsupported file type: ${normalizedType}`);
    }
    files.push(entry);
  }

  return files;
}

async function mapFilesToExtracted(files: File[]): Promise<ExtractedFile[]> {
  const extracted: ExtractedFile[] = [];

  for (const file of files) {
    const inferred = file.type || inferFileType(file.name);
    const normalizedType = normalizeFileType(
      inferred ?? "application/octet-stream",
    );
    const arrayBuffer = await file.arrayBuffer();
    extracted.push({
      fileData: arrayBuffer,
      fileName: file.name || "upload",
      fileType: normalizedType,
    });
  }

  return extracted;
}

function createNestedFieldSchema(
  attr: z.infer<typeof AttributeSchema>,
): z.ZodTypeAny {
  if (attr.type === "array") {
    return z.array(z.string()).nullable();
  }

  if (attr.type === "number") {
    return z.number().nullable();
  }

  if (attr.type === "boolean") {
    return z.boolean().nullable();
  }

  if (attr.type === "date") {
    return z.string().nullable();
  }

  if (attr.type === "record") {
    if (!attr.children || attr.children.length === 0) {
      return z.record(z.string(), z.string()).nullable();
    }

    const recordSchema: Record<string, z.ZodTypeAny> = {};
    for (const child of attr.children) {
      recordSchema[child.name] = createNestedFieldSchema(child);
    }
    return z.object(recordSchema).nullable();
  }

  if (attr.type === "arrayOfRecords") {
    if (!attr.children || attr.children.length === 0) {
      return z.array(z.record(z.string(), z.string())).nullable();
    }

    const recordSchema: Record<string, z.ZodTypeAny> = {};
    for (const child of attr.children) {
      recordSchema[child.name] = createNestedFieldSchema(child);
    }
    return z.array(z.object(recordSchema)).nullable();
  }

  return z.string().nullable();
}

function createFieldSchema(
  attr: z.infer<typeof AttributeSchema>,
): z.ZodTypeAny {
  const description = attr.description || attr.name;
  const valueSchema = createNestedFieldSchema(attr);

  return z
    .object({
      value: valueSchema.describe(
        `The extracted value for ${description}. Format: ${
          attr.type === "array"
            ? "array of strings"
            : attr.type === "number"
              ? "number"
              : attr.type === "boolean"
                ? "boolean"
                : attr.type === "date"
                  ? "date string (YYYY-MM-DD)"
                  : attr.type === "record"
                    ? "object with nested fields"
                    : attr.type === "arrayOfRecords"
                      ? "array of objects with nested fields"
                      : "string"
        }`,
      ),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe(
          `Confidence score (0-1) indicating how certain the extraction is for ${description}`,
        ),
    })
    .describe(description);
}

function createAttributeSchema(attributes: z.infer<typeof AttributeSchema>[]) {
  const schemaObject: Record<string, z.ZodTypeAny> = {};

  for (const attr of attributes) {
    schemaObject[attr.name] = createFieldSchema(attr);
  }

  return z.object(schemaObject);
}

function buildAttributeDescription(
  attr: z.infer<typeof AttributeSchema>,
  indent = 0,
): string {
  const prefix = "  ".repeat(indent);
  const nameDesc = attr.description
    ? `${attr.name}: ${attr.description}`
    : attr.name;

  let result = `${prefix}- ${nameDesc} (type: ${attr.type})`;

  if (attr.type === "array") {
    result += " - Extract as an array of string values";
  } else if (attr.type === "number") {
    result += " - Extract as a number";
  } else if (attr.type === "boolean") {
    result += " - Extract as a boolean (true/false)";
  } else if (attr.type === "date") {
    result += " - Extract as a date string in YYYY-MM-DD format";
  } else if (attr.type === "record") {
    result += " - Extract as an object with the following nested fields:";
    if (attr.children && attr.children.length > 0) {
      result += "\n";
      for (const child of attr.children) {
        result += `\n${buildAttributeDescription(child, indent + 1)}`;
      }
    }
  } else if (attr.type === "arrayOfRecords") {
    result +=
      " - Extract as an array of objects, where each object has the following fields:";
    if (attr.children && attr.children.length > 0) {
      result += "\n";
      for (const child of attr.children) {
        result += `\n${buildAttributeDescription(child, indent + 1)}`;
      }
    }
  }

  return result;
}

function buildExtractionPrompt(
  documentText: string,
  attributes: z.infer<typeof AttributeSchema>[],
): string {
  const attributesList = attributes
    .map((attr) => buildAttributeDescription(attr))
    .join("\n");

  return `Extract the following information from the provided document text.
Be precise and only extract information that is explicitly stated in the document.
If a field is not found, use null for that field.

The text may contain multiple documents. Each document begins with a line like:
--- Document: filename.pdf ---
Use these separators to understand which content belongs to which document.

For each attribute, provide:
- value: The extracted value (or null if not found). The format depends on the attribute type:
  * string: A single string value
  * number: A numeric value
  * boolean: true or false
  * date: A date string in YYYY-MM-DD format
  * array: An array of string values (e.g., ["item1", "item2"])
  * record: An object with nested fields as defined
  * arrayOfRecords: An array of objects, each with the defined nested fields
- confidence: A confidence score between 0 and 1 indicating how certain you are about the extraction:
  * 1.0 = Very high confidence (information is clearly and explicitly stated)
  * 0.8-0.9 = High confidence (information is likely present but may require some inference)
  * 0.6-0.7 = Medium confidence (information is somewhat ambiguous or partially present)
  * 0.4-0.5 = Low confidence (uncertain if information is present or correct)
  * 0.0-0.3 = Very low confidence (information is likely not present or very unclear)
  * If value is null, confidence should be 0.0

Document text:
${documentText}

Extract the following attributes:
${attributesList}`;
}

function getBedrockModel(modelId: LlmModelId) {
  const bedrock = createAmazonBedrock({
    region: env.AWS_REGION,
    credentialProvider: fromNodeProviderChain(),
  });

  return bedrock(modelId);
}

async function runExtraction(input: {
  files: z.infer<typeof FileInputSchema>[];
  attributes: z.infer<typeof AttributeSchema>[];
  llmModelId: LlmModelId;
}) {
  const factory = new ExtractionStrategyFactory();
  const documentSections: string[] = [];

  for (const file of input.files) {
    const strategy = factory.getStrategy(file.fileType);
    const documentText = await strategy.extractText(
      file.fileData,
      file.fileName,
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
    prompt,
  });

  return {
    data: output as Record<string, object>,
    usage: totalUsage,
    modelId: input.llmModelId,
  };
}

export const extractData = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const files = validateFilesFromFormData(data);
    const attributes = parseAttributesFromFormData(data);
    const llmModelId = parseLlmModelId(data.get("llmModelId"));

    return {
      files,
      attributes,
      llmModelId,
    };
  })
  .handler(async ({ data }) => {
    await requireUserId();
    const files = await mapFilesToExtracted(data.files);
    return runExtraction({
      files,
      attributes: data.attributes,
      llmModelId: data.llmModelId,
    });
  });

export const extractDataFromModel = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const files = validateFilesFromFormData(data);
    const modelId = parseModelId(data.get("modelId"));
    const llmModelId = parseLlmModelId(data.get("llmModelId"));
    const integrationTargetIds = data
      .getAll("integrationTargetIds")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    return {
      modelId,
      llmModelId,
      integrationTargetIds:
        integrationTargetIds.length > 0 ? integrationTargetIds : undefined,
      files,
    };
  })
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const files = await mapFilesToExtracted(data.files);
    const activeVersion = await getActiveModelVersionForOwner(
      ownerId,
      data.modelId,
    );

    if (!activeVersion) {
      throw new Error("Model not found");
    }
    const extractionRun = await createExtractionRun({
      ownerId,
      modelId: activeVersion.modelId,
      modelVersionId: activeVersion.versionId,
      llmModelId: data.llmModelId,
    });

    if (!extractionRun) {
      throw new Error("Unable to create extraction run");
    }

    try {
      await createExtractionInputs(
        extractionRun.id,
        files.map((file, index) => ({
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileData.byteLength,
          sourceOrder: index,
        })),
      );

      const result = await runExtraction({
        files,
        attributes: activeVersion.attributes,
        llmModelId: data.llmModelId,
      });

      const usage = result.usage
        ? {
            inputTokens: result.usage.inputTokens ?? 0,
            outputTokens: result.usage.outputTokens ?? 0,
          }
        : null;

      await updateExtractionRun({
        ownerId,
        extractionId: extractionRun.id,
        status: "completed",
        result: result.data as Record<string, unknown>,
        usage,
        completedAt: new Date(),
      });

      let integrationDeliveries: IntegrationDeliveryResult[] = [];

      try {
        integrationDeliveries = await deliverWebhookTargetsForExtraction({
          ownerId,
          extractionId: extractionRun.id,
          targetIds: data.integrationTargetIds,
        });
      } catch (error) {
        console.error("Webhook delivery failed", error);
      }

      return {
        ...result,
        integrationDeliveries,
      };
    } catch (error) {
      await setExtractionError({
        ownerId,
        extractionId: extractionRun.id,
        message: getErrorMessage(error),
      });
      await updateExtractionRun({
        ownerId,
        extractionId: extractionRun.id,
        status: "failed",
        completedAt: new Date(),
      });

      throw error;
    }
  });
