import {
  createIntegrationTarget,
  deleteIntegrationTargetForOwner,
  getIntegrationTargetForOwner,
  listIntegrationTargetsForOwner,
  updateIntegrationTargetForOwner,
} from "@extractify/db/integrations";
import { env } from "@extractify/env/server";
import {
  getSheetHeader,
  resolveSheetsAccessToken as resolveSheetsAccessTokenShared,
  writeSheetHeader,
} from "@extractify/google-sheets";
import type {
  SheetsModelMapping,
  SheetsOAuth,
} from "@extractify/shared/integrations";
import {
  SheetsConfigSchema,
  SheetsModelMappingSchema,
  WebhookConfigSchema,
} from "@extractify/shared/integrations";
import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { parseSpreadsheetId } from "@/lib/integrations/sheets-url";
import type {
  IntegrationTarget,
  PendingSheetsOAuthSession,
  PublicWebhookConfig,
  SheetsConfig as SheetsConfigSummary,
  SheetsOAuthSummary,
} from "@/lib/integrations/types";
import {
  parsePendingSheetsOAuthSession,
  SHEETS_PENDING_OAUTH_COOKIE,
} from "@/lib/server/google-sheets-oauth";
import { decryptSecret, encryptSecret } from "@/lib/server/integration-secrets";
import { requireUserId } from "@/lib/server/require-user-id";

const CreateWebhookIntegrationSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  method: z.enum(["POST", "PUT", "PATCH"]).default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  secret: z.string().optional(),
  enabled: z.boolean().optional(),
});

