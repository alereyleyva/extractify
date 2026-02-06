import crypto from "node:crypto";
import { getExtractionRunForOwner } from "@extractify/db/extractions";
import {
  createIntegrationDeliveries,
  type IntegrationTargetType,
  listEnabledIntegrationTargetsForOwner,
  updateIntegrationDelivery,
} from "@extractify/db/integrations";
import { env } from "@extractify/env/server";
import { z } from "zod";

const EncryptedSecretSchema = z.object({
  version: z.literal("v1"),
  algorithm: z.literal("aes-256-gcm"),
  iv: z.string().min(1),
  tag: z.string().min(1),
  data: z.string().min(1),
});

type EncryptedSecret = z.infer<typeof EncryptedSecretSchema>;

const WebhookConfigSchema = z.object({
  url: z.url(),
  method: z.enum(["POST", "PUT", "PATCH"]).default("POST"),
  headers: z.record(z.string(), z.string()).default({}),
  timeoutMs: z.number().int().positive().default(10_000),
  secret: EncryptedSecretSchema.optional().nullable(),
});

type DeliveryTarget = {
  id: string;
  ownerId: string;
  type: IntegrationTargetType;
  name: string;
  config: Record<string, unknown>;
};

type ExtractionPayload = {
  event: "extraction.completed";
  version: "v1";
  extraction: {
    id: string;
    modelId: string;
    modelVersionId: string;
    llmModelId: string;
    createdAt: string;
    completedAt: string;
    status: "completed";
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    } | null;
  };
  result: Record<string, unknown> | null;
};

const KEY_LENGTH = 32;

function getIntegrationKey(): Buffer {
  const key = Buffer.from(env.INTEGRATION_SECRETS_KEY, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error("INTEGRATION_SECRETS_KEY must be 32 bytes base64");
  }
  return key;
}

function decryptSecret(payload: EncryptedSecret): string {
  const key = getIntegrationKey();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const encrypted = Buffer.from(payload.data, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function buildExtractionPayload(input: {
  extractionId: string;
  modelId: string;
  modelVersionId: string;
  llmModelId: string;
  createdAt: Date;
  completedAt: Date;
  result: Record<string, unknown> | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
  } | null;
}): ExtractionPayload {
  return {
    event: "extraction.completed",
    version: "v1",
    extraction: {
      id: input.extractionId,
      modelId: input.modelId,
      modelVersionId: input.modelVersionId,
      llmModelId: input.llmModelId,
      createdAt: input.createdAt.toISOString(),
      completedAt: input.completedAt.toISOString(),
      status: "completed",
      usage: input.usage
        ? {
            inputTokens: input.usage.inputTokens,
            outputTokens: input.usage.outputTokens,
            totalTokens: input.usage.inputTokens + input.usage.outputTokens,
          }
        : null,
    },
    result: input.result,
  };
}

async function deliverWebhook(
  target: DeliveryTarget,
  payload: ExtractionPayload,
): Promise<{ ok: boolean; status: number | null }> {
  const parsed = WebhookConfigSchema.safeParse(target.config);
  if (!parsed.success) {
    return { ok: false, status: null };
  }

  const config = parsed.data;
  const body = JSON.stringify(payload);
  const headers = new Headers({
    "Content-Type": "application/json",
    ...config.headers,
  });

  if (config.secret) {
    const secret = decryptSecret(config.secret);
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    headers.set("X-Extractify-Signature", signature);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.url, {
      method: config.method,
      headers,
      body,
      signal: controller.signal,
    });
    await response.text();

    return {
      ok: response.ok,
      status: response.status,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function deliverIntegrations(input: {
  ownerId: string;
  extractionId: string;
  targetIds?: string[];
}): Promise<void> {
  const targets = (await listEnabledIntegrationTargetsForOwner(
    input.ownerId,
    "webhook",
  )) as DeliveryTarget[];

  const targetIds = input.targetIds;
  const filteredTargets = targetIds
    ? targets.filter((target) => targetIds.includes(target.id))
    : targets;

  if (filteredTargets.length === 0) {
    return;
  }

  const extraction = await getExtractionRunForOwner(
    input.ownerId,
    input.extractionId,
  );

  if (!extraction || extraction.status !== "completed") {
    console.warn(
      `[worker] Cannot deliver integrations for non-completed extraction ${input.extractionId}`,
    );
    return;
  }

  const payload = buildExtractionPayload({
    extractionId: extraction.id,
    modelId: extraction.modelId,
    modelVersionId: extraction.modelVersionId,
    llmModelId: extraction.llmModelId,
    createdAt: extraction.createdAt,
    completedAt: extraction.completedAt ?? new Date(),
    result: extraction.result as Record<string, unknown> | null,
    usage: extraction.usage,
  });

  const deliveries = await createIntegrationDeliveries(
    filteredTargets.map((target) => ({
      targetId: target.id,
      extractionId: extraction.id,
    })),
  );

  await Promise.all(
    deliveries.map(async (delivery) => {
      const target = filteredTargets.find(
        (item) => item.id === delivery.targetId,
      );
      if (!target) {
        await updateIntegrationDelivery({
          deliveryId: delivery.id,
          status: "failed",
        });
        return;
      }

      try {
        const result = await deliverWebhook(target, payload);

        await updateIntegrationDelivery({
          deliveryId: delivery.id,
          status: result.ok ? "succeeded" : "failed",
          responseStatus: result.status,
        });
      } catch (_error) {
        await updateIntegrationDelivery({
          deliveryId: delivery.id,
          status: "failed",
        });
      }
    }),
  );
}
