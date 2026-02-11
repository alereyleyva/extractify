import crypto from "node:crypto";
import { getExtractionRunForOwner } from "@extractify/db/extractions";
import {
  createIntegrationDeliveries,
  type IntegrationTargetType,
  listEnabledIntegrationTargetsForOwner,
  updateIntegrationDelivery,
} from "@extractify/db/integrations";
import { WebhookConfigSchema } from "@extractify/shared/integrations";
import { decryptIntegrationSecret } from "./secrets";
import { deliverSheetsTarget } from "./sheets-deliver";

type DeliveryTarget = {
  id: string;
  ownerId: string;
  type: IntegrationTargetType;
  name: string;
  config: Record<string, unknown>;
};

type WebhookDeliveryTarget = DeliveryTarget & { type: "webhook" };
type SheetsDeliveryTarget = DeliveryTarget & { type: "sheets" };
type DeliverableTarget = WebhookDeliveryTarget | SheetsDeliveryTarget;

type DeliveryAttempt = {
  ok: boolean;
  status: number | null;
  errorMessage?: string;
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
  target: WebhookDeliveryTarget,
  payload: ExtractionPayload,
): Promise<DeliveryAttempt> {
  const parsed = WebhookConfigSchema.safeParse(target.config);
  if (!parsed.success) {
    return {
      ok: false,
      status: null,
      errorMessage: "Invalid webhook configuration",
    };
  }

  const config = parsed.data;
  const body = JSON.stringify(payload);
  const headers = new Headers({
    "Content-Type": "application/json",
    ...config.headers,
  });

  if (config.secret) {
    const secret = decryptIntegrationSecret(config.secret);
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
      errorMessage: response.ok
        ? undefined
        : "Webhook endpoint returned an error status",
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      errorMessage:
        error instanceof Error ? error.message : "Webhook delivery failed",
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
  const allTargets = (await listEnabledIntegrationTargetsForOwner(
    input.ownerId,
  )) as DeliveryTarget[];

  const targetIds = input.targetIds;
  const selectedTargets = targetIds
    ? allTargets.filter((target) => targetIds.includes(target.id))
    : allTargets;
  const deliverableTargets = selectedTargets.filter(
    (target): target is DeliverableTarget =>
      target.type === "webhook" || target.type === "sheets",
  );

  if (deliverableTargets.length === 0) {
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

  const webhookPayload = buildExtractionPayload({
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
    deliverableTargets.map((target) => ({
      targetId: target.id,
      extractionId: extraction.id,
    })),
  );

  await Promise.all(
    deliveries.map(async (delivery) => {
      const target = deliverableTargets.find(
        (item) => item.id === delivery.targetId,
      );
      if (!target) {
        await updateIntegrationDelivery({
          deliveryId: delivery.id,
          status: "failed",
          errorMessage: "Target not found",
        });
        return;
      }

      await updateIntegrationDelivery({
        deliveryId: delivery.id,
        status: "processing",
      });

      let result: DeliveryAttempt;
      if (target.type === "webhook") {
        result = await deliverWebhook(target, webhookPayload);
      } else if (target.type === "sheets") {
        result = await deliverSheetsTarget({
          target,
          extraction: {
            id: extraction.id,
            ownerId: extraction.ownerId,
            modelId: extraction.modelId,
            modelVersionId: extraction.modelVersionId,
            result: extraction.result as Record<string, unknown> | null,
          },
        });
      } else {
        result = {
          ok: false,
          status: null,
          errorMessage: "Integration type is not supported",
        };
      }

      await updateIntegrationDelivery({
        deliveryId: delivery.id,
        status: result.ok ? "succeeded" : "failed",
        responseStatus: result.status,
        errorMessage: result.errorMessage ?? null,
      });
    }),
  );
}
