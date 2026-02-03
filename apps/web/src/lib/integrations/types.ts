import { z } from "zod";

export const EncryptedSecretSchema = z.object({
  version: z.literal("v1"),
  algorithm: z.literal("aes-256-gcm"),
  iv: z.string().min(1),
  tag: z.string().min(1),
  data: z.string().min(1),
});

export type EncryptedSecret = z.infer<typeof EncryptedSecretSchema>;

export const WebhookConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(["POST", "PUT", "PATCH"]).default("POST"),
  headers: z.record(z.string(), z.string()).default({}),
  timeoutMs: z.number().int().positive().default(10_000),
  secret: EncryptedSecretSchema.optional().nullable(),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

export type IntegrationTargetType = "webhook" | "sheets" | "postgres";

export type IntegrationTargetConfig = {
  url?: string;
  method?: "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export type IntegrationTarget = {
  id: string;
  name: string;
  type: IntegrationTargetType;
  enabled: boolean;
  config: IntegrationTargetConfig;
  hasSecret: boolean;
};

export type IntegrationDeliveryStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed";

export type IntegrationDeliveryResult = {
  targetId: string;
  name: string;
  type: IntegrationTargetType;
  status: "succeeded" | "failed";
  responseStatus?: number | null;
};

export type IntegrationDeliverySummary = {
  targetId: string;
  name: string;
  type: IntegrationTargetType;
  status: IntegrationDeliveryStatus;
  responseStatus?: number | null;
};
