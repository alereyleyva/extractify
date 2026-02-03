import {
  createIntegrationTarget,
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

type IntegrationTargetResponse = IntegrationTarget;

const EMPTY_CONFIG: IntegrationTargetConfig = {};

export const listIntegrationTargets = createServerFn({ method: "GET" }).handler(
  async (): Promise<IntegrationTargetResponse[]> => {
    const ownerId = await requireUserId();
    const targets = await listIntegrationTargetsForOwner(ownerId);

    return targets.map((target) => {
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
    });
  },
);

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