const CreateSheetsIntegrationSchema = z.object({
  name: z.string().min(1),
  spreadsheetInput: z.string().min(1),
  sheetName: z.string().min(1),
  modelMappings: z.array(SheetsModelMappingSchema).min(1),
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

const UpdateSheetsIntegrationSchema = z
  .object({
    targetId: z.string().min(1),
    name: z.string().min(1).optional(),
    enabled: z.boolean().optional(),
    spreadsheetInput: z.string().min(1).optional(),
    sheetName: z.string().min(1).optional(),
    modelMappings: z.array(SheetsModelMappingSchema).min(1).optional(),
    usePendingOAuth: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.enabled !== undefined ||
      data.spreadsheetInput !== undefined ||
      data.sheetName !== undefined ||
      data.modelMappings !== undefined ||
      data.usePendingOAuth !== undefined,
    { message: "No updates provided." },
  );

const TestSheetsIntegrationSchema = z.object({
  spreadsheetInput: z.string().min(1),
  sheetName: z.string().min(1),
  modelMappings: z.array(SheetsModelMappingSchema).min(1),
  targetId: z.string().min(1).optional(),
  usePendingOAuth: z.boolean().optional(),
});

const DisconnectSheetsOAuthSchema = z.object({
  targetId: z.string().min(1),
});

const DeleteIntegrationSchema = z.object({
  targetId: z.string().min(1),
});

type IntegrationTargetResponse = IntegrationTarget;

const EMPTY_WEBHOOK_CONFIG: Partial<PublicWebhookConfig> = {};
const EMPTY_SHEETS_CONFIG: Partial<SheetsConfigSummary> = {};
const EMPTY_POSTGRES_CONFIG: Record<string, never> = {};

function toSheetsOAuthSummary(
  oauth: SheetsOAuth | null | undefined,
): SheetsOAuthSummary | null {
  if (!oauth) {
    return null;
  }

  return {
    connected: true,
    accountEmail: oauth.accountEmail,
    scopes: oauth.scopes,
    hasRefreshToken: Boolean(oauth.refreshToken),
  };
}

function mapSheetsConfig(
  targetConfig: Record<string, unknown>,
): SheetsConfigSummary | null {
  const parsed = SheetsConfigSchema.safeParse(targetConfig);
  if (!parsed.success) {
    return null;
  }

  return {
    spreadsheetId: parsed.data.spreadsheetId,
    sheetName: parsed.data.sheetName,
    headerRow: parsed.data.headerRow,
    writeMode: parsed.data.writeMode,
    columnPolicy: parsed.data.columnPolicy,
    modelMappings: parsed.data.modelMappings,
    oauth: toSheetsOAuthSummary(parsed.data.oauth),
  };
}

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
        config: EMPTY_WEBHOOK_CONFIG,
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

  if (target.type === "sheets") {
    const safeConfig = mapSheetsConfig(target.config);
    return {
      id: target.id,
      name: target.name,
      type: target.type,
      enabled: target.enabled,
      config: safeConfig ?? EMPTY_SHEETS_CONFIG,
      hasSecret: false,
    };
  }

  return {
    id: target.id,
    name: target.name,
    type: target.type,
    enabled: target.enabled,
    config: EMPTY_POSTGRES_CONFIG,
    hasSecret: false,
  };
}

function getPendingSheetsSessionForOwner(
  ownerId: string,
): PendingSheetsOAuthSession | null {
  const session = getPendingSheetsOAuthCookie(ownerId);
  if (!session) {
    return null;
  }

  return {
    accountEmail: session.accountEmail,
    scopes: session.scopes,
  };
}

function getPendingSheetsOAuthCookie(ownerId: string) {
  const raw = getCookie(SHEETS_PENDING_OAUTH_COOKIE);
  if (!raw) {
    return null;
  }

  const parsed = parsePendingSheetsOAuthSession(raw);
  if (!parsed || parsed.userId !== ownerId) {
    return null;
  }

  return parsed;
}

function getPendingSheetsOauthForOwner(ownerId: string): SheetsOAuth | null {
  const session = getPendingSheetsOAuthCookie(ownerId);
  if (!session) {
    return null;
  }

  return {
    provider: "google",
    accountEmail: session.accountEmail,
    scopes: session.scopes,
    refreshToken: session.refreshToken,
    accessToken: session.accessToken ?? null,
    accessTokenExpiresAt: session.accessTokenExpiresAt ?? null,
  };
}

function collectRequiredHeaders(modelMappings: SheetsModelMapping[]): string[] {
  const headers = new Set<string>();
  for (const mapping of modelMappings) {
    for (const column of mapping.columns) {
      headers.add(column.columnName);
    }
  }
  return Array.from(headers);
}

async function resolveSheetsAccessToken(
  oauth: SheetsOAuth,
): Promise<{ accessToken: string; oauth: SheetsOAuth }> {
  return resolveSheetsAccessTokenShared({
    oauth,
    decryptSecret,
    encryptSecret,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });
}

async function ensureSheetsHeaders(input: {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  modelMappings: SheetsModelMapping[];
}): Promise<{ addedHeaders: string[]; headers: string[] }> {
  const currentHeaders = await getSheetHeader({
    accessToken: input.accessToken,
    spreadsheetId: input.spreadsheetId,
    sheetName: input.sheetName,
    headerRow: input.headerRow,
  });
  const requiredHeaders = collectRequiredHeaders(input.modelMappings);
  const mergedHeaders = [...currentHeaders];
  const addedHeaders: string[] = [];

  for (const header of requiredHeaders) {
    if (mergedHeaders.includes(header)) {
      continue;
    }
    mergedHeaders.push(header);
    addedHeaders.push(header);
  }

  if (
    mergedHeaders.length > 0 &&
    (addedHeaders.length > 0 || currentHeaders.length === 0)
  ) {
    await writeSheetHeader({
      accessToken: input.accessToken,
      spreadsheetId: input.spreadsheetId,
      sheetName: input.sheetName,
      headerRow: input.headerRow,
      headers: mergedHeaders,
    });
  }

  return {
    addedHeaders,
    headers: mergedHeaders,
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

export const startSheetsOAuth = createServerFn({ method: "POST" }).handler(
  async () => {
    await requireUserId();
    const connectPath = "/api/integrations/google-sheets/connect";
    return { url: connectPath };
  },
);

export const getPendingSheetsOAuthSession = createServerFn({
  method: "GET",
}).handler(async (): Promise<PendingSheetsOAuthSession | null> => {
  const ownerId = await requireUserId();
  return getPendingSheetsSessionForOwner(ownerId);
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

export const createSheetsIntegration = createServerFn({ method: "POST" })
  .inputValidator(CreateSheetsIntegrationSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const pendingOauth = getPendingSheetsOauthForOwner(ownerId);

    if (!pendingOauth) {
      throw new Error(
        "Connect a Google account before creating this integration",
      );
    }

    const spreadsheetId = parseSpreadsheetId(data.spreadsheetInput);
    const config = SheetsConfigSchema.parse({
      spreadsheetId,
      sheetName: data.sheetName.trim(),
      headerRow: 1,
      writeMode: "append",
      columnPolicy: "auto_add",
      oauth: pendingOauth,
      modelMappings: data.modelMappings,
    });

    if (!config.oauth) {
      throw new Error("Google Sheets OAuth is required");
    }

    const { accessToken, oauth } = await resolveSheetsAccessToken(config.oauth);
    const headerResult = await ensureSheetsHeaders({
      accessToken,
      spreadsheetId: config.spreadsheetId,
      sheetName: config.sheetName,
      headerRow: config.headerRow,
      modelMappings: config.modelMappings,
    });

    const created = await createIntegrationTarget({
      ownerId,
      type: "sheets",
      name: data.name.trim(),
      enabled: data.enabled ?? true,
      config: {
        ...config,
        oauth,
      },
    });

    if (!created) {
      throw new Error("Unable to create integration");
    }

    deleteCookie(SHEETS_PENDING_OAUTH_COOKIE, { path: "/" });

    return {
      id: created.id,
      addedHeaders: headerResult.addedHeaders,
    };
  });

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

export const updateSheetsIntegration = createServerFn({ method: "POST" })
  .inputValidator(UpdateSheetsIntegrationSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const target = await getIntegrationTargetForOwner(ownerId, data.targetId);

    if (!target) {
      throw new Error("Integration not found");
    }

    if (target.type !== "sheets") {
      throw new Error("Only Google Sheets integrations can be updated");
    }

    const currentConfig = SheetsConfigSchema.safeParse(target.config);
    if (!currentConfig.success) {
      throw new Error("Google Sheets integration config is invalid");
    }

    const pendingOauth = data.usePendingOAuth
      ? getPendingSheetsOauthForOwner(ownerId)
      : null;
    if (data.usePendingOAuth && !pendingOauth) {
      throw new Error("No pending Google OAuth session was found");
    }

    const nextEnabled = data.enabled ?? target.enabled;
    const isEnabling = !target.enabled && nextEnabled;

    const spreadsheetId = data.spreadsheetInput
      ? parseSpreadsheetId(data.spreadsheetInput)
      : currentConfig.data.spreadsheetId;
    const sheetName = data.sheetName?.trim() || currentConfig.data.sheetName;
    const modelMappings =
      data.modelMappings ?? currentConfig.data.modelMappings;

    let oauth = pendingOauth ?? currentConfig.data.oauth ?? null;
    if (isEnabling && !oauth?.refreshToken) {
      throw new Error("Connect a Google account before enabling integration");
    }

    const shouldValidateWithGoogle =
      Boolean(oauth) &&
      (isEnabling ||
        pendingOauth !== null ||
        data.spreadsheetInput !== undefined ||
        data.sheetName !== undefined ||
        data.modelMappings !== undefined);

    let addedHeaders: string[] = [];
    if (shouldValidateWithGoogle && oauth) {
      const token = await resolveSheetsAccessToken(oauth);
      oauth = token.oauth;
      const headerResult = await ensureSheetsHeaders({
        accessToken: token.accessToken,
        spreadsheetId,
        sheetName,
        headerRow: currentConfig.data.headerRow,
        modelMappings,
      });
      addedHeaders = headerResult.addedHeaders;
    }

    const nextConfig = SheetsConfigSchema.parse({
      spreadsheetId,
      sheetName,
      headerRow: currentConfig.data.headerRow,
      writeMode: currentConfig.data.writeMode,
      columnPolicy: currentConfig.data.columnPolicy,
      oauth,
      modelMappings,
    });

    const updated = await updateIntegrationTargetForOwner({
      ownerId,
      targetId: data.targetId,
      name: data.name,
      enabled: nextEnabled,
      config: nextConfig,
    });

    if (!updated) {
      throw new Error("Integration not found");
    }

    if (pendingOauth) {
      deleteCookie(SHEETS_PENDING_OAUTH_COOKIE, { path: "/" });
    }

    return {
      success: true,
      addedHeaders,
    };
  });

export const testSheetsIntegration = createServerFn({ method: "POST" })
  .inputValidator(TestSheetsIntegrationSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const spreadsheetId = parseSpreadsheetId(data.spreadsheetInput);
    const pendingOauth = getPendingSheetsOauthForOwner(ownerId);
    let existingOauth: SheetsOAuth | null = null;

    if (data.targetId) {
      const target = await getIntegrationTargetForOwner(ownerId, data.targetId);
      if (!target) {
        throw new Error("Integration not found");
      }
      if (target.type !== "sheets") {
        throw new Error("Integration is not a Google Sheets target");
      }
      const parsed = SheetsConfigSchema.safeParse(target.config);
      if (parsed.success) {
        existingOauth = parsed.data.oauth ?? null;
      }
    }

    let oauth: SheetsOAuth | null = null;
    if (data.targetId) {
      oauth = data.usePendingOAuth ? pendingOauth : existingOauth;
    } else {
      oauth = pendingOauth;
    }

    if (!oauth) {
      throw new Error(
        data.targetId && data.usePendingOAuth
          ? "Reconnect Google before running the test"
          : "Connect a Google account before running the test",
      );
    }

    const modelMappings = SheetsConfigSchema.shape.modelMappings.parse(
      data.modelMappings,
    );

    const { accessToken } = await resolveSheetsAccessToken(oauth);
    const headerResult = await ensureSheetsHeaders({
      accessToken,
      spreadsheetId,
      sheetName: data.sheetName.trim(),
      headerRow: 1,
      modelMappings,
    });

    return {
      ok: true,
      message:
        headerResult.addedHeaders.length > 0
          ? `Connected. Added ${headerResult.addedHeaders.length} missing column(s).`
          : "Connected. Sheet is ready.",
      addedHeaders: headerResult.addedHeaders,
      accountEmail: oauth.accountEmail ?? null,
    };
  });

export const disconnectSheetsOAuth = createServerFn({ method: "POST" })
  .inputValidator(DisconnectSheetsOAuthSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const target = await getIntegrationTargetForOwner(ownerId, data.targetId);
    if (!target) {
      throw new Error("Integration not found");
    }
    if (target.type !== "sheets") {
      throw new Error("Integration is not a Google Sheets target");
    }

    const currentConfig = SheetsConfigSchema.safeParse(target.config);
    if (!currentConfig.success) {
      throw new Error("Google Sheets integration config is invalid");
    }

    const updated = await updateIntegrationTargetForOwner({
      ownerId,
      targetId: data.targetId,
      enabled: false,
      config: {
        ...currentConfig.data,
        oauth: null,
      },
    });

    if (!updated) {
      throw new Error("Integration not found");
    }

    deleteCookie(SHEETS_PENDING_OAUTH_COOKIE, { path: "/" });

    return { success: true };
  });

export const updateIntegrationTarget = createServerFn({ method: "POST" })
  .inputValidator(UpdateIntegrationSchema)
  .handler(
    async ({ data }: { data: z.infer<typeof UpdateIntegrationSchema> }) => {
      const ownerId = await requireUserId();
      const current = await getIntegrationTargetForOwner(
        ownerId,
        data.targetId,
      );
      if (!current) {
        throw new Error("Integration not found");
      }

      if (current.type === "sheets" && data.enabled === true) {
        const parsed = SheetsConfigSchema.safeParse(current.config);
        if (!parsed.success) {
          throw new Error("Google Sheets integration config is invalid");
        }
        if (!parsed.data.oauth?.refreshToken) {
          throw new Error(
            "Google account is not connected for this integration",
          );
        }
      }

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
