import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { attributeModel, attributeModelVersion } from "./schema/models";

type DbTransaction = Parameters<typeof db.transaction>[0] extends (
  tx: infer T,
) => unknown
  ? T
  : never;

export type CreateModelInput = {
  ownerId: string;
  name: string;
  description?: string;
  attributes: typeof attributeModelVersion.$inferInsert.attributes;
  changelog?: string;
};

export type CreateModelVersionInput = {
  ownerId: string;
  modelId: string;
  attributes: typeof attributeModelVersion.$inferInsert.attributes;
  changelog?: string;
  setActive: boolean;
};

export type UpdateModelInput = {
  ownerId: string;
  modelId: string;
  name?: string;
  description?: string | null;
};

export type UpdateModelVersionInput = {
  ownerId: string;
  versionId: string;
  attributes?: typeof attributeModelVersion.$inferInsert.attributes;
  changelog?: string | null;
  setActive?: boolean;
};

export async function listModelsForOwner(ownerId: string) {
  return db.query.attributeModel.findMany({
    where: eq(attributeModel.ownerId, ownerId),
    orderBy: desc(attributeModel.updatedAt),
    with: {
      versions: {
        columns: {
          isActive: true,
          versionNumber: true,
        },
      },
    },
  });
}

export async function getModelWithVersions(ownerId: string, modelId: string) {
  return db.query.attributeModel.findFirst({
    where: and(
      eq(attributeModel.id, modelId),
      eq(attributeModel.ownerId, ownerId),
    ),
    with: {
      versions: true,
    },
  });
}

export async function getActiveModelVersionForOwner(
  ownerId: string,
  modelId: string,
) {
  const model = await db.query.attributeModel.findFirst({
    where: and(
      eq(attributeModel.id, modelId),
      eq(attributeModel.ownerId, ownerId),
    ),
    columns: {
      id: true,
      name: true,
    },
    with: {
      versions: {
        where: eq(attributeModelVersion.isActive, true),
        limit: 1,
      },
    },
  });

  if (!model || model.versions.length === 0) {
    return null;
  }

  const activeVersion = model.versions[0];

  return {
    modelId: model.id,
    modelName: model.name,
    versionId: activeVersion?.id,
    versionNumber: activeVersion?.versionNumber,
    attributes: activeVersion?.attributes,
  };
}

export async function getModelVersionById(versionId: string) {
  const version = await db.query.attributeModelVersion.findFirst({
    where: eq(attributeModelVersion.id, versionId),
    with: {
      model: {
        columns: {
          name: true,
        },
      },
    },
  });

  if (!version) {
    return null;
  }

  return {
    versionId: version.id,
    modelId: version.modelId,
    modelName: version.model.name,
    versionNumber: version.versionNumber,
    attributes: version.attributes,
  };
}

export async function createModelWithInitialVersion(input: CreateModelInput) {
  const modelId = crypto.randomUUID();
  const versionId = crypto.randomUUID();

  await db.transaction(async (tx: DbTransaction) => {
    await tx.insert(attributeModel).values({
      id: modelId,
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
    });

    await tx.insert(attributeModelVersion).values({
      id: versionId,
      modelId,
      versionNumber: 1,
      changelog: input.changelog,
      attributes: input.attributes,
      isActive: true,
    });
  });

  return {
    modelId,
    versionId,
    versionNumber: 1,
  };
}

