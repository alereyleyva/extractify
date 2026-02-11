export const queryKeys = {
  currentUser: ["current-user"] as const,
  models: ["models"] as const,
  model: (modelId: string) => ["models", modelId] as const,
  activeModelVersion: (modelId: string) =>
    ["models", modelId, "active-version"] as const,
  history: ["history"] as const,
  extraction: (extractionId: string) => ["history", extractionId] as const,
  integrations: ["integrations"] as const,
  integration: (integrationId: string) =>
    ["integrations", integrationId] as const,
  pendingSheetsOAuth: ["integrations", "sheets", "pending-oauth"] as const,
};
