import type { AttributeInput } from "@extractify/shared/attribute-model";
import type {
  EncryptedSecret,
  SheetsColumnMapping,
  SheetsModelMapping,
  SheetsTransform,
} from "@extractify/shared/integrations";
import {
  EncryptedSecretSchema,
  SheetsColumnMappingSchema,
  SheetsConfigSchema,
  SheetsModelMappingSchema,
  SheetsOAuthSchema,
  SheetsTransformSchema,
  WebhookConfigSchema,
} from "@extractify/shared/integrations";

export {
  EncryptedSecretSchema,
  SheetsColumnMappingSchema,
  SheetsConfigSchema,
  SheetsModelMappingSchema,
  SheetsOAuthSchema,
  SheetsTransformSchema,
  WebhookConfigSchema,
};

export type { EncryptedSecret, SheetsColumnMapping, SheetsModelMapping };
export type SheetsWriteMode = "append";
export type SheetsColumnPolicy = "auto_add";
export type IntegrationTargetType = "webhook" | "sheets" | "postgres";
export type WebhookMethod = "POST" | "PUT" | "PATCH";

export type WebhookConfig = {
  url: string;
  method: WebhookMethod;
  headers: Record<string, string>;
  timeoutMs: number;
  secret?: EncryptedSecret | null;
};

export type SheetsOAuthSummary = {
  connected: boolean;
  accountEmail?: string;
  scopes: string[];
  hasRefreshToken: boolean;
};

export type SheetsConfig = {
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  writeMode: SheetsWriteMode;
  columnPolicy: SheetsColumnPolicy;
  modelMappings: SheetsModelMapping[];
  oauth: SheetsOAuthSummary | null;
};

export type PublicWebhookConfig = Omit<WebhookConfig, "secret">;

type BaseIntegrationTarget = {
  id: string;
  name: string;
  enabled: boolean;
};

export type WebhookIntegrationTarget = BaseIntegrationTarget & {
  type: "webhook";
  config: Partial<PublicWebhookConfig>;
  hasSecret: boolean;
};

export type SheetsIntegrationTarget = BaseIntegrationTarget & {
  type: "sheets";
  config: Partial<SheetsConfig>;
  hasSecret: false;
};

export type PostgresIntegrationTarget = BaseIntegrationTarget & {
  type: "postgres";
  config: Record<string, never>;
  hasSecret: false;
};

export type IntegrationTargetConfig =
  | WebhookIntegrationTarget["config"]
  | SheetsIntegrationTarget["config"]
  | PostgresIntegrationTarget["config"];

export type IntegrationTarget =
  | WebhookIntegrationTarget
  | SheetsIntegrationTarget
  | PostgresIntegrationTarget;

export type PendingSheetsOAuthSession = {
  accountEmail?: string;
  scopes: string[];
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
  errorMessage?: string | null;
};

export type IntegrationDeliverySummary = {
  targetId: string;
  name: string;
  type: IntegrationTargetType;
  status: IntegrationDeliveryStatus;
  responseStatus?: number | null;
  errorMessage?: string | null;
};

export type SheetsMappingModelVersionOption = {
  id: string;
  versionNumber: number;
  attributes: AttributeInput[];
};

export type SheetsMappingModelOption = {
  id: string;
  name: string;
  versions: SheetsMappingModelVersionOption[];
};

export type CreateSheetsIntegrationInput = {
  name: string;
  spreadsheetInput: string;
  sheetName: string;
  modelMappings: SheetsModelMapping[];
  enabled?: boolean;
};

export type UpdateSheetsIntegrationInput = {
  targetId: string;
  name?: string;
  spreadsheetInput?: string;
  sheetName?: string;
  enabled?: boolean;
  modelMappings?: SheetsModelMapping[];
  usePendingOAuth?: boolean;
};

export type TestSheetsIntegrationInput = {
  spreadsheetInput: string;
  sheetName: string;
  modelMappings: SheetsModelMapping[];
  targetId?: string;
  usePendingOAuth?: boolean;
};

export type SheetsMappingColumnInput = {
  clientId?: string;
  columnName: string;
  sourcePath: string;
  transform: SheetsTransform;
  joinWith?: string;
  fallback?: string;
};

export type SheetsMappingInput = {
  clientId?: string;
  modelId: string;
  modelVersionId: string;
  columns: SheetsMappingColumnInput[];
};
