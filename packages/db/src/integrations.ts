import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { integrationDelivery, integrationTarget } from "./schema/integrations";

export type IntegrationTargetType = "webhook" | "sheets" | "postgres";
export type IntegrationDeliveryStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed";

export type CreateIntegrationTargetInput = {
  ownerId: string;
  type: IntegrationTargetType;
  name: string;
  enabled?: boolean;
  config: Record<string, unknown>;
};

export type CreateIntegrationDeliveryInput = {
  targetId: string;
  extractionId: string;
};

export type UpdateIntegrationDeliveryInput = {
  deliveryId: string;
  status?: IntegrationDeliveryStatus;
  responseStatus?: number | null;
  errorMessage?: string | null;
};

export async function createIntegrationTarget(
  input: CreateIntegrationTargetInput,
) {
  const [created] = await db
    .insert(integrationTarget)
    .values({
      id: crypto.randomUUID(),
      ownerId: input.ownerId,
      type: input.type,
      name: input.name,
      enabled: input.enabled ?? true,
      config: input.config,
    })
    .returning();

  return created ?? null;
}

export async function listEnabledIntegrationTargetsForOwner(
  ownerId: string,
  type?: IntegrationTargetType,
) {
  return db.query.integrationTarget.findMany({
    where: type
      ? and(
          eq(integrationTarget.ownerId, ownerId),
          eq(integrationTarget.enabled, true),
          eq(integrationTarget.type, type),
        )
      : and(
          eq(integrationTarget.ownerId, ownerId),
          eq(integrationTarget.enabled, true),
        ),
    orderBy: desc(integrationTarget.createdAt),
  });
}

export async function listIntegrationTargetsForOwner(ownerId: string) {
  return db.query.integrationTarget.findMany({
    where: eq(integrationTarget.ownerId, ownerId),
    orderBy: desc(integrationTarget.createdAt),
  });
}

export async function getIntegrationTargetForOwner(
  ownerId: string,
  targetId: string,
) {
  const target = await db.query.integrationTarget.findFirst({
    where: and(
      eq(integrationTarget.ownerId, ownerId),
      eq(integrationTarget.id, targetId),
    ),
  });

  return target ?? null;
}

export async function updateIntegrationTargetForOwner(input: {
  ownerId: string;
  targetId: string;
  name?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}) {
  const updateValues: Partial<typeof integrationTarget.$inferInsert> = {};

  if (input.name !== undefined) {
    updateValues.name = input.name;
  }

  if (input.enabled !== undefined) {
    updateValues.enabled = input.enabled;
  }

  if (input.config !== undefined) {
    updateValues.config = input.config;
  }

  if (Object.keys(updateValues).length === 0) {
    return null;
  }

  const [updated] = await db
    .update(integrationTarget)
    .set(updateValues)
    .where(
      and(
        eq(integrationTarget.id, input.targetId),
        eq(integrationTarget.ownerId, input.ownerId),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function deleteIntegrationTargetForOwner(
  ownerId: string,
  targetId: string,
) {
  const [deleted] = await db
    .delete(integrationTarget)
    .where(
      and(
        eq(integrationTarget.id, targetId),
        eq(integrationTarget.ownerId, ownerId),
      ),
    )
    .returning();

  return Boolean(deleted);
}

export async function createIntegrationDeliveries(
  inputs: CreateIntegrationDeliveryInput[],
) {
  if (inputs.length === 0) {
    return [];
  }

  return db
    .insert(integrationDelivery)
    .values(
      inputs.map((input) => ({
        id: crypto.randomUUID(),
        targetId: input.targetId,
        extractionId: input.extractionId,
        status: "pending" as const,
      })),
    )
    .returning();
}

export async function updateIntegrationDelivery(
  input: UpdateIntegrationDeliveryInput,
) {
  const updateValues: Partial<typeof integrationDelivery.$inferInsert> = {};

  if (input.status !== undefined) {
    updateValues.status = input.status;
  }

  if (input.responseStatus !== undefined) {
    updateValues.responseStatus = input.responseStatus;
  }

  if (input.errorMessage !== undefined) {
    updateValues.errorMessage = input.errorMessage;
  }

  if (Object.keys(updateValues).length === 0) {
    return null;
  }

  const [updated] = await db
    .update(integrationDelivery)
    .set(updateValues)
    .where(eq(integrationDelivery.id, input.deliveryId))
    .returning();

  return updated ?? null;
}