export async function updateModelInfo(input: UpdateModelInput) {
  const updateValues: Partial<typeof attributeModel.$inferInsert> = {};

  if (input.name !== undefined) {
    updateValues.name = input.name;
  }

  if (input.description !== undefined) {
    updateValues.description = input.description;
  }

  if (Object.keys(updateValues).length === 0) {
    return null;
  }

  const [updated] = await db
    .update(attributeModel)
    .set(updateValues)
    .where(
      and(
        eq(attributeModel.id, input.modelId),
        eq(attributeModel.ownerId, input.ownerId),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function deleteModelForOwner(ownerId: string, modelId: string) {
  const [deleted] = await db
    .delete(attributeModel)
    .where(
      and(eq(attributeModel.id, modelId), eq(attributeModel.ownerId, ownerId)),
    )
    .returning();

  return Boolean(deleted);
}

export async function listModelVersionsForOwner(
  ownerId: string,
  modelId: string,
) {
  const model = await db.query.attributeModel.findFirst({
    where: and(
      eq(attributeModel.id, modelId),
      eq(attributeModel.ownerId, ownerId),
    ),
    columns: {
      id: true,
    },
  });

  if (!model) {
    return null;
  }

  return db.query.attributeModelVersion.findMany({
    where: eq(attributeModelVersion.modelId, modelId),
    orderBy: desc(attributeModelVersion.versionNumber),
  });
}

export async function createModelVersionForOwner(
  input: CreateModelVersionInput,
) {
  const model = await db.query.attributeModel.findFirst({
    where: and(
      eq(attributeModel.id, input.modelId),
      eq(attributeModel.ownerId, input.ownerId),
    ),
    columns: {
      id: true,
    },
  });

  if (!model) {
    return null;
  }

  const [latestVersion] = await db
    .select({ versionNumber: attributeModelVersion.versionNumber })
    .from(attributeModelVersion)
    .where(eq(attributeModelVersion.modelId, input.modelId))
    .orderBy(desc(attributeModelVersion.versionNumber))
    .limit(1);

  const versionNumber = (latestVersion?.versionNumber ?? 0) + 1;
  const versionId = crypto.randomUUID();

  await db.transaction(async (tx: DbTransaction) => {
    if (input.setActive) {
      await tx
        .update(attributeModelVersion)
        .set({ isActive: false })
        .where(eq(attributeModelVersion.modelId, input.modelId));
    }

    await tx.insert(attributeModelVersion).values({
      id: versionId,
      modelId: input.modelId,
      versionNumber,
      changelog: input.changelog,
      attributes: input.attributes,
      isActive: input.setActive,
    });
  });

  return {
    versionId,
    versionNumber,
    isActive: input.setActive,
  };
}

export async function updateModelVersionForOwner(
  input: UpdateModelVersionInput,
) {
  const version = await db.query.attributeModelVersion.findFirst({
    where: eq(attributeModelVersion.id, input.versionId),
    with: {
      model: true,
    },
  });

  if (!version || version.model.ownerId !== input.ownerId) {
    return null;
  }

  const updateValues: Partial<typeof attributeModelVersion.$inferInsert> = {};

  if (input.attributes !== undefined) {
    updateValues.attributes = input.attributes;
  }

  if (input.changelog !== undefined) {
    updateValues.changelog = input.changelog;
  }

  if (input.setActive !== undefined) {
    updateValues.isActive = input.setActive;
  }

  if (Object.keys(updateValues).length === 0) {
    return version;
  }

  const [updated] = await db.transaction(async (tx: DbTransaction) => {
    if (input.setActive) {
      await tx
        .update(attributeModelVersion)
        .set({ isActive: false })
        .where(eq(attributeModelVersion.modelId, version.modelId));
    }

    return tx
      .update(attributeModelVersion)
      .set(updateValues)
      .where(eq(attributeModelVersion.id, input.versionId))
      .returning();
  });

  return updated ?? null;
}

export async function setActiveModelVersionForOwner(
  ownerId: string,
  versionId: string,
) {
  const version = await db.query.attributeModelVersion.findFirst({
    where: eq(attributeModelVersion.id, versionId),
    with: {
      model: true,
    },
  });

  if (!version || version.model.ownerId !== ownerId) {
    return false;
  }

  await db.transaction(async (tx: DbTransaction) => {
    await tx
      .update(attributeModelVersion)
      .set({ isActive: false })
      .where(eq(attributeModelVersion.modelId, version.modelId));

    await tx
      .update(attributeModelVersion)
      .set({ isActive: true })
      .where(eq(attributeModelVersion.id, versionId));
  });

  return true;
}
