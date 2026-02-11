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

export const SheetsTransformSchema = z.enum([
  "raw",
  "json",
  "join",
  "date_iso",
]);
export type SheetsTransform = z.infer<typeof SheetsTransformSchema>;

export const SheetsColumnMappingSchema = z
  .object({
    columnName: z.string().min(1),
    sourcePath: z.string().min(1),
    transform: SheetsTransformSchema.default("raw"),
    joinWith: z.string().optional(),
    fallback: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.transform === "join" && !value.joinWith) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "joinWith is required when transform is join",
        path: ["joinWith"],
      });
    }
  });

export type SheetsColumnMapping = z.infer<typeof SheetsColumnMappingSchema>;

export const SheetsModelMappingSchema = z.object({
  modelId: z.string().min(1),
  modelVersionId: z.string().min(1),
  columns: z.array(SheetsColumnMappingSchema).min(1),
});

export type SheetsModelMapping = z.infer<typeof SheetsModelMappingSchema>;

export const SheetsOAuthSchema = z.object({
  provider: z.literal("google").default("google"),
  accountEmail: z.string().email().optional(),
  scopes: z.array(z.string()).default([]),
  refreshToken: EncryptedSecretSchema,
  accessToken: EncryptedSecretSchema.optional().nullable(),
  accessTokenExpiresAt: z.number().int().positive().optional().nullable(),
});

export type SheetsOAuth = z.infer<typeof SheetsOAuthSchema>;

export const SheetsConfigSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().min(1),
  headerRow: z.number().int().positive().default(1),
  writeMode: z.literal("append").default("append"),
  columnPolicy: z.literal("auto_add").default("auto_add"),
  oauth: SheetsOAuthSchema.optional().nullable(),
  modelMappings: z.array(SheetsModelMappingSchema).min(1),
});

export type SheetsConfig = z.infer<typeof SheetsConfigSchema>;

export const IntegrationTargetTypeSchema = z.enum([
  "webhook",
  "sheets",
  "postgres",
]);

export type IntegrationTargetType = z.infer<typeof IntegrationTargetTypeSchema>;

export const IntegrationDeliveryStatusSchema = z.enum([
  "pending",
  "processing",
  "succeeded",
  "failed",
]);

export type IntegrationDeliveryStatus = z.infer<
  typeof IntegrationDeliveryStatusSchema
>;

export function normalizeExtractionResult(
  result: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!result) {
    return {};
  }

  const normalized: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(result)) {
    if (
      rawValue &&
      typeof rawValue === "object" &&
      "value" in rawValue &&
      Object.hasOwn(rawValue, "value")
    ) {
      normalized[key] = (rawValue as { value?: unknown }).value ?? null;
      continue;
    }
    normalized[key] = rawValue;
  }

  return normalized;
}

export function getValueByPath(
  source: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  let current: unknown = source;
  for (const part of parts) {
    if (current == null) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(part);
      if (Number.isInteger(index)) {
        current = current[index];
        continue;
      }

      const projected = current
        .map((item) => {
          if (item == null || typeof item !== "object") {
            return undefined;
          }
          return (item as Record<string, unknown>)[part];
        })
        .filter((value) => value !== undefined);
      current = projected;
      continue;
    }

    if (typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function applySheetsTransform(
  value: unknown,
  column: SheetsColumnMapping,
): string {
  if (value == null || value === "") {
    return column.fallback ?? "";
  }

  if (column.transform === "json") {
    return JSON.stringify(value);
  }

  if (column.transform === "join") {
    if (!Array.isArray(value)) {
      return column.fallback ?? "";
    }
    return value
      .map((item) => String(item ?? ""))
      .join(column.joinWith ?? ", ");
  }

  if (column.transform === "date_iso") {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return column.fallback ?? "";
    }
    return parsed.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
