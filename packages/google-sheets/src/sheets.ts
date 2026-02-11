import { OAuth2Client } from "google-auth-library";
import {
  GoogleSpreadsheet,
  type GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";

export class GoogleSheetsApiError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "GoogleSheetsApiError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    let message = "Google Sheets API request failed";
    let status: number | null = null;

    if (isRecord(error)) {
      if (typeof error.message === "string") {
        message = error.message;
      }

      if (typeof error.status === "number") {
        status = error.status;
      } else if (
        isRecord(error.response) &&
        typeof error.response.status === "number"
      ) {
        status = error.response.status;
      }
    }

    throw new GoogleSheetsApiError(message, status);
  }
}

async function createSpreadsheetClient(input: {
  spreadsheetId: string;
  accessToken: string;
}): Promise<GoogleSpreadsheet> {
  return withErrorHandling(async () => {
    const authClient = new OAuth2Client();
    authClient.setCredentials({
      access_token: input.accessToken,
    });

    const doc = new GoogleSpreadsheet(input.spreadsheetId, authClient);
    await doc.loadInfo();
    return doc;
  });
}

async function getWorksheet(input: {
  spreadsheetId: string;
  accessToken: string;
  sheetName: string;
}): Promise<GoogleSpreadsheetWorksheet> {
  const doc = await createSpreadsheetClient(input);
  const sheet = doc.sheetsByTitle[input.sheetName];

  if (!sheet) {
    throw new GoogleSheetsApiError(
      `Sheet tab "${input.sheetName}" was not found`,
      404,
    );
  }

  return sheet;
}

export async function getSheetHeader(input: {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
}): Promise<string[]> {
  return withErrorHandling(async () => {
    const sheet = await getWorksheet(input);
    await sheet.loadHeaderRow(input.headerRow);
    return sheet.headerValues;
  });
}

export async function writeSheetHeader(input: {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  headers: string[];
}): Promise<void> {
  return withErrorHandling(async () => {
    const sheet = await getWorksheet(input);
    await sheet.setHeaderRow(input.headers, input.headerRow);
  });
}

export async function appendSheetRow(input: {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
  values: string[];
  headers: string[];
}): Promise<number> {
  return withErrorHandling(async () => {
    const sheet = await getWorksheet(input);

    const row = Object.fromEntries(
      input.headers.map((header, index) => [header, input.values[index] ?? ""]),
    );

    await sheet.addRow(row);
    return 200;
  });
}
