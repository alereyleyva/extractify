import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  extractionError,
  extractionInput,
  extractionRun,
} from "./schema/extractions";
import { integrationDelivery } from "./schema/integrations";

type DbTransaction = Parameters<typeof db.transaction>[0] extends (
  tx: infer T,
) => unknown
  ? T
  : never;

export type CreateExtractionRunInput = {
  ownerId: string;
  modelId: string;
  modelVersionId: string;
  llmModelId: string;
};

export type CreateExtractionInput = {
  fileName: string;
  fileType: string;
  fileSize?: number | null;
  sourceOrder: number;
};

export type UpdateExtractionRunInput = {
  ownerId: string;
  extractionId: string;
  status?: "processing" | "completed" | "failed";
  result?: Record<string, unknown> | null;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  } | null;
  completedAt?: Date | null;
};

export type ExtractionErrorInput = {
  ownerId: string;
  extractionId: string;
  message: string;
  occurredAt?: Date;
};

export async function createExtractionRun(input: CreateExtractionRunInput) {
  const extractionId = crypto.randomUUID();

  const [created] = await db
    .insert(extractionRun)
    .values({
      id: extractionId,
      ownerId: input.ownerId,
      modelId: input.modelId,
      modelVersionId: input.modelVersionId,
      llmModelId: input.llmModelId,
      status: "processing",
    })
    .returning();

  return created ?? null;
}

export async function createExtractionInputs(
  extractionId: string,
  inputs: CreateExtractionInput[],
) {
  if (inputs.length === 0) {
    return;
  }

  await db.insert(extractionInput).values(
    inputs.map((input) => ({
      id: crypto.randomUUID(),
      extractionId,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize ?? null,
      sourceOrder: input.sourceOrder,
    })),
  );
}

export async function updateExtractionRun(input: UpdateExtractionRunInput) {
  const updateValues: Partial<typeof extractionRun.$inferInsert> = {};

  if (input.status !== undefined) {
    updateValues.status = input.status;
  }

  if (input.result !== undefined) {
    updateValues.result = input.result;
  }

  if (input.usage !== undefined) {
    updateValues.usage = input.usage;
  }

  if (input.completedAt !== undefined) {
    updateValues.completedAt = input.completedAt;
  }

  if (Object.keys(updateValues).length === 0) {
    return null;
  }

  const [updated] = await db
    .update(extractionRun)
    .set(updateValues)
    .where(
      and(
        eq(extractionRun.id, input.extractionId),
        eq(extractionRun.ownerId, input.ownerId),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function listExtractionRunsForOwner(ownerId: string, limit = 20) {
  return db.query.extractionRun.findMany({
    where: eq(extractionRun.ownerId, ownerId),
    orderBy: desc(extractionRun.createdAt),
    limit,
    with: {
      model: {
        columns: {
          name: true,
        },
      },
      modelVersion: {
        columns: {
          versionNumber: true,
        },
      },
    },
  });
}

export async function getExtractionRunForOwner(
  ownerId: string,
  extractionId: string,
) {
  return db.query.extractionRun.findFirst({
    where: and(
      eq(extractionRun.id, extractionId),
      eq(extractionRun.ownerId, ownerId),
    ),
    with: {
      model: {
        columns: {
          name: true,
        },
      },
      modelVersion: {
        columns: {
          versionNumber: true,
        },
      },
      errors: {
        orderBy: desc(extractionError.occurredAt),
        limit: 1,
      },
      deliveries: {
        with: {
          target: {
            columns: {
              name: true,
              type: true,
            },
          },
        },
        orderBy: asc(integrationDelivery.createdAt),
      },
      inputs: {
        orderBy: asc(extractionInput.sourceOrder),
      },
    },
  });
}

export async function setExtractionError(input: ExtractionErrorInput) {
  await db.transaction(async (tx: DbTransaction) => {
    await tx
      .delete(extractionError)
      .where(eq(extractionError.extractionId, input.extractionId));

    await tx.insert(extractionError).values({
      id: crypto.randomUUID(),
      extractionId: input.extractionId,
      ownerId: input.ownerId,
      message: input.message,
      occurredAt: input.occurredAt ?? new Date(),
    });
  });
}

export async function withExtractionTransaction(
  callback: (tx: DbTransaction) => Promise<void>,
) {
  await db.transaction(callback);
}
