import {
  createExtractionInputs,
  createExtractionRun,
  setExtractionError,
  updateExtractionRun,
} from "@extractify/db/extractions";
import { getActiveModelVersionForOwner } from "@extractify/db/models";
import { enqueueExtraction } from "@extractify/queue";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getErrorMessage } from "@/lib/error-handling";
import { SUPPORTED_FILE_TYPES } from "@/lib/extractors/types";
import {
  DEFAULT_LLM_MODEL_ID,
  LLM_MODEL_ID_LIST,
  type LlmModelId,
} from "@/lib/llm-models";
import { requireUserId } from "@/lib/server/require-user-id";
import { uploadExtractionFile } from "@/lib/storage/s3";

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
const EXTRACTION_ID_SCHEMA = z.string().uuid();

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

function parseExtractionId(value: FormDataEntryValue | null) {
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error("Invalid extraction ID");
  }
  const parsed = EXTRACTION_ID_SCHEMA.safeParse(value.trim());
  if (!parsed.success) {
    throw new Error("Invalid extraction ID");
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

export const extractDataFromModel = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const files = validateFilesFromFormData(data);
    const extractionId = parseExtractionId(data.get("extractionId"));
    const modelId = parseModelId(data.get("modelId"));
    const llmModelId = parseLlmModelId(data.get("llmModelId"));
    const integrationTargetIds = data
      .getAll("integrationTargetIds")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    return {
      extractionId,
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
      extractionId: data.extractionId,
      modelId: activeVersion.modelId,
      modelVersionId: activeVersion.versionId,
      llmModelId: data.llmModelId,
    });

    if (!extractionRun) {
      throw new Error("Unable to create extraction run");
    }

    try {
      const fileUrls = await Promise.all(
        files.map(async (file, index) => {
          const fileUrl = await uploadExtractionFile(extractionRun.id, index, {
            fileName: file.fileName,
            fileType: file.fileType,
            data: file.fileData,
          });

          return {
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileData.byteLength,
            fileUrl,
            sourceOrder: index,
          };
        }),
      );

      await createExtractionInputs(
        extractionRun.id,
        fileUrls.map((file) => ({
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          sourceOrder: file.sourceOrder,
        })),
      );

      const jobId = await enqueueExtraction({
        extractionId: extractionRun.id,
        ownerId,
        modelId: activeVersion.modelId,
        modelVersionId: activeVersion.versionId,
        llmModelId: data.llmModelId,
        integrationTargetIds: data.integrationTargetIds,
        files: fileUrls,
      });

      if (!jobId) {
        throw new Error("Failed to queue extraction job");
      }

      return {
        extractionId: extractionRun.id,
        status: "processing" as const,
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
