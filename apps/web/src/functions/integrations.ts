import {
  createIntegrationTarget,
  deleteIntegrationTargetForOwner,
  getIntegrationTargetForOwner,
  listIntegrationTargetsForOwner,
  updateIntegrationTargetForOwner,
} from "@extractify/db/integrations";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  type IntegrationTarget,
  type IntegrationTargetConfig,
  WebhookConfigSchema,
} from "@/lib/integrations/types";
import { encryptSecret } from "@/lib/server/integration-secrets";
import { requireUserId } from "@/lib/server/require-user-id";

const CreateWebhookIntegrationSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  method: z.enum(["POST", "PUT", "PATCH"]).default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  secret: z.string().optional(),
  enabled: z.boolean().optional(),
});

const UpdateIntegrationSchema = z
  .object({
    targetId: z.string().min(1),
    name: z.string().min(1).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.enabled !== undefined, {
    message: "No updates provided.",
  });

const GetIntegrationSchema = z.object({
  targetId: z.string().min(1),
});

const UpdateWebhookIntegrationSchema = z
  .object({
    targetId: z.string().min(1),
    name: z.string().min(1).optional(),
    enabled: z.boolean().optional(),
    url: z.string().url().optional(),
    method: z.enum(["POST", "PUT", "PATCH"]).optional(),
    secret: z.string().optional(),
    clearSecret: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.enabled !== undefined ||
      data.url !== undefined ||
      data.method !== undefined ||
      data.secret !== undefined ||
      data.clearSecret !== undefined,
    { message: "No updates provided." },
  );

const DeleteIntegrationSchema = z.object({
  targetId: z.string().min(1),
});

type IntegrationTargetResponse = IntegrationTarget;

const EMPTY_CONFIG: IntegrationTargetConfig = {};

function mapIntegrationTarget(
  target: Awaited<ReturnType<typeof listIntegrationTargetsForOwner>>[number],
): IntegrationTargetResponse {
  if (target.type === "webhook") {
    const parsed = WebhookConfigSchema.safeParse(target.config);
    if (!parsed.success) {
      return {
        id: target.id,
        name: target.name,
        type: target.type,
        enabled: target.enabled,
        config: EMPTY_CONFIG,
        hasSecret: false,
      };
    }
    const { secret, ...safeConfig } = parsed.data;
    return {
      id: target.id,
      name: target.name,
      type: target.type,
      enabled: target.enabled,
      config: safeConfig,
      hasSecret: Boolean(secret),
    };
  }

  return {
    id: target.id,
    name: target.name,
    type: target.type,
    enabled: target.enabled,
    config: EMPTY_CONFIG,
    hasSecret: false,
  };
}

export const listIntegrationTargets = createServerFn({ method: "GET" }).handler(
  async (): Promise<IntegrationTargetResponse[]> => {
    const ownerId = await requireUserId();
    const targets = await listIntegrationTargetsForOwner(ownerId);

    return targets.map((target) => mapIntegrationTarget(target));
  },
);

export const getIntegrationTarget = createServerFn({ method: "POST" })
  .inputValidator(GetIntegrationSchema)
  .handler(async ({ data }): Promise<IntegrationTargetResponse> => {
    const ownerId = await requireUserId();
    const target = await getIntegrationTargetForOwner(ownerId, data.targetId);

    if (!target) {
      throw new Error("Integration not found");
    }

    return mapIntegrationTarget(target);
  });

export const createWebhookIntegration = createServerFn({ method: "POST" })
  .inputValidator(CreateWebhookIntegrationSchema)
  .handler(
    async ({
      data,
    }: {
      data: z.infer<typeof CreateWebhookIntegrationSchema>;
    }) => {
      const ownerId = await requireUserId();
      const config = WebhookConfigSchema.parse({
        url: data.url,
        method: data.method,
        headers: data.headers ?? {},
        secret: data.secret ? encryptSecret(data.secret) : null,
      });

      const created = await createIntegrationTarget({
        ownerId,
        type: "webhook",
        name: data.name,
        enabled: data.enabled ?? true,
        config,
      });

      if (!created) {
        throw new Error("Unable to create integration");
      }

      return { id: created.id };
    },
  );

export const updateWebhookIntegration = createServerFn({ method: "POST" })
  .inputValidator(UpdateWebhookIntegrationSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const target = await getIntegrationTargetForOwner(ownerId, data.targetId);

    if (!target) {
      throw new Error("Integration not found");
    }

    if (target.type !== "webhook") {
      throw new Error("Only webhook integrations can be updated");
    }

    const currentConfig = WebhookConfigSchema.safeParse(target.config);
    if (!currentConfig.success && !data.url) {
      throw new Error("Integration config is invalid");
    }

    const fallbackConfig = {
      url: data.url ?? "",
      method: data.method ?? "POST",
      headers: {},
      timeoutMs: 10_000,
      secret: null,
    };

    const resolvedConfig = currentConfig.success
      ? currentConfig.data
      : fallbackConfig;

    let nextSecret = resolvedConfig.secret ?? null;
    if (data.clearSecret) {
      nextSecret = null;
    } else if (data.secret) {
      nextSecret = encryptSecret(data.secret);
    }

    const nextConfig = WebhookConfigSchema.parse({
      url: data.url ?? resolvedConfig.url,
      method: data.method ?? resolvedConfig.method,
      headers: resolvedConfig.headers,
      timeoutMs: resolvedConfig.timeoutMs,
      secret: nextSecret,
    });

    const updated = await updateIntegrationTargetForOwner({
      ownerId,
      targetId: data.targetId,
      name: data.name,
      enabled: data.enabled,
      config: nextConfig,
    });

    if (!updated) {
      throw new Error("Integration not found");
    }

    return { success: true };
  });

export const updateIntegrationTarget = createServerFn({ method: "POST" })
  .inputValidator(UpdateIntegrationSchema)
  .handler(
    async ({ data }: { data: z.infer<typeof UpdateIntegrationSchema> }) => {
      const ownerId = await requireUserId();
      const updated = await updateIntegrationTargetForOwner({
        ownerId,
        targetId: data.targetId,
        name: data.name,
        enabled: data.enabled,
      });

      if (!updated) {
        throw new Error("Integration not found");
      }

      return { success: true };
    },
  );

export const deleteIntegrationTarget = createServerFn({ method: "POST" })
  .inputValidator(DeleteIntegrationSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const deleted = await deleteIntegrationTargetForOwner(
      ownerId,
      data.targetId,
    );

    if (!deleted) {
      throw new Error("Integration not found");
    }

    return { success: true };
  });
