import {
  createModelVersionForOwner,
  createModelWithInitialVersion,
  deleteModelForOwner,
  getActiveModelVersionForOwner,
  getModelWithVersions,
  listModelsForOwner,
  listModelVersionsForOwner,
  setActiveModelVersionForOwner,
  updateModelInfo,
  updateModelVersionForOwner,
} from "@extractify/db/models";
import { AttributeListSchema } from "@extractify/shared/attribute-model";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUserId } from "@/lib/server/require-user-id";

type ModelVersionSummary = {
  isActive: boolean;
  versionNumber: number;
};

type ModelWithVersions = {
  versions: ModelVersionSummary[];
} & Record<string, unknown>;

const CreateModelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  attributes: AttributeListSchema,
  changelog: z.string().optional(),
});

const UpdateModelSchema = z
  .object({
    modelId: z.string().min(1),
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "No updates provided.",
  });

const DeleteModelSchema = z.object({
  modelId: z.string().min(1),
});

const GetModelSchema = z.object({
  modelId: z.string().min(1),
});

const CreateModelVersionSchema = z.object({
  modelId: z.string().min(1),
  attributes: AttributeListSchema,
  changelog: z.string().optional(),
  setActive: z.boolean().optional(),
});

const UpdateModelVersionSchema = z
  .object({
    versionId: z.string().min(1),
    attributes: AttributeListSchema.optional(),
    changelog: z.string().nullable().optional(),
    setActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.attributes !== undefined ||
      data.changelog !== undefined ||
      data.setActive !== undefined,
    { message: "No updates provided." },
  );

const ListModelVersionsSchema = z.object({
  modelId: z.string().min(1),
});

const SetActiveModelVersionSchema = z.object({
  versionId: z.string().min(1),
});

const GetActiveModelVersionSchema = z.object({
  modelId: z.string().min(1),
});

export const listModels = createServerFn({ method: "GET" }).handler(
  async () => {
    const ownerId = await requireUserId();
    const models = await listModelsForOwner(ownerId);

    return models.map((model: ModelWithVersions) => {
      const activeVersion = model.versions.find(
        (version: ModelVersionSummary) => version.isActive,
      );
      const latestVersionNumber = model.versions.reduce(
        (latest: number, version: ModelVersionSummary) =>
          Math.max(latest, version.versionNumber),
        0,
      );

      return {
        ...model,
        activeVersion: activeVersion || null,
        latestVersionNumber,
        versionCount: model.versions.length,
      };
    });
  },
);

export const getModel = createServerFn({ method: "POST" })
  .inputValidator(GetModelSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const model = await getModelWithVersions(ownerId, data.modelId);

    if (!model) {
      throw new Error("Model not found");
    }

    const versions = [...model.versions].sort(
      (a, b) => b.versionNumber - a.versionNumber,
    );

    return {
      ...model,
      versions,
    };
  });

export const createModel = createServerFn({ method: "POST" })
  .inputValidator(CreateModelSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    return createModelWithInitialVersion({
      ownerId,
      name: data.name,
      description: data.description,
      attributes: data.attributes,
      changelog: data.changelog,
    });
  });

export const updateModel = createServerFn({ method: "POST" })
  .inputValidator(UpdateModelSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const updated = await updateModelInfo({
      ownerId,
      modelId: data.modelId,
      name: data.name,
      description: data.description,
    });

    if (!updated) {
      throw new Error("Model not found");
    }

    return updated;
  });

export const deleteModel = createServerFn({ method: "POST" })
  .inputValidator(DeleteModelSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const deleted = await deleteModelForOwner(ownerId, data.modelId);

    if (!deleted) {
      throw new Error("Model not found");
    }

    return { success: true };
  });

export const listModelVersions = createServerFn({ method: "POST" })
  .inputValidator(ListModelVersionsSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const versions = await listModelVersionsForOwner(ownerId, data.modelId);

    if (!versions) {
      throw new Error("Model not found");
    }

    return versions;
  });

export const createModelVersion = createServerFn({ method: "POST" })
  .inputValidator(CreateModelVersionSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const created = await createModelVersionForOwner({
      ownerId,
      modelId: data.modelId,
      attributes: data.attributes,
      changelog: data.changelog,
      setActive: data.setActive ?? true,
    });

    if (!created) {
      throw new Error("Model not found");
    }

    return created;
  });

export const updateModelVersion = createServerFn({ method: "POST" })
  .inputValidator(UpdateModelVersionSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const updated = await updateModelVersionForOwner({
      ownerId,
      versionId: data.versionId,
      attributes: data.attributes,
      changelog: data.changelog,
      setActive: data.setActive,
    });

    if (!updated) {
      throw new Error("Model version not found");
    }

    return updated;
  });

export const setActiveModelVersion = createServerFn({ method: "POST" })
  .inputValidator(SetActiveModelVersionSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const updated = await setActiveModelVersionForOwner(
      ownerId,
      data.versionId,
    );

    if (!updated) {
      throw new Error("Model version not found");
    }

    return { success: true };
  });

export const getActiveModelVersion = createServerFn({ method: "POST" })
  .inputValidator(GetActiveModelVersionSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const activeVersion = await getActiveModelVersionForOwner(
      ownerId,
      data.modelId,
    );

    if (!activeVersion) {
      throw new Error("Model not found");
    }

    return activeVersion;
  });
