import { setTimeout as delay } from "node:timers/promises";
import { updateIntegrationTargetForOwner } from "@extractify/db/integrations";
import { env } from "@extractify/env/worker";
import {
  appendSheetRow,
  GoogleSheetsApiError,
  getSheetHeader,
  resolveSheetsAccessToken,
  writeSheetHeader,
} from "@extractify/google-sheets";
import {
  applySheetsTransform,
  getValueByPath,
  normalizeExtractionResult,
  type SheetsColumnMapping,
  SheetsConfigSchema,
  type SheetsModelMapping,
} from "@extractify/shared/integrations";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./secrets";

type DeliveryTarget = {
  id: string;
  ownerId: string;
  type: "sheets";
  name: string;
  config: Record<string, unknown>;
};

type CompletedExtraction = {
  id: string;
  ownerId: string;
  modelId: string;
  modelVersionId: string;
  result: Record<string, unknown> | null;
};

type DeliveryAttempt = {
  ok: boolean;
  status: number | null;
  errorMessage?: string;
};

function isRetryableStatus(status: number | null): boolean {
  return status === 429 || (status !== null && status >= 500);
}

function findVersionMapping(input: {
  modelId: string;
  modelVersionId: string;
  modelMappings: SheetsModelMapping[];
}) {
  return input.modelMappings.find(
    (mapping: SheetsModelMapping) =>
      mapping.modelId === input.modelId &&
      mapping.modelVersionId === input.modelVersionId,
  );
}

function buildRow(input: {
  headers: string[];
  normalizedResult: Record<string, unknown>;
  columns: SheetsColumnMapping[];
}): string[] {
  return input.headers.map((header) => {
    const column = input.columns.find((item) => item.columnName === header);
    if (!column) {
      return "";
    }
    const value = getValueByPath(input.normalizedResult, column.sourcePath);
    return applySheetsTransform(value, column);
  });
}

export async function deliverSheetsTarget(input: {
  target: DeliveryTarget;
  extraction: CompletedExtraction;
}): Promise<DeliveryAttempt> {
  const parsed = SheetsConfigSchema.safeParse(input.target.config);
  if (!parsed.success) {
    return {
      ok: false,
      status: null,
      errorMessage: "Invalid Google Sheets configuration",
    };
  }

  if (!parsed.data.oauth) {
    return {
      ok: false,
      status: null,
      errorMessage: "Google account is not connected",
    };
  }

  const versionMapping = findVersionMapping({
    modelId: input.extraction.modelId,
    modelVersionId: input.extraction.modelVersionId,
    modelMappings: parsed.data.modelMappings,
  });

  if (!versionMapping) {
    return {
      ok: false,
      status: null,
      errorMessage: "No Sheets mapping configured for this model version",
    };
  }

  const requiredHeaders = versionMapping.columns.map(
    (column) => column.columnName,
  );
  let oauth = parsed.data.oauth;
  let oauthChanged = false;
  let accessToken: string;

  try {
    const access = await resolveSheetsAccessToken({
      oauth,
      decryptSecret: decryptIntegrationSecret,
      encryptSecret: encryptIntegrationSecret,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    });
    oauth = access.oauth;
    accessToken = access.accessToken;
    oauthChanged = access.oauth !== parsed.data.oauth;
  } catch (error) {
    return {
      ok: false,
      status: null,
      errorMessage:
        error instanceof Error ? error.message : "OAuth refresh failed",
    };
  }

  let result: DeliveryAttempt;

  try {
    let lastStatus: number | null = null;
    let lastMessage: string | null = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const headers = await getSheetHeader({
          spreadsheetId: parsed.data.spreadsheetId,
          sheetName: parsed.data.sheetName,
          headerRow: parsed.data.headerRow,
          accessToken,
        });

        const mergedHeaders = [...headers];
        for (const requiredHeader of requiredHeaders) {
          if (!mergedHeaders.includes(requiredHeader)) {
            mergedHeaders.push(requiredHeader);
          }
        }

        if (
          mergedHeaders.length > 0 &&
          (headers.length === 0 || mergedHeaders.length !== headers.length)
        ) {
          await writeSheetHeader({
            spreadsheetId: parsed.data.spreadsheetId,
            sheetName: parsed.data.sheetName,
            headerRow: parsed.data.headerRow,
            headers: mergedHeaders,
            accessToken,
          });
        }

        const row = buildRow({
          headers: mergedHeaders,
          normalizedResult: normalizeExtractionResult(input.extraction.result),
          columns: versionMapping.columns,
        });

        const status = await appendSheetRow({
          spreadsheetId: parsed.data.spreadsheetId,
          sheetName: parsed.data.sheetName,
          headers: mergedHeaders,
          values: row,
          accessToken,
        });
        lastStatus = status;
        lastMessage = null;
        break;
      } catch (error) {
        if (error instanceof GoogleSheetsApiError) {
          lastStatus = error.status;
          lastMessage = error.message;

          if (error.status === 401 && attempt < 3) {
            const refreshed = await resolveSheetsAccessToken({
              oauth,
              decryptSecret: decryptIntegrationSecret,
              encryptSecret: encryptIntegrationSecret,
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              forceRefresh: true,
            });
            oauth = refreshed.oauth;
            accessToken = refreshed.accessToken;
            oauthChanged = true;
            await delay(250 + Math.floor(Math.random() * 120));
            continue;
          }

          if (isRetryableStatus(error.status) && attempt < 3) {
            const backoffMs =
              250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 150);
            await delay(backoffMs);
            continue;
          }

          throw error;
        }

        throw error;
      }
    }

    if (lastStatus === null && lastMessage) {
      throw new GoogleSheetsApiError(lastMessage, lastStatus);
    }
    if (lastStatus === null) {
      throw new Error("Sheets append did not complete");
    }

    result = {
      ok: true,
      status: lastStatus,
    };
  } catch (error) {
    if (error instanceof GoogleSheetsApiError) {
      result = {
        ok: false,
        status: error.status,
        errorMessage: error.message,
      };
    } else {
      result = {
        ok: false,
        status: null,
        errorMessage:
          error instanceof Error ? error.message : "Sheets delivery failed",
      };
    }
  }

  if (oauthChanged) {
    try {
      await updateIntegrationTargetForOwner({
        ownerId: input.target.ownerId,
        targetId: input.target.id,
        config: {
          ...parsed.data,
          oauth,
        },
      });
    } catch (error) {
      console.warn(
        `[worker] Failed to persist refreshed Google Sheets OAuth token for target ${input.target.id}`,
        error,
      );
    }
  }

  return result;
}
